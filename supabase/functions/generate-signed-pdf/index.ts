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
  kloseSigByPage: Record<number, { image: string; name: string; date: string }>
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

async function embedKloseSignature(ctx: PdfCtx, cursor: Cursor, pageNum: number, label: string): Promise<Cursor> {
  const sig = ctx.kloseSigByPage[pageNum]
  if (!sig?.image) return cursor
  cursor = ensureSpace(ctx, cursor, 80)
  try {
    const base64 = sig.image.split(',')[1]
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const sigImage = await ctx.pdfDoc.embedPng(bytes)
    const sigW = 160
    const sigH = (sigImage.height / sigImage.width) * sigW
    cursor.page.drawImage(sigImage, { x: MARGIN_L, y: cursor.y - sigH, width: sigW, height: sigH })
    cursor.page.drawLine({ start: { x: MARGIN_L, y: cursor.y - sigH - 2 }, end: { x: MARGIN_L + 250, y: cursor.y - sigH - 2 }, thickness: 0.5, color: GRAY })
    cursor.page.drawText(label, { x: MARGIN_L, y: cursor.y - sigH - 14, size: 8, font: ctx.font, color: GRAY })
    cursor.page.drawText(`Signed by: ${sig.name}`, { x: MARGIN_L, y: cursor.y - sigH - 26, size: 8, font: ctx.font, color: BLACK })
    cursor.page.drawText(`Date: ${sig.date}`, { x: MARGIN_L, y: cursor.y - sigH - 38, size: 8, font: ctx.font, color: GRAY })
    cursor.page.drawText('[ELECTRONICALLY SIGNED - KLOSE LLC]', { x: MARGIN_L + 260, y: cursor.y - sigH / 2, size: 8, font: ctx.fontBold, color: rgb(0, 0.5, 0.35) })
    cursor.y = cursor.y - sigH - 50
  } catch (e) {
    console.error('Failed to embed Klose signature for page', pageNum, e)
  }
  return cursor
}

