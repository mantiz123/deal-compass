const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'https://esm.sh/pdf-lib@1.17.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const BLACK = rgb(0, 0, 0)
const GRAY = rgb(0.4, 0.4, 0.4)
const WHITE = rgb(1, 1, 1)
const TEAL = rgb(0, 212/255, 170/255)
const DARK_BG = rgb(10/255, 10/255, 20/255)

const PAGE_W = 612
const PAGE_H = 792
const MARGIN_L = 50
const MARGIN_R = 50
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R
const LINE_HEIGHT = 14
const PARA_SPACING = 8

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { contractId } = await req.json()
    if (!contractId) {
      return new Response(JSON.stringify({ error: 'Missing contractId' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Fetch contract
    const { data: contract, error: cErr } = await supabase
      .from('contracts')
      .select('*, lead:leads(id, property:properties(address, city, state, county, owner_name))')
      .eq('id', contractId)
      .single()

    if (cErr || !contract) {
      return new Response(JSON.stringify({ error: 'Contract not found' }), { status: 404, headers: corsHeaders })
    }

    // Fetch signatures ordered by user_agent (contains page number)
    const { data: signatures = [] } = await supabase
      .from('contract_signatures')
      .select('*')
      .eq('contract_id', contractId)
      .order('signed_at', { ascending: true })

    // Parse page numbers from user_agent "... | Page X" — separate Klose vs Seller
    const sellerSigByPage: Record<number, { image: string; name: string; date: string }> = {}
    const kloseSigByPage: Record<number, { image: string; name: string; date: string }> = {}
    for (const sig of signatures) {
      const match = sig.user_agent?.match(/Page\s+(\d+)/)
      if (match && sig.signature_image) {
        const pageNum = parseInt(match[1])
        const entry = {
          image: sig.signature_image,
          name: sig.signer_name,
          date: new Date(sig.signed_at).toLocaleDateString('en-US'),
        }
        if (sig.user_agent?.includes('Klose Rep')) {
          kloseSigByPage[pageNum] = entry
        } else {
          sellerSigByPage[pageNum] = entry
        }
      }
    }

    const d = (contract.contract_data as Record<string, any>) || {}
    const contractType = contract.contract_type as string

    // Build PDF
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
    const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)

    const ctx: PdfCtx = { pdfDoc, font, fontBold, fontItalic, data: d, sigByPage: sellerSigByPage, kloseSigByPage }

    if (contractType === 'AB') {
      await buildABPdf(ctx)
    } else if (contractType === 'BC') {
      await buildBCPdf(ctx)
    } else {
      await buildAmendmentPdf(ctx)
    }

    const pdfBytes = await pdfDoc.save()
    const property = (contract as any).lead?.property
    const addr = property?.address || d.property_address || 'property'
    const fileName = `${contractType}_Signed_${addr.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    const filePath = `${contractId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(filePath)

    // Update contract with signed PDF URL
    await supabase.from('contracts').update({ signed_pdf_url: urlData.publicUrl }).eq('id', contractId)

    return new Response(JSON.stringify({ signedPdfUrl: urlData.publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Signed PDF generation error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ─── Types & Helpers ────────────────────────────────────────────────

interface PdfCtx {
  pdfDoc: PDFDocument
  font: PDFFont
  fontBold: PDFFont
  fontItalic: PDFFont
  data: Record<string, any>
  sigByPage: Record<number, { image: string; name: string; date: string }>
}

interface Cursor {
  page: PDFPage
  y: number
  pageNum: number
}

function addPage(ctx: PdfCtx, pageNum?: number): Cursor {
  const page = ctx.pdfDoc.addPage([PAGE_W, PAGE_H])
  const pn = pageNum ?? (ctx.pdfDoc.getPageCount())
  return { page, y: PAGE_H - 50, pageNum: pn }
}

function ensureSpace(ctx: PdfCtx, cursor: Cursor, needed: number): Cursor {
  if (cursor.y - needed < 60) {
    return addPage(ctx, cursor.pageNum)
  }
  return cursor
}

function drawHeader(ctx: PdfCtx, cursor: Cursor, showEIN = true): Cursor {
  const { page } = cursor
  page.drawRectangle({ x: 0, y: PAGE_H - 70, width: PAGE_W, height: 70, color: DARK_BG })
  page.drawRectangle({ x: 0, y: PAGE_H - 73, width: PAGE_W, height: 3, color: TEAL })
  const titleW = ctx.fontBold.widthOfTextAtSize('KLOSE LLC', 22)
  page.drawText('KLOSE LLC', { x: (PAGE_W - titleW) / 2, y: PAGE_H - 35, size: 22, font: ctx.fontBold, color: WHITE })
  const sub = 'A Wyoming Limited Liability Company | Real Estate Investment'
  const subW = ctx.font.widthOfTextAtSize(sub, 9)
  page.drawText(sub, { x: (PAGE_W - subW) / 2, y: PAGE_H - 50, size: 9, font: ctx.font, color: rgb(0.67, 0.67, 0.67) })
  if (showEIN) {
    const ein = 'EIN: 41-4409334'
    const einW = ctx.font.widthOfTextAtSize(ein, 8)
    page.drawText(ein, { x: (PAGE_W - einW) / 2, y: PAGE_H - 62, size: 8, font: ctx.font, color: rgb(0.53, 0.53, 0.53) })
  }
  return { ...cursor, y: PAGE_H - 90 }
}

function drawCenteredText(ctx: PdfCtx, cursor: Cursor, text: string, size: number, f?: PDFFont): Cursor {
  cursor = ensureSpace(ctx, cursor, size + 6)
  const useFont = f || ctx.fontBold
  const w = useFont.widthOfTextAtSize(text, size)
  cursor.page.drawText(text, { x: (PAGE_W - w) / 2, y: cursor.y, size, font: useFont, color: BLACK })
  return { ...cursor, y: cursor.y - size - 6 }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (current) lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawParagraph(ctx: PdfCtx, cursor: Cursor, text: string, size = 10, indent = 0): Cursor {
  const lines = wrapText(text, ctx.font, size, CONTENT_W - indent)
  for (const line of lines) {
    cursor = ensureSpace(ctx, cursor, LINE_HEIGHT)
    cursor.page.drawText(line, { x: MARGIN_L + indent, y: cursor.y, size, font: ctx.font, color: BLACK })
    cursor.y -= LINE_HEIGHT
  }
  cursor.y -= PARA_SPACING
  return cursor
}

function drawClause(ctx: PdfCtx, cursor: Cursor, num: string, title: string, body: string, size = 10): Cursor {
  const prefix = `${num}. ${title}: `
  const fullText = prefix + body
  const lines = wrapText(fullText, ctx.font, size, CONTENT_W)
  for (let i = 0; i < lines.length; i++) {
    cursor = ensureSpace(ctx, cursor, LINE_HEIGHT)
    const line = lines[i]
    if (i === 0) {
      const prefixW = ctx.fontBold.widthOfTextAtSize(prefix, size)
      if (prefixW < CONTENT_W) {
        cursor.page.drawText(prefix, { x: MARGIN_L, y: cursor.y, size, font: ctx.fontBold, color: BLACK })
        const rest = line.substring(prefix.length)
        if (rest) cursor.page.drawText(rest, { x: MARGIN_L + prefixW, y: cursor.y, size, font: ctx.font, color: BLACK })
      } else {
        cursor.page.drawText(line, { x: MARGIN_L, y: cursor.y, size, font: ctx.fontBold, color: BLACK })
      }
    } else {
      cursor.page.drawText(line, { x: MARGIN_L, y: cursor.y, size, font: ctx.font, color: BLACK })
    }
    cursor.y -= LINE_HEIGHT
  }
  cursor.y -= PARA_SPACING
  return cursor
}

function v(data: Record<string, any>, key: string, fallback = '______________________________'): string {
  return data[key] || fallback
}

function money(val: any): string {
  return Number(val || 0).toLocaleString('en-US')
}

// ─── Embed signature image on current page ──────────────────────────

async function embedSignature(ctx: PdfCtx, cursor: Cursor, pageNum: number, label: string): Promise<Cursor> {
  const sig = ctx.sigByPage[pageNum]
  cursor = ensureSpace(ctx, cursor, 80)
  
  if (sig?.image) {
    try {
      // Signature is a data URL (image/png base64)
      const base64 = sig.image.split(',')[1]
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const sigImage = await ctx.pdfDoc.embedPng(bytes)
      
      const sigW = 180
      const sigH = (sigImage.height / sigImage.width) * sigW
      
      // Draw signature image
      cursor.page.drawImage(sigImage, { x: MARGIN_L, y: cursor.y - sigH, width: sigW, height: sigH })
      
      // Line under signature
      cursor.page.drawLine({ start: { x: MARGIN_L, y: cursor.y - sigH - 2 }, end: { x: MARGIN_L + 250, y: cursor.y - sigH - 2 }, thickness: 0.5, color: GRAY })
      cursor.page.drawText(label, { x: MARGIN_L, y: cursor.y - sigH - 14, size: 8, font: ctx.font, color: GRAY })
      cursor.page.drawText(`Signed by: ${sig.name}`, { x: MARGIN_L, y: cursor.y - sigH - 26, size: 8, font: ctx.font, color: BLACK })
      cursor.page.drawText(`Date: ${sig.date}`, { x: MARGIN_L, y: cursor.y - sigH - 38, size: 8, font: ctx.font, color: GRAY })
      
      // "[ELECTRONICALLY SIGNED]" badge
      const badge = '[ELECTRONICALLY SIGNED]'
      const badgeW = ctx.fontBold.widthOfTextAtSize(badge, 8)
      cursor.page.drawText(badge, { x: MARGIN_L + 260, y: cursor.y - sigH/2, size: 8, font: ctx.fontBold, color: rgb(0, 0.5, 0.35) })
      
      cursor.y = cursor.y - sigH - 50
    } catch (e) {
      console.error('Failed to embed signature for page', pageNum, e)
      cursor = drawUnsignedBlock(ctx, cursor, label)
    }
  } else {
    cursor = drawUnsignedBlock(ctx, cursor, label)
  }
  return cursor
}

function drawUnsignedBlock(ctx: PdfCtx, cursor: Cursor, label: string): Cursor {
  cursor.page.drawLine({ start: { x: MARGIN_L, y: cursor.y }, end: { x: MARGIN_L + 250, y: cursor.y }, thickness: 0.5, color: GRAY })
  cursor.page.drawText(label, { x: MARGIN_L, y: cursor.y - 12, size: 8, font: ctx.font, color: GRAY })
  cursor.page.drawText('Date: ____________', { x: MARGIN_L, y: cursor.y - 24, size: 8, font: ctx.font, color: GRAY })
  return { ...cursor, y: cursor.y - 40 }
}

async function embedDualSignature(ctx: PdfCtx, cursor: Cursor, pageNum: number, leftLabel: string, leftName: string, rightLabel: string, rightName: string): Promise<Cursor> {
  cursor = ensureSpace(ctx, cursor, 80)
  const midX = PAGE_W / 2
  const sig = ctx.sigByPage[pageNum]
  
  // Left side - embed signature if available
  if (sig?.image) {
    try {
      const base64 = sig.image.split(',')[1]
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const sigImage = await ctx.pdfDoc.embedPng(bytes)
      const sigW = 140
      const sigH = (sigImage.height / sigImage.width) * sigW
      cursor.page.drawImage(sigImage, { x: MARGIN_L, y: cursor.y - sigH, width: sigW, height: sigH })
      cursor.page.drawLine({ start: { x: MARGIN_L, y: cursor.y - sigH - 2 }, end: { x: midX - 30, y: cursor.y - sigH - 2 }, thickness: 0.5, color: GRAY })
      cursor.page.drawText(leftLabel, { x: MARGIN_L, y: cursor.y - sigH - 14, size: 8, font: ctx.font, color: GRAY })
      cursor.page.drawText(leftName, { x: MARGIN_L, y: cursor.y - sigH - 26, size: 9, font: ctx.fontBold, color: BLACK })
      cursor.page.drawText(`Date: ${sig.date}`, { x: MARGIN_L, y: cursor.y - sigH - 38, size: 8, font: ctx.font, color: GRAY })
    } catch (e) {
      console.error('Failed to embed dual sig', e)
    }
  } else {
    cursor.page.drawLine({ start: { x: MARGIN_L, y: cursor.y }, end: { x: midX - 30, y: cursor.y }, thickness: 0.5, color: GRAY })
    cursor.page.drawText(leftLabel, { x: MARGIN_L, y: cursor.y - 12, size: 8, font: ctx.font, color: GRAY })
    cursor.page.drawText(leftName, { x: MARGIN_L, y: cursor.y - 24, size: 9, font: ctx.fontBold, color: BLACK })
  }
  
  // Right side - Klose LLC (no signature needed)
  cursor.page.drawLine({ start: { x: midX + 10, y: cursor.y }, end: { x: PAGE_W - MARGIN_R, y: cursor.y }, thickness: 0.5, color: GRAY })
  cursor.page.drawText(rightLabel, { x: midX + 10, y: cursor.y - 12, size: 8, font: ctx.font, color: GRAY })
  cursor.page.drawText(rightName, { x: midX + 10, y: cursor.y - 24, size: 9, font: ctx.fontBold, color: BLACK })
  cursor.page.drawText('Date: ____________', { x: midX + 10, y: cursor.y - 36, size: 8, font: ctx.font, color: GRAY })
  
  return { ...cursor, y: cursor.y - 50 }
}

// ─── AB Contract (with signatures) ─────────────────────────────────

async function buildABPdf(ctx: PdfCtx) {
  const d = ctx.data

  let c = addPage(ctx, 1)
  c = drawHeader(ctx, c)
  c.y -= 10
  c = drawCenteredText(ctx, c, 'STANDARD PURCHASE AND SALE AGREEMENT', 14)
  c = drawCenteredText(ctx, c, '"AS IS" CASH-OFFER', 11)
  c.y -= 5

  c = drawClause(ctx, c, '1', 'PARTIES', `Klose LLC, a Wyoming Limited Liability Company (hereinafter "BUYER"), and ${v(d,'seller_name')} (hereinafter "SELLER"), hereby agree that Seller will sell and Buyer will buy the following property.`)
  c = drawClause(ctx, c, '2', 'PROPERTY', `(Street Address): ${v(d,'property_address')} (City): ${v(d,'property_city')} (County): ${v(d,'property_county')} (State): ${v(d,'property_state','___')}. NOT Included: ${v(d,'not_included_items','None')}.`)
  c = drawClause(ctx, c, '3', 'CONTRACT TERMS', `Sale Price: $ ${money(d.sale_price)}`)
  c = drawClause(ctx, c, '4', 'NON-FINANCING / ALL CASH', 'This is an all-cash sale.')
  c = drawClause(ctx, c, '5', 'CLOSING', `Closing within ${v(d,'closing_days','30')} business days via ${v(d,'title_company')}.`)
  c = drawClause(ctx, c, '6', 'TITLE POLICY', "Owner's Policy of Title Insurance at Buyer's expense.")
  c = drawClause(ctx, c, '7', 'PROPERTY CONDITION', `"AS-IS" with ${v(d,'due_diligence_days','10')} day Due Diligence Period.`)
  c = drawClause(ctx, c, '8', 'POSSESSION', 'Delivered at closing.')
  c = drawClause(ctx, c, '9', 'PRE-MARKETING', "Seller furnishes key; Buyer may market the Property.")
  c = drawClause(ctx, c, '10', 'PRORATIONS', 'Prorated through Closing Date.')
  c = drawClause(ctx, c, '11', 'DOCUMENTATION', 'General Warranty Deed.')
  c = drawClause(ctx, c, '12', 'CASUALTY LOSS', 'Seller restores if damaged.')
  c = drawClause(ctx, c, '13', 'DEFAULT', 'Buyer may enforce specific performance or terminate.')
  c = drawClause(ctx, c, '14', 'REPRESENTATIONS', 'No unrecorded liens at Closing.')
  c = drawClause(ctx, c, '15', 'SALES EXPENSES', "Seller pays releases of liens; Buyer pays stipulated expenses.")
  c = drawClause(ctx, c, '16', 'RESALE', 'Buyer retains all profit.')
  c = drawClause(ctx, c, '17', 'ASSIGNMENT', 'Buyer may assign.')
  c = drawClause(ctx, c, '18', 'HOLD HARMLESS', 'Buyer held harmless by Seller.')
  c = drawClause(ctx, c, '19', 'ENTIRE AGREEMENT', 'Contains entire agreement.')
  c = drawClause(ctx, c, '20', 'SPECIAL PROVISIONS', v(d, 'special_provisions', 'None'))
  c.y -= 5
  c = await embedDualSignature(ctx, c, 3, 'Seller Signature', v(d,'seller_name','_________________'), 'Buyer Signature', 'Klose LLC / Authorized Signatory')

  // Page 4-5: Seller Info
  c = addPage(ctx, 4)
  c = drawHeader(ctx, c, false)
  c = drawCenteredText(ctx, c, 'PRELIMINARY SELLER INFORMATION WORKSHEET', 13)
  c.y -= 5
  c = drawParagraph(ctx, c, `Full Legal Name: ${v(d,'seller_name')}`)
  c = drawParagraph(ctx, c, `Date of Birth: ${v(d,'seller_dob')}`)
  c = drawParagraph(ctx, c, `Phone Number: ${v(d,'seller_phone')}`)
  c = drawParagraph(ctx, c, `Email: ${v(d,'seller_email')}`)
  c = drawParagraph(ctx, c, `Marital Status: ${v(d,'marital_status')}`)
  if (d.spouse_name) c = drawParagraph(ctx, c, `Spouse Name: ${d.spouse_name}`)
  c.y -= 20
  c = await embedSignature(ctx, c, 5, 'Seller Signature - Info Worksheet')

  // Page 6: Investor Disclosure
  c = await buildSignedInvestorDisclosure(ctx, 'Seller', 6)

  // Page 7: Fair Housing
  c = await buildSignedFairHousing(ctx, 'Seller', 7)

  // Page 8: Non-Representation
  c = await buildSignedNonRepresentation(ctx, 'Seller', 8)

  // Page 9: Auth to Sign (POA)
  c = await buildSignedAuthToSign(ctx, 9)

  // Page 10: Release of Info
  c = await buildSignedReleaseAuth(ctx, 10)

  // Page 11: Seller Responsibility
  c = await buildSignedSellerResponsibility(ctx, 11)
}

// ─── BC Contract ────────────────────────────────────────────────────

function buildBCPdf(ctx: PdfCtx) {
  return buildBCPdfAsync(ctx)
}

async function buildBCPdfAsync(ctx: PdfCtx) {
  const d = ctx.data
  let c = addPage(ctx, 1)
  c = drawHeader(ctx, c)
  c.y -= 10
  c = drawCenteredText(ctx, c, 'ASSIGNMENT OF "AS IS" CASH-OFFER', 14)
  c = drawCenteredText(ctx, c, 'PURCHASE AND SALE AGREEMENT', 14)
  c.y -= 5

  c = drawClause(ctx, c, '1', 'PARTIES', `The undersigned Klose LLC (the "ASSIGNOR"), having executed a Purchase and Sale Agreement with ${v(d,'seller_name')} (the "SELLER"), hereby assigns all rights to ${v(d,'assignee_name')} (the "ASSIGNEE").`)
  c = drawClause(ctx, c, '2', 'PROPERTY', `${v(d,'property_address')}, ${v(d,'property_city','')}, ${v(d,'property_state','')}.`)
  c = drawClause(ctx, c, '3', 'ASSIGNMENT TERMS', `Assignee shall pay $ ${money(d.total_assignment_amount)}.`)
  c = drawClause(ctx, c, '4', 'METHOD OF PAYMENT', `${v(d,'payment_method')}.`)
  c = drawClause(ctx, c, '5', 'CLOSING COSTS', 'ASSIGNEE pays all closing costs.')
  c = drawClause(ctx, c, '6', 'ASSIGNEE REPRESENTATIONS', 'ASSIGNEE acknowledges receipt of the INITIAL PURCHASE AGREEMENT.')
  c = drawClause(ctx, c, '7', 'ASSIGNOR REPRESENTATIONS', 'ASSIGNOR represents the agreement is in full force.')
  c = drawClause(ctx, c, '8', 'AS-IS', `Property sold as-is. EXCEPT: ${v(d,'exceptions','None')}.`)
  c = drawClause(ctx, c, '9', 'OPTION FEE', `$ ${money(d.option_fee)} to ${v(d,'title_company')}.`)
  c = drawClause(ctx, c, '10', 'CLOSING', `On or before ${v(d,'closing_date')}.`)
  c = drawClause(ctx, c, '11', 'TITLE POLICY', "Owner's Policy of Title Insurance.")
  c = drawClause(ctx, c, '12', 'DEFAULT', "ASSIGNEE's sole remedy is termination.")
  c = drawClause(ctx, c, '13', 'MARKETABLE TITLE', 'Contingent upon marketable title.')
  c = drawClause(ctx, c, '14', 'HOLD HARMLESS', 'Assignee assumes risk.')
  c = drawClause(ctx, c, '15', 'ENTIRE AGREEMENT', 'This is the entire agreement.')
  c = drawClause(ctx, c, '16', 'SPECIAL PROVISIONS', v(d,'special_provisions','None'))
  c.y -= 5
  c = await embedDualSignature(ctx, c, 3, 'Assignee Signature', v(d,'assignee_name','___'), 'Assignor Signature', 'Klose LLC')

  c = await buildSignedInvestorDisclosure(ctx, 'Buyer/Assignee', 4)
  c = await buildSignedNonRepresentation(ctx, 'Buyer/Assignee', 5)
  c = await buildSignedFairHousing(ctx, 'Buyer/Assignee', 6)
}

// ─── Amendment ──────────────────────────────────────────────────────

function buildAmendmentPdf(ctx: PdfCtx) {
  return buildAmendmentPdfAsync(ctx)
}

async function buildAmendmentPdfAsync(ctx: PdfCtx) {
  const d = ctx.data
  let c = addPage(ctx, 1)
  c = drawHeader(ctx, c)
  c.y -= 10
  c = drawCenteredText(ctx, c, 'AMENDMENT TO PURCHASE AND SALE AGREEMENT', 14)
  c.y -= 10
  c = drawParagraph(ctx, c, `Buyer: Klose LLC`)
  c = drawParagraph(ctx, c, `Seller: ${v(d,'seller_name')}`)
  c = drawParagraph(ctx, c, `Property: ${v(d,'property_address')}`)
  c.y -= 5
  c = drawParagraph(ctx, c, `The parties agree to amend the Purchase and Sale Agreement with a Binding Agreement Date of ${v(d,'binding_agreement_date')}.`)
  if (d.new_purchase_price) c = drawClause(ctx, c, 'Amendment 1', 'Purchase Price', `New price: $ ${money(d.new_purchase_price)}`)
  if (d.new_closing_date) c = drawClause(ctx, c, 'Amendment 2', 'Closing Date', `New date: ${d.new_closing_date}`)
  if (d.additional_terms) c = drawClause(ctx, c, 'Amendment 3', 'Additional Terms', d.additional_terms)
  c.y -= 5
  c = await embedDualSignature(ctx, c, 2, 'Seller Signature', v(d,'seller_name','___'), 'Buyer Signature', 'Klose LLC')
}

// ─── Supporting pages with embedded signatures ──────────────────────

async function buildSignedInvestorDisclosure(ctx: PdfCtx, role: string, pageNum: number): Promise<Cursor> {
  let c = addPage(ctx, pageNum)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, 'WORKING WITH KLOSE LLC', 13)
  c = drawCenteredText(ctx, c, 'INVESTOR DISCLOSURE STATEMENT', 11)
  c.y -= 5
  c = drawParagraph(ctx, c, `I, the undersigned, acknowledge and understand that Klose LLC is a for-profit real estate investment company.`)
  const items = [
    'Klose is a real estate investor and is NOT a licensed broker or agent.',
    'Klose holds an equitable interest through a Purchase and Sale Agreement.',
    'Klose is not currently the fee simple owner at the time of assignment.',
    'This transaction is contingent upon obtaining marketable title.',
    "Marketable title means the title is free from significant liens or disputes.",
    `The parties agree to use ${v(ctx.data,'title_company')} (Title Company).`,
    'If unable to obtain marketable title, Klose shall return option/earnest money.',
    'Closing may occur through assignment, simultaneous closing, or traditional purchase.',
    'This property is sold as-is, where-is.',
    'The undersigned is encouraged to seek independent legal counsel.',
  ]
  for (let i = 0; i < items.length; i++) {
    c = drawParagraph(ctx, c, `${i+1}. ${items[i]}`)
  }
  c.y -= 5
  c = drawCenteredText(ctx, c, 'ACKNOWLEDGMENT', 11)
  c = drawParagraph(ctx, c, 'I/We have read and understand this disclosure.')
  c.y -= 10
  return await embedSignature(ctx, c, pageNum, `${role} Signature - Investor Disclosure`)
}

async function buildSignedFairHousing(ctx: PdfCtx, role: string, pageNum: number): Promise<Cursor> {
  let c = addPage(ctx, pageNum)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, 'FAIR HOUSING STATEMENT &', 13)
  c = drawCenteredText(ctx, c, 'AFFILIATED BUSINESS DISCLOSURE', 13)
  c.y -= 5
  c = drawCenteredText(ctx, c, 'FAIR HOUSING STATEMENT', 11)
  c = drawParagraph(ctx, c, 'It is illegal discrimination under the Federal Fair Housing Law to discriminate based on race, color, religion, sex, disability, familial status, or national origin.', 9)
  c.y -= 5
  c = drawCenteredText(ctx, c, 'AFFILIATED BUSINESS DISCLOSURE', 11)
  c = drawParagraph(ctx, c, 'Klose LLC may have relationships with certain service providers. You are NOT required to use any specific provider.', 9)
  c.y -= 10
  return await embedSignature(ctx, c, pageNum, `${role} Signature - Fair Housing`)
}

async function buildSignedNonRepresentation(ctx: PdfCtx, role: string, pageNum: number): Promise<Cursor> {
  let c = addPage(ctx, pageNum)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, 'NOTICE OF NON-REPRESENTATION', 13)
  c.y -= 5
  c = drawParagraph(ctx, c, 'You are hereby notified that Klose LLC does not represent you as a real estate broker or agent.')
  c = drawParagraph(ctx, c, 'You are advised to seek independent legal counsel.')
  c.y -= 10
  return await embedSignature(ctx, c, pageNum, `${role} Signature - Non-Representation`)
}

async function buildSignedAuthToSign(ctx: PdfCtx, pageNum: number): Promise<Cursor> {
  let c = addPage(ctx, pageNum)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, 'AUTHORIZATION TO SIGN LISTING', 13)
  c = drawCenteredText(ctx, c, 'DOCUMENTS AND OFFERS', 13)
  c = drawCenteredText(ctx, c, '(Special Limited Power of Attorney)', 10, ctx.fontItalic)
  c.y -= 5
  c = drawParagraph(ctx, c, `I/we, ${v(ctx.data,'seller_name')}, hereby appoint Klose LLC as Attorney-in-Fact to execute documents necessary to list, market, and sell the Property at ${v(ctx.data,'property_address')}.`)
  c = drawParagraph(ctx, c, 'This authorization is effective upon execution.')
  c.y -= 10
  return await embedSignature(ctx, c, pageNum, 'Seller Signature - Power of Attorney')
}

async function buildSignedReleaseAuth(ctx: PdfCtx, pageNum: number): Promise<Cursor> {
  let c = addPage(ctx, pageNum)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, 'AUTHORIZATION FOR THE RELEASE OF INFORMATION', 13)
  c.y -= 5
  c = drawParagraph(ctx, c, `I/We authorize ${v(ctx.data,'title_company')} (Title Company) to request information related to mortgages, judgments, and other documents.`)
  c = drawParagraph(ctx, c, 'A copy of this authorization may be accepted as an original.')
  c.y -= 10
  return await embedSignature(ctx, c, pageNum, 'Seller Signature - Release of Info')
}

async function buildSignedSellerResponsibility(ctx: PdfCtx, pageNum: number): Promise<Cursor> {
  let c = addPage(ctx, pageNum)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, "SELLER'S RESPONSIBILITY ACKNOWLEDGEMENT", 13)
  c.y -= 5
  c = drawParagraph(ctx, c, "Seller is required to pay off any outstanding mortgages, utility bills, property taxes, assessments, judgments, legal fees, and any other lien or encumbrance.")
  c = drawParagraph(ctx, c, "Klose LLC is not responsible for directly paying any liens or property taxes.")
  c = drawParagraph(ctx, c, 'By signing, I/we confirm understanding of all terms and payment obligations.')
  c.y -= 10
  return await embedSignature(ctx, c, pageNum, 'Seller Signature - Responsibility Acknowledgement')
}