async function embedDualSignature(ctx: PdfCtx, cursor: Cursor, pageNum: number, leftLabel: string, leftName: string, rightLabel: string, rightName: string): Promise<Cursor> {
  cursor = ensureSpace(ctx, cursor, 80)
  const midX = PAGE_W / 2
  const leftSig = ctx.kloseSigByPage[pageNum]
  const rightSig = ctx.sigByPage[pageNum]
  let leftSigHeight = 0
  let rightSigHeight = 0

  if (leftSig?.image) {
    try {
      const base64 = leftSig.image.split(',')[1]
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const sigImage = await ctx.pdfDoc.embedPng(bytes)
      const sigW = 140
      const sigH = (sigImage.height / sigImage.width) * sigW
      cursor.page.drawImage(sigImage, { x: MARGIN_L, y: cursor.y - sigH, width: sigW, height: sigH })
      leftSigHeight = sigH
    } catch (e) {
      console.error('Failed to embed left dual sig', e)
    }
  }

  if (rightSig?.image) {
    try {
      const base64 = rightSig.image.split(',')[1]
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const sigImage = await ctx.pdfDoc.embedPng(bytes)
      const sigW = 140
      const sigH = (sigImage.height / sigImage.width) * sigW
      cursor.page.drawImage(sigImage, { x: midX + 10, y: cursor.y - sigH, width: sigW, height: sigH })
      rightSigHeight = sigH
    } catch (e) {
      console.error('Failed to embed right dual sig', e)
    }
  }

  const blockHeight = Math.max(leftSigHeight, rightSigHeight)
  const lineY = cursor.y - blockHeight - 2

  cursor.page.drawLine({ start: { x: MARGIN_L, y: lineY }, end: { x: midX - 30, y: lineY }, thickness: 0.5, color: GRAY })
  cursor.page.drawText(leftLabel, { x: MARGIN_L, y: lineY - 12, size: 8, font: ctx.font, color: GRAY })
  cursor.page.drawText(leftSig?.name || leftName, { x: MARGIN_L, y: lineY - 24, size: 9, font: ctx.fontBold, color: BLACK })
  cursor.page.drawText(`Date: ${leftSig?.date || '____________'}`, { x: MARGIN_L, y: lineY - 36, size: 8, font: ctx.font, color: GRAY })

  cursor.page.drawLine({ start: { x: midX + 10, y: lineY }, end: { x: PAGE_W - MARGIN_R, y: lineY }, thickness: 0.5, color: GRAY })
  cursor.page.drawText(rightLabel, { x: midX + 10, y: lineY - 12, size: 8, font: ctx.font, color: GRAY })
  cursor.page.drawText(rightSig?.name || rightName, { x: midX + 10, y: lineY - 24, size: 9, font: ctx.fontBold, color: BLACK })
  cursor.page.drawText(`Date: ${rightSig?.date || '____________'}`, { x: midX + 10, y: lineY - 36, size: 8, font: ctx.font, color: GRAY })

  return { ...cursor, y: lineY - 50 }
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

  c = drawClause(ctx, c, '1', 'PARTIES', `Klose LLC, a Wyoming Limited Liability Company (hereinafter "BUYER"), and ${v(d,'seller_name')} (hereinafter "SELLER"), which terms may be singular or plural and will include the heirs, successors, personal representatives, and assigns of Seller and Buyer, hereby agree that Seller will sell and Buyer will buy the following property, upon the following terms and conditions.`)
  c = drawClause(ctx, c, '2', 'PROPERTY', `(Street Address): ${v(d,'property_address')} (City): ${v(d,'property_city')} (County): ${v(d,'property_county')} (State): ${v(d,'property_state','___')}. The Property includes the land and all appurtenant rights, privileges and easements, all buildings and fixtures, including without limitation, all of the following as are NOW on the Property: electrical, heating, cooling, plumbing, bathroom mirrors and fixtures, awnings, screens, storm windows and doors, landscaping, disposals, TV antennas, built-in electronics wiring, ceiling fans, smoke alarms, security systems, doorbells, thermostats, garage door openers and controls, attached carpeting, ranges/ovens, microwave ovens, kitchen refrigerators, dishwashers, air conditioners, water softeners, existing window treatments, satellite/TV reception systems, affixed gas/oil tanks not including fuel therein unless otherwise agreed by the parties. NOT Included: ${v(d,'not_included_items','None')}. All property sold by this contract is called the "Property".`)
  c = drawClause(ctx, c, '3', 'CONTRACT TERMS', `Sale Price: $ ${money(d.sale_price)}`)
  c = drawClause(ctx, c, '4', 'NON-FINANCING / ALL CASH', 'This is an all-cash sale; no financing is involved, unless agreed upon in writing by both parties at a later date.')
  c = drawClause(ctx, c, '5', 'CLOSING', `Buyer will deliver contract to ${v(d,'title_company')} (the "Title Company") upon execution of the contract by both parties. Closing shall occur within ${v(d,'closing_days','30')} business days from the execution of this agreement, or within seven (7) days after objection to title has been cured, whichever date is later.`)
  c = drawClause(ctx, c, '6', 'TITLE POLICY', "Seller shall furnish to Buyer at Buyer's expense an Owner's Policy of Title Insurance issued by the Title Company in the amount of the Sales Price, dated at or after closing, insuring Buyer against loss under the provisions of the Title Policy.")
  c = drawClause(ctx, c, '7', 'PROPERTY CONDITION', `The Buyer is purchasing the Property in an "AS-IS" condition subject to a ${v(d,'due_diligence_days','10')} Business Day Due Diligence Period. During Due Diligence, Buyer will need to access the property with Inspectors, Appraisers, Investors, Contractors, and potentially others. If Buyer determines, in its sole and absolute discretion, before the expiration of the Due Diligence Period that the Property is unacceptable for Buyer's purposes, Buyer shall have the right to terminate this Agreement by giving Seller written notice before the expiration of the Due Diligence Period.`)
  c = drawClause(ctx, c, '8', 'POSSESSION', 'The possession of the Property shall be delivered to the Buyer at closing. No exceptions, unless specifically agreed upon in writing by all parties.')
  c = drawClause(ctx, c, '9', 'PRE-MARKETING AGREEMENT', `If vacant, and upon acceptance of this contract by Seller, Seller is to furnish Buyer a key or combination to lockbox and give Buyer permission to enter the premises for inspections prior to closing. At Buyer's option, Buyer is allowed to display a For Sale or similar sign in front of the Property. Buyer has the right to market its contract interest in the Property in Buyer's sole discretion.`)
  c = drawClause(ctx, c, '10', 'PRORATIONS', 'Property Taxes, flood and hazard insurance, rents, maintenance fees, interest on any present loan, and any prepaid unearned mortgage insurance premium which is refundable in whole or in part shall be prorated through the Closing Date.')
  c = drawClause(ctx, c, '11', 'PROPERTY DOCUMENTATION', 'Seller to furnish Buyer a General Warranty Deed conveying title subject only to liens securing payment of debt created as part of the consideration, taxes for the current year, restrictive covenants and utility easements common to the platted subdivision.')
  c = drawClause(ctx, c, '12', 'CASUALTY LOSS', 'If any part of Property is damaged or destroyed by fire or other casualty loss, Seller shall restore the same to its previous condition as soon as reasonably possible, but in any event by Closing Date.')
  c = drawClause(ctx, c, '13', 'DEFAULT', 'If Seller fails to comply herewith for any reason, Buyer may either (a) enforce specific performance hereof and seek such other relief as may be provided by law, or (b) terminate this contract, thereby releasing Seller from this contract.')
  c = drawClause(ctx, c, '14', 'REPRESENTATIONS', 'Seller represents that as of the Closing Date (a) there will be no unrecorded liens, assessments, or Uniform Commercial Code Security interests against any of the Property, and (b) any loans will be without default.')
  c = drawClause(ctx, c, '15', 'SALES EXPENSES', "A. Buyer's Expenses: Expenses stipulated to be paid by Buyer under other provisions of this contract. B. Seller's Expenses: Releases of existing liens, including prepayment penalties and recording fees; release of Seller's loan liability; tax statements or certificates; real estate transfer tax and/or conveyance fees. C. If Seller(s) fails to perform, they are responsible for any consequential damages.")
  c = drawClause(ctx, c, '16', 'RESALE OF PROPERTY', 'Seller agrees that Buyer retains all profit, whether by note, trade, or cash, in the event of resale, simultaneous close, or assignment of this contract.')
  c = drawClause(ctx, c, '17', 'ASSIGNMENT OF CONTRACT', 'Buyer may assign the contract. If assigned, all rights, interests, suits, claims, and titles in and to the contract will be assigned, and the Assignor will be released of all liability.')
  c = drawClause(ctx, c, '18', 'HOLD HARMLESS AND ASSUMPTION OF LIABILITY', 'In the event the Seller has any damages or other liabilities caused by a third party, Buyer is to be held harmless by the Seller for these damages or other liabilities.')
  c = drawClause(ctx, c, '19', 'ENTIRE AGREEMENT OF PARTIES', 'This contract contains the entire agreement of the parties and cannot be changed except by their written agreement.')
  c = drawClause(ctx, c, '20', 'SPECIAL PROVISIONS', v(d, 'special_provisions', 'None'))
  c.y -= 5
  c = await embedDualSignature(ctx, c, 3, 'Buyer Signature', 'Klose LLC / Authorized Signatory', 'Seller Signature', v(d,'seller_name','_________________'))

  c = addPage(ctx, 4)
  c = drawHeader(ctx, c, false)
  c = drawCenteredText(ctx, c, 'PRELIMINARY SELLER INFORMATION WORKSHEET', 13)
  c.y -= 5
  c = drawCenteredText(ctx, c, 'SELLER INFORMATION', 11)
  c.y -= 5
  c = drawParagraph(ctx, c, `Full Legal Name: ${v(d,'seller_name')}`)
  c = drawParagraph(ctx, c, `Date of Birth: ${v(d,'seller_dob')}`)
  c = drawParagraph(ctx, c, `Phone Number: ${v(d,'seller_phone')}`)
  c = drawParagraph(ctx, c, `Email: ${v(d,'seller_email')}`)
  c = drawParagraph(ctx, c, `Marital Status: ${v(d,'marital_status')}`)
  if (d.spouse_name) c = drawParagraph(ctx, c, `Spouse Name: ${d.spouse_name}`)
  c.y -= 20
  c = await embedSignature(ctx, c, 5, 'Seller Signature')

  c = await buildSignedInvestorDisclosure(ctx, 'Seller', 6)
  c = await buildSignedFairHousing(ctx, 'Seller', 7)
  c = await buildSignedNonRepresentation(ctx, 'Seller', 8)
  c = await buildSignedAuthToSign(ctx, 9)
  c = await buildSignedReleaseAuth(ctx, 10)
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
  c = await embedDualSignature(ctx, c, 3, 'Assignor Signature', 'Klose LLC / Authorized Signatory', 'Assignee Signature', v(d,'assignee_name','___'))

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
  c = await embedDualSignature(ctx, c, 2, 'Buyer Signature', 'Klose LLC / Authorized Signatory', 'Seller Signature', v(d,'seller_name','___'))
}

// ─── Supporting pages with embedded signatures ──────────────────────

async function buildSignedInvestorDisclosure(ctx: PdfCtx, role: string, pageNum: number): Promise<Cursor> {
  let c = addPage(ctx, pageNum)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, 'WORKING WITH KLOSE LLC', 13)
  c = drawCenteredText(ctx, c, 'INVESTOR DISCLOSURE STATEMENT', 11)
  c.y -= 5
  c = drawParagraph(ctx, c, `I, the undersigned, acknowledge and understand that Klose LLC ("Klose") is a for-profit real estate investment company organized under the laws of Wyoming. Accordingly, the undersigned acknowledges the following:`)
  const items = [
    'Klose is a real estate investor and is NOT a licensed real estate broker or agent.',
    'Klose holds an equitable interest in the subject property through a Purchase and Sale Agreement.',
    'Klose is not currently the fee simple owner of the property at the time of assignment.',
    'This transaction is contingent upon Klose obtaining marketable title.',
    "Marketable title means the property's title is free from significant liens, disputes, or legal issues.",
    `The parties agree to use ${v(ctx.data,'title_company')} (Title Company) to determine marketable title.`,
    'If unable to obtain marketable title, Klose shall return option/earnest money.',
    'The closing may occur through: (a) Assignment of Contract, (b) Simultaneous Closing, or (c) Traditional Purchase.',
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
  return await embedSignature(ctx, c, pageNum, `${role} Signature`)
}

async function buildSignedFairHousing(ctx: PdfCtx, role: string, pageNum: number): Promise<Cursor> {
  let c = addPage(ctx, pageNum)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, 'FAIR HOUSING STATEMENT &', 13)
  c = drawCenteredText(ctx, c, 'AFFILIATED BUSINESS DISCLOSURE', 13)
  c.y -= 5
  c = drawCenteredText(ctx, c, 'FAIR HOUSING STATEMENT', 11)
  c = drawParagraph(ctx, c, 'It is illegal discrimination under the Federal Fair Housing Law, 42 U.S.C.A. 3601 to take any of the following actions because of race, color, religion, sex (including gender identity and sexual orientation), disability, familial status, or national origin: Refuse to rent or sell housing; Refuse to negotiate for housing; Set different terms, conditions or privileges for sale or rental of a dwelling; Provide different housing services or facilities; Falsely deny that housing is available for inspection, sale or rental; Make, print or publish any notice, statement or advertisement indicating any preference, limitation or discrimination.', 9)
  c.y -= 5
  c = drawCenteredText(ctx, c, 'AFFILIATED BUSINESS DISCLOSURE', 11)
  c = drawParagraph(ctx, c, 'Klose LLC and/or its affiliated companies may have relationships with certain service providers, including title companies and lenders. You are NOT required to use any specific title company, lender, or settlement service provider as a condition of your purchase or sale.', 9)
  c.y -= 10
  return await embedSignature(ctx, c, pageNum, `${role} Signature`)
}

async function buildSignedNonRepresentation(ctx: PdfCtx, role: string, pageNum: number): Promise<Cursor> {
  let c = addPage(ctx, pageNum)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, 'NOTICE OF NON-REPRESENTATION', 13)
  c.y -= 5
  c = drawParagraph(ctx, c, 'You are hereby notified that Klose LLC and its members, managers, and employees do not represent you in any capacity as a real estate broker or agent.')
  c = drawParagraph(ctx, c, 'You should not assume that any representative of Klose LLC represents your interests unless you separately engage a licensed real estate agent or attorney. You are advised not to disclose any information you want held in confidence until you decide on representation.')
  c = drawParagraph(ctx, c, 'Your signature below acknowledges receipt of this notice and does not establish a brokerage relationship.')
  c.y -= 10
  return await embedSignature(ctx, c, pageNum, `${role} Signature`)
}

async function buildSignedAuthToSign(ctx: PdfCtx, pageNum: number): Promise<Cursor> {
  let c = addPage(ctx, pageNum)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, 'AUTHORIZATION TO SIGN LISTING', 13)
  c = drawCenteredText(ctx, c, 'DOCUMENTS AND OFFERS', 13)
  c = drawCenteredText(ctx, c, '(Special Limited Power of Attorney)', 10, ctx.fontItalic)
  c.y -= 5
  c = drawParagraph(ctx, c, `BE IT ACKNOWLEDGED that I/we, ${v(ctx.data,'seller_name')}, the "Seller", desire to execute and grant a SPECIAL LIMITED POWER OF ATTORNEY, hereby appointing Klose LLC, a Wyoming Limited Liability Company, as my Attorney-in-Fact to act as follows, GRANTING unto my Attorney-in-Fact full power to:`)
  c = drawParagraph(ctx, c, `Do all things necessary to close on the sale of the property commonly known as ${v(ctx.data,'property_address')} (hereinafter "Property"), with full power and authority for me and my name to execute any and all documents necessary to list, market, and contract the Property on the Multiple Listing Services ("MLS"), investor networks, Zillow, and/or realtors for the purpose of marketing and selling the Property.`)
  c = drawParagraph(ctx, c, 'This authorization is effective upon execution and shall be valid until such time as any revocation is executed.')
  c.y -= 10
  return await embedSignature(ctx, c, pageNum, 'Seller Signature')
}

async function buildSignedReleaseAuth(ctx: PdfCtx, pageNum: number): Promise<Cursor> {
  let c = addPage(ctx, pageNum)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, 'AUTHORIZATION FOR THE RELEASE OF INFORMATION', 13)
  c.y -= 5
  c = drawParagraph(ctx, c, `1. I/We have entered into a real property sales contract. As part of this process, ${v(ctx.data,'title_company')} (Title Company) may request information related to my current open mortgage(s), judgments, and other documents required in connection with and in preparation of a closing.`)
  c = drawParagraph(ctx, c, '2. I/We authorize you to provide to the Title Company any and all information and documentation they request, including but not limited to: judgment and lien payoffs, payoff information on open mortgages, deeds of trust, etc.')
  c = drawParagraph(ctx, c, '3. The Title Company or any title company substituted in their place may address this authorization to any party named in the loan application or related to any outstanding liens on the property.')
  c = drawParagraph(ctx, c, '4. I agree to hold the Title Company and its agents and employees harmless for any judgment or lien payoff obtained that differs from one obtained independently.')
  c = drawParagraph(ctx, c, '5. A copy of this authorization may be accepted as an original.')
  c.y -= 10
  return await embedSignature(ctx, c, pageNum, 'Seller Signature')
}

async function buildSignedSellerResponsibility(ctx: PdfCtx, pageNum: number): Promise<Cursor> {
  let c = addPage(ctx, pageNum)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, "SELLER'S RESPONSIBILITY ACKNOWLEDGEMENT", 13)
  c.y -= 5
  c = drawCenteredText(ctx, c, '15. SALES EXPENSES:', 11)
  c = drawParagraph(ctx, c, 'The following expenses shall be paid at or prior to closing:')
  c = drawParagraph(ctx, c, "A. Buyer's Expenses: Expenses stipulated to be paid by Buyer under other provisions of this contract.")
  c = drawParagraph(ctx, c, "B. Seller's Expenses: Releases of existing liens, including prepayment penalties and recording fees; release of Seller's loan liability; tax statements or certificates; real estate transfer tax and/or conveyance fees.")
  c = drawParagraph(ctx, c, "C. If Seller(s) fails to perform, they are responsible for any consequential damages, including indirect expenses, incurred by Buyer or Buyer's assignee.")
  c = drawParagraph(ctx, c, 'To facilitate a clear title transfer, the Seller is required to pay off any outstanding mortgages, utility bills, property taxes, assessments, judgments, legal fees, and any other lien or encumbrance on the property.')
  c = drawParagraph(ctx, c, "Klose LLC's cash offer is based on the assumption that the Seller will use the proceeds from the sale of their property to cover the above-described expenses.")
  c.y -= 5
  c = drawParagraph(ctx, c, 'Klose LLC is not responsible for directly paying any liens, property taxes, or any other cost discovered in the title examination.')
  c.y -= 5
  c = drawParagraph(ctx, c, 'By signing this Acknowledgement, I/we confirm that: (i) I/we have carefully read, fully understand, and agree to all terms and conditions herein; (ii) this Acknowledgement constitutes the entire understanding between me/us and Klose LLC regarding my/our payment obligations associated with selling the property; and (iii) my/our payment obligations for the items outlined above will be deducted from the total purchase price.')
  c.y -= 10
  return await embedSignature(ctx, c, pageNum, 'Seller Signature')
}
