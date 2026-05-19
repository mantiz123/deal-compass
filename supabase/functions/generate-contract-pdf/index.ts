const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'https://esm.sh/pdf-lib@1.17.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Colors
const DARK_BG = rgb(10/255, 10/255, 20/255)
const TEAL = rgb(0, 212/255, 170/255)
const BLACK = rgb(0, 0, 0)
const GRAY = rgb(0.4, 0.4, 0.4)
const DARK_GRAY = rgb(0.15, 0.15, 0.15)
const WHITE = rgb(1, 1, 1)
const FIELD_COLOR = rgb(0, 0.53, 0.67)

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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { contractId, contractType, contractData, leadId } = await req.json()

    if (!contractId || !contractType || !contractData || !leadId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders })
    }

    const { data: lead } = await supabase
      .from('leads')
      .select('*, property:properties(*)')
      .eq('id', leadId)
      .single()

    if (!lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404, headers: corsHeaders })
    }

    const property = lead.property
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
    const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)

    const ctx: PdfCtx = { pdfDoc, font, fontBold, fontItalic, data: contractData }

    if (contractType === 'AB') {
      buildABPdf(ctx)
    } else if (contractType === 'BC') {
      buildBCPdf(ctx)
    } else if (contractType === 'DC') {
      buildDCPdf(ctx)
    } else {
      buildAmendmentPdf(ctx)
    }

    const pdfBytes = await pdfDoc.save()
    const fileName = `${contractType}_Contract_${(property?.address || 'property').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    const filePath = `${contractId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(filePath)

    return new Response(JSON.stringify({
      pdfUrl: urlData.publicUrl,
      fileName,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('PDF generation error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ─── PDF drawing helpers ────────────────────────────────────────────

interface PdfCtx {
  pdfDoc: PDFDocument
  font: PDFFont
  fontBold: PDFFont
  fontItalic: PDFFont
  data: Record<string, any>
}

interface Cursor {
  page: PDFPage
  y: number
}

function addPage(ctx: PdfCtx): Cursor {
  const page = ctx.pdfDoc.addPage([PAGE_W, PAGE_H])
  return { page, y: PAGE_H - 50 }
}

function ensureSpace(ctx: PdfCtx, cursor: Cursor, needed: number): Cursor {
  if (cursor.y - needed < 60) {
    return addPage(ctx)
  }
  return cursor
}

function drawHeader(ctx: PdfCtx, cursor: Cursor, showEIN = true): Cursor {
  const { page } = cursor
  // Dark header bar
  page.drawRectangle({ x: 0, y: PAGE_H - 70, width: PAGE_W, height: 70, color: DARK_BG })
  // Teal bottom line
  page.drawRectangle({ x: 0, y: PAGE_H - 73, width: PAGE_W, height: 3, color: TEAL })
  // KLOSE LLC
  const titleW = ctx.fontBold.widthOfTextAtSize('KLOSE LLC', 22)
  page.drawText('KLOSE LLC', { x: (PAGE_W - titleW) / 2, y: PAGE_H - 35, size: 22, font: ctx.fontBold, color: WHITE })
  // Subtitle
  const sub = 'A Wyoming Limited Liability Company | Real Estate Investment'
  const subW = ctx.font.widthOfTextAtSize(sub, 9)
  page.drawText(sub, { x: (PAGE_W - subW) / 2, y: PAGE_H - 50, size: 9, font: ctx.font, color: rgb(0.67, 0.67, 0.67) })
  if (showEIN) {
    const ein = 'EIN: 41-4409334'
    const einW = ctx.font.widthOfTextAtSize(ein, 8)
    page.drawText(ein, { x: (PAGE_W - einW) / 2, y: PAGE_H - 62, size: 8, font: ctx.font, color: rgb(0.53, 0.53, 0.53) })
  }
  return { page, y: PAGE_H - 90 }
}

function drawCenteredText(ctx: PdfCtx, cursor: Cursor, text: string, size: number, f?: PDFFont): Cursor {
  cursor = ensureSpace(ctx, cursor, size + 6)
  const useFont = f || ctx.fontBold
  const w = useFont.widthOfTextAtSize(text, size)
  cursor.page.drawText(text, { x: (PAGE_W - w) / 2, y: cursor.y, size, font: useFont, color: BLACK })
  return { ...cursor, y: cursor.y - size - 6 }
}

// Wrap text at a given width, returning an array of lines
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
  // Replace field placeholders with plain values
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
  // Draw prefix in bold, then body wraps
  const fullText = prefix + body
  const lines = wrapText(fullText, ctx.font, size, CONTENT_W)
  
  for (let i = 0; i < lines.length; i++) {
    cursor = ensureSpace(ctx, cursor, LINE_HEIGHT)
    const line = lines[i]
    // For first line, try to bold the prefix portion
    if (i === 0) {
      const prefixW = ctx.fontBold.widthOfTextAtSize(prefix, size)
      if (prefixW < CONTENT_W) {
        cursor.page.drawText(prefix, { x: MARGIN_L, y: cursor.y, size, font: ctx.fontBold, color: BLACK })
        const rest = line.substring(prefix.length)
        if (rest) {
          cursor.page.drawText(rest, { x: MARGIN_L + prefixW, y: cursor.y, size, font: ctx.font, color: BLACK })
        }
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

function drawSignatureBlock(ctx: PdfCtx, cursor: Cursor, leftLabel: string, leftName: string, rightLabel: string, rightName: string): Cursor {
  cursor = ensureSpace(ctx, cursor, 80)
  const midX = PAGE_W / 2
  // Left sig line
  cursor.page.drawLine({ start: { x: MARGIN_L, y: cursor.y }, end: { x: midX - 30, y: cursor.y }, thickness: 0.5, color: GRAY })
  cursor.page.drawText(leftLabel, { x: MARGIN_L, y: cursor.y - 12, size: 8, font: ctx.font, color: GRAY })
  cursor.page.drawText(leftName, { x: MARGIN_L, y: cursor.y - 24, size: 9, font: ctx.fontBold, color: BLACK })
  cursor.page.drawText('Date: ____________', { x: MARGIN_L, y: cursor.y - 36, size: 8, font: ctx.font, color: GRAY })
  // Right sig line
  cursor.page.drawLine({ start: { x: midX + 10, y: cursor.y }, end: { x: PAGE_W - MARGIN_R, y: cursor.y }, thickness: 0.5, color: GRAY })
  cursor.page.drawText(rightLabel, { x: midX + 10, y: cursor.y - 12, size: 8, font: ctx.font, color: GRAY })
  cursor.page.drawText(rightName, { x: midX + 10, y: cursor.y - 24, size: 9, font: ctx.fontBold, color: BLACK })
  cursor.page.drawText('Date: ____________', { x: midX + 10, y: cursor.y - 36, size: 8, font: ctx.font, color: GRAY })
  return { ...cursor, y: cursor.y - 50 }
}

function drawSingleSigBlock(ctx: PdfCtx, cursor: Cursor, label: string, name: string): Cursor {
  cursor = ensureSpace(ctx, cursor, 50)
  cursor.page.drawLine({ start: { x: MARGIN_L, y: cursor.y }, end: { x: MARGIN_L + 250, y: cursor.y }, thickness: 0.5, color: GRAY })
  cursor.page.drawText(label, { x: MARGIN_L, y: cursor.y - 12, size: 8, font: ctx.font, color: GRAY })
  cursor.page.drawText(name, { x: MARGIN_L, y: cursor.y - 24, size: 9, font: ctx.font, color: BLACK })
  cursor.page.drawText('Date: ____________', { x: MARGIN_L, y: cursor.y - 36, size: 8, font: ctx.font, color: GRAY })
  return { ...cursor, y: cursor.y - 50 }
}

function v(data: Record<string, any>, key: string, fallback = '______________________________'): string {
  return data[key] || fallback
}

function money(val: any): string {
  const n = Number(val || 0)
  return n.toLocaleString('en-US')
}

// ─── AB Contract ────────────────────────────────────────────────────

function buildABPdf(ctx: PdfCtx) {
  const d = ctx.data
  
  // Page 1: Main Agreement
  let c = addPage(ctx)
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

  c = drawClause(ctx, c, '9', 'PRE-MARKETING AGREEMENT', "If vacant, and upon acceptance of this contract by Seller, Seller is to furnish Buyer a key or combination to lockbox and give Buyer permission to enter the premises for inspections prior to closing. At Buyer's option, Buyer is allowed to display a For Sale or similar sign in front of the Property. Buyer has the right to market its contract interest in the Property in Buyer's sole discretion.")

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
  c = drawSignatureBlock(ctx, c, 'Buyer Signature', 'Klose LLC / Authorized Signatory', 'Seller Signature', v(d,'seller_name','_________________'))

  // Page 2: Seller Info Worksheet
  c = addPage(ctx)
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
  c = drawSingleSigBlock(ctx, c, 'Seller Signature', v(d,'seller_name',''))

  // Page 3: Investor Disclosure
  buildInvestorDisclosurePage(ctx, 'Seller')

  // Page 4: Fair Housing
  buildFairHousingPage(ctx, 'Seller')

  // Page 5: Non-Representation
  buildNonRepresentationPage(ctx, 'Seller')

  // Page 6: Auth to Sign (POA)
  buildAuthToSignPage(ctx)

  // Page 7: Release of Info
  buildReleaseAuthPage(ctx)

  // Page 8: Seller Responsibility
  buildSellerResponsibilityPage(ctx)
}

// ─── BC Contract ────────────────────────────────────────────────────

function buildBCPdf(ctx: PdfCtx) {
  const d = ctx.data

  let c = addPage(ctx)
  c = drawHeader(ctx, c)
  c.y -= 10
  c = drawCenteredText(ctx, c, 'ASSIGNMENT OF "AS IS" CASH-OFFER', 14)
  c = drawCenteredText(ctx, c, 'PURCHASE AND SALE AGREEMENT', 14)
  c.y -= 5

  c = drawClause(ctx, c, '1', 'PARTIES', `The undersigned Klose LLC, a Wyoming Limited Liability Company (the "ASSIGNOR"), having executed an "As Is" Cash-Offer Purchase and Sale Agreement (the "INITIAL PURCHASE AGREEMENT") with ${v(d,'seller_name')} (the "SELLER"), for the Property identified in Paragraph 2, hereby assigns and otherwise transfers all rights, title, and interest held by Assignor in said Property to ${v(d,'assignee_name')} (the "ASSIGNEE") in exchange for an Assignment Fee as described below.`)

  c = drawClause(ctx, c, '2', 'PROPERTY', `${v(d,'property_address')}, ${v(d,'property_city','')}, ${v(d,'property_state','')}, including all fixtures, appliances, other permanently installed equipment.`)

  c = drawClause(ctx, c, '3', 'AGREEMENT AND ASSIGNMENT TERMS', `Assignee shall pay a gross amount of $ ${money(d.total_assignment_amount)} (which shall include the purchase price in the Purchase and Sale Agreement being assigned and the Assignment Fee due to the Assignor).`)

  let paymentText = `ASSIGNEE warrants that at Closing they will have sufficient cash to complete the purchase. ASSIGNEE'S method of payment: ${v(d,'payment_method')}.`
  if (d.lender_name) paymentText += ` Lender: ${d.lender_name}.`
  c = drawClause(ctx, c, '4', 'METHOD OF PAYMENT', paymentText)

  c = drawClause(ctx, c, '5', 'CLOSING COSTS', 'ASSIGNEE expressly agrees to pay all closing costs associated with this transaction.')

  c = drawClause(ctx, c, '6', 'ASSIGNEE REPRESENTATIONS', 'ASSIGNEE represents and acknowledges receipt of the INITIAL PURCHASE AGREEMENT prior to execution. ASSIGNEE further agrees to: 1) Perform as required in good faith; 2) Indemnify and hold harmless the ASSIGNOR from any claim; 3) Indemnify and hold harmless the ASSIGNOR for any cost in junk removal; 4) Waive any right to further assign this ASSIGNMENT; 5) Acknowledge ASSIGNOR makes no warranty.')

  c = drawClause(ctx, c, '7', 'ASSIGNOR REPRESENTATIONS', 'ASSIGNOR represents that the INITIAL PURCHASE AGREEMENT is in full force and effect and is fully assignable.')

  c = drawClause(ctx, c, '8', 'CONDITION OF THE PROPERTY - "AS-IS"', `ASSIGNEE acknowledges purchasing the Property in its present physical condition. EXCEPT: ${v(d,'exceptions','None')}.`)

  c = drawClause(ctx, c, '9', 'NON-REFUNDABLE OPTION FEE', `ASSIGNEE has paid or will pay immediately upon execution a non-refundable Assignment Option Fee of $ ${money(d.option_fee)} to ${v(d,'title_company')} (the "TITLE COMPANY").`)

  c = drawClause(ctx, c, '10', 'CLOSING', `ASSIGNOR will deliver this ASSIGNMENT to the TITLE COMPANY. Closing shall occur on or before ${v(d,'closing_date')}.`)

  c = drawClause(ctx, c, '11', 'TITLE POLICY', "The SELLER shall furnish to ASSIGNEE an Owner's Policy of Title Insurance.")

  c = drawClause(ctx, c, '12', 'DEFAULT', "If the ASSIGNOR is unable to perform, the ASSIGNEE'S sole remedy shall be limited to termination and return of the Non-Refundable Option Fee.")

  c = drawClause(ctx, c, '13', 'MARKETABLE TITLE', 'This sale is contingent upon Seller obtaining marketable title. If unable, Seller shall return option money.')

  c = drawClause(ctx, c, '14', 'HOLD HARMLESS', 'Assignee understands and assumes the risk of loss for any liability caused by a third-party action.')

  c = drawClause(ctx, c, '15', 'ENTIRE AGREEMENT', 'This contract contains the entire agreement of the parties.')

  c = drawClause(ctx, c, '16', 'SPECIAL PROVISIONS', v(d,'special_provisions','None'))

  c.y -= 5
  c = drawSignatureBlock(ctx, c, 'Assignor Signature', 'Klose LLC / Authorized Signatory', 'Assignee Signature', v(d,'assignee_name','_________________'))

  // Supporting docs
  buildInvestorDisclosurePage(ctx, 'Buyer/Assignee')
  buildNonRepresentationPage(ctx, 'Buyer/Assignee')
  buildFairHousingPage(ctx, 'Buyer/Assignee')
}

// ─── Amendment ──────────────────────────────────────────────────────

function buildAmendmentPdf(ctx: PdfCtx) {
  const d = ctx.data

  let c = addPage(ctx)
  c = drawHeader(ctx, c)
  c.y -= 10
  c = drawCenteredText(ctx, c, 'AMENDMENT TO PURCHASE AND SALE AGREEMENT', 14)
  c.y -= 10

  c = drawParagraph(ctx, c, `Buyer: Klose LLC, a Wyoming Limited Liability Company`)
  c = drawParagraph(ctx, c, `Seller: ${v(d,'seller_name')}`)
  c = drawParagraph(ctx, c, `Property: ${v(d,'property_address')}`)
  c.y -= 5

  c = drawParagraph(ctx, c, `In consideration of the mutual covenants herein and other good and valuable consideration, the parties agree to amend that certain Purchase and Sale Agreement with a Binding Agreement Date of ${v(d,'binding_agreement_date')} and any incorporated addenda, exhibits, or prior amendments (collectively referred to herein as "Agreement") as follows:`)

  if (d.new_purchase_price) {
    c.y -= 5
    c = drawClause(ctx, c, 'Amendment 1', 'Purchase Price', `Buyer & Seller hereby mutually agree to amend the purchase price to: $ ${money(d.new_purchase_price)}`)
  }
  if (d.new_closing_date) {
    c = drawClause(ctx, c, 'Amendment 2', 'Closing / Expiration / Due Diligence Date', `Buyer & Seller hereby mutually agree to amend the closing, contract expiration, and due diligence date to: ${d.new_closing_date}`)
  }
  if (d.additional_terms) {
    c = drawClause(ctx, c, 'Amendment 3', 'Additional Terms', d.additional_terms)
  }

  c.y -= 5
  c = drawParagraph(ctx, c, 'This Amendment shall become binding when signed by all parties and shall be incorporated into the Agreement. All other terms and conditions of the Purchase and Sale Agreement shall remain in full force and effect.')

  c.y -= 10
  c = drawParagraph(ctx, c, 'The party(ies) below have signed and acknowledge receipt of a copy.', 10)
  c = drawSignatureBlock(ctx, c, 'Buyer Signature', 'Klose LLC / Authorized Signatory', 'Seller Signature', v(d,'seller_name','_________________'))
}

// ─── Supporting Document Pages ──────────────────────────────────────

function buildInvestorDisclosurePage(ctx: PdfCtx, role: string) {
  let c = addPage(ctx)
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
  c = drawSingleSigBlock(ctx, c, `${role} Signature`, v(ctx.data,'seller_name',''))
}

function buildFairHousingPage(ctx: PdfCtx, role: string) {
  let c = addPage(ctx)
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
  c = drawSingleSigBlock(ctx, c, `${role} Signature`, v(ctx.data,'seller_name',''))
}

function buildNonRepresentationPage(ctx: PdfCtx, role: string) {
  let c = addPage(ctx)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, 'NOTICE OF NON-REPRESENTATION', 13)
  c.y -= 5

  c = drawParagraph(ctx, c, 'You are hereby notified that Klose LLC and its members, managers, and employees do not represent you in any capacity as a real estate broker or agent.')
  c = drawParagraph(ctx, c, 'You should not assume that any representative of Klose LLC represents your interests unless you separately engage a licensed real estate agent or attorney. You are advised not to disclose any information you want held in confidence until you decide on representation.')
  c = drawParagraph(ctx, c, 'Your signature below acknowledges receipt of this notice and does not establish a brokerage relationship.')
  c.y -= 10
  c = drawSingleSigBlock(ctx, c, `${role} Signature`, v(ctx.data,'seller_name',''))
}

function buildAuthToSignPage(ctx: PdfCtx) {
  let c = addPage(ctx)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, 'AUTHORIZATION TO SIGN LISTING', 13)
  c = drawCenteredText(ctx, c, 'DOCUMENTS AND OFFERS', 13)
  c = drawCenteredText(ctx, c, '(Special Limited Power of Attorney)', 10, ctx.fontItalic)
  c.y -= 5

  c = drawParagraph(ctx, c, `BE IT ACKNOWLEDGED that I/we, ${v(ctx.data,'seller_name')}, the "Seller", desire to execute and grant a SPECIAL LIMITED POWER OF ATTORNEY, hereby appointing Klose LLC, a Wyoming Limited Liability Company, as my Attorney-in-Fact to act as follows, GRANTING unto my Attorney-in-Fact full power to:`)
  c = drawParagraph(ctx, c, `Do all things necessary to close on the sale of the property commonly known as ${v(ctx.data,'property_address')} (hereinafter "Property"), with full power and authority for me and my name to execute any and all documents necessary to list, market, and contract the Property on the Multiple Listing Services ("MLS"), investor networks, Zillow, and/or realtors for the purpose of marketing and selling the Property.`)
  c = drawParagraph(ctx, c, 'This authorization is effective upon execution and shall be valid until such time as any revocation is executed.')
  c.y -= 10
  c = drawSingleSigBlock(ctx, c, 'Seller Signature', v(ctx.data,'seller_name',''))
}

function buildReleaseAuthPage(ctx: PdfCtx) {
  let c = addPage(ctx)
  c = drawHeader(ctx, c)
  c = drawCenteredText(ctx, c, 'AUTHORIZATION FOR THE RELEASE OF INFORMATION', 13)
  c.y -= 5

  c = drawParagraph(ctx, c, `1. I/We have entered into a real property sales contract. As part of this process, ${v(ctx.data,'title_company')} (Title Company) may request information related to my current open mortgage(s), judgments, and other documents required in connection with and in preparation of a closing.`)
  c = drawParagraph(ctx, c, '2. I/We authorize you to provide to the Title Company any and all information and documentation they request, including but not limited to: judgment and lien payoffs, payoff information on open mortgages, deeds of trust, etc.')
  c = drawParagraph(ctx, c, '3. The Title Company or any title company substituted in their place may address this authorization to any party named in the loan application or related to any outstanding liens on the property.')
  c = drawParagraph(ctx, c, '4. I agree to hold the Title Company and its agents and employees harmless for any judgment or lien payoff obtained that differs from one obtained independently.')
  c = drawParagraph(ctx, c, '5. A copy of this authorization may be accepted as an original.')
  c.y -= 10

  c = ensureSpace(ctx, c, 60)
  const midX = PAGE_W / 2
  c.page.drawLine({ start: { x: MARGIN_L, y: c.y }, end: { x: midX - 30, y: c.y }, thickness: 0.5, color: GRAY })
  c.page.drawText('Seller Signature', { x: MARGIN_L, y: c.y - 12, size: 8, font: ctx.font, color: GRAY })
  c.page.drawLine({ start: { x: midX + 10, y: c.y }, end: { x: PAGE_W - MARGIN_R, y: c.y }, thickness: 0.5, color: GRAY })
  c.page.drawText('SSN (if required by title company)', { x: midX + 10, y: c.y - 12, size: 8, font: ctx.font, color: GRAY })
  c.y -= 30
  c = drawParagraph(ctx, c, `Seller Printed Name: ${v(ctx.data,'seller_name')}`, 9)
  c = drawParagraph(ctx, c, 'Date: ____________', 9)
}

// ─── Double Close ────────────────────────────────────────────────────

function buildDCPdf(ctx: PdfCtx) {
  const d = ctx.data
  const fullAddr = [d.property_address, d.property_city, d.property_state].filter(Boolean).join(', ')

  // Page 1: Overview + A→B Agreement
  let c = addPage(ctx)
  c = drawHeader(ctx, c)
  c.y -= 10
  c = drawCenteredText(ctx, c, 'DOUBLE CLOSE AGREEMENT', 14)
  c = drawCenteredText(ctx, c, 'Simultaneous A→B / B→C Transaction', 10, ctx.fontItalic)
  c.y -= 5

  c = drawClause(ctx, c, '1', 'TRANSACTION OVERVIEW', `This agreement documents a simultaneous double close (double escrow) for the property described below. Two separate closings will occur on the same date: (A→B) ${v(d,'seller_name')} sells the Property to Klose LLC; (B→C) Klose LLC sells the Property to ${v(d,'buyer_name')}. Both closings will be handled through ${v(d,'title_company')} on a simultaneous basis.`)

  c = drawClause(ctx, c, '2', 'PARTIES', `A→B Leg: Seller: ${v(d,'seller_name')} / Buyer: Klose LLC, a Wyoming Limited Liability Company. B→C Leg: Seller: Klose LLC / End Buyer: ${v(d,'buyer_name')}.`)

  c = drawClause(ctx, c, '3', 'PROPERTY', `${fullAddr || v(d,'property_address')}, including all fixtures, appliances, and permanently installed equipment.`)

  c = drawClause(ctx, c, '4', 'A→B PURCHASE PRICE — CONFIDENTIAL', `The purchase price for the A→B transaction (Seller to Klose LLC) is confidential and shall not be disclosed to the End Buyer. All proceeds shall be handled and disbursed by ${v(d,'title_company')} per simultaneous closing instructions.`)

  c = drawClause(ctx, c, '5', 'B→C PURCHASE PRICE', `The End Buyer shall purchase the Property from Klose LLC for: $ ${money(d.bc_price)}.`)

  c = drawClause(ctx, c, '6', 'NON-FINANCING / ALL CASH (A→B LEG)', `The A→B transaction is an all-cash transaction. Klose LLC shall use transactional/bridge funding or its own funds. Funding source: ${v(d,'transactional_funding','Self-funded / Hard Money')}.`)

  c = drawClause(ctx, c, '7', 'CLOSING', `Both transactions shall close simultaneously on or before ${v(d,'closing_date')}, within ${v(d,'closing_days','30')} business days from execution, at ${v(d,'title_company')}.`)

  // Page 2: Terms
  c = addPage(ctx)
  c = drawHeader(ctx, c)
  c.y -= 10

  c = drawClause(ctx, c, '8', 'PROPERTY CONDITION — AS-IS', 'Both transactions are as-is. The End Buyer acknowledges purchasing the Property in its present physical condition. Klose LLC makes no warranties regarding the condition of the Property.')

  c = drawClause(ctx, c, '9', 'TRANSACTIONAL FUNDING', 'Klose LLC may utilize transactional or bridge funding to fund the A→B leg. The End Buyer\'s funds from the B→C leg may be used by the Title Company to simultaneously fund and close the A→B leg. This is a lawful and accepted simultaneous closing practice.')

  c = drawClause(ctx, c, '10', 'CONFIDENTIALITY', 'The A→B purchase price is strictly confidential between the Seller and Klose LLC. Klose LLC\'s profit is derived from the difference between the two transaction prices. The End Buyer acknowledges this arrangement and agrees not to seek disclosure of the A→B price as a condition of closing.')

  c = drawClause(ctx, c, '11', 'TITLE POLICY', `Seller shall cause ${v(d,'title_company')} to issue an Owner\'s Policy of Title Insurance to the End Buyer in the amount of the B→C Purchase Price at or after simultaneous closing.`)

  c = drawClause(ctx, c, '12', 'POSSESSION', 'Possession shall be delivered to the End Buyer at simultaneous closing. Seller shall vacate the Property prior to the closing date.')

  c = drawClause(ctx, c, '13', 'DEFAULT', 'If Seller fails to perform the A→B closing, Klose LLC may seek specific performance or terminate. If End Buyer fails to perform the B→C closing, Klose LLC may terminate and retain any earnest money or option fees paid.')

  c = drawClause(ctx, c, '14', 'RESALE ACKNOWLEDGMENT', 'Seller acknowledges and consents that Klose LLC will simultaneously resell the Property and retains all profit from the B→C transaction. Seller understands Klose LLC is a real estate investor.')

  c = drawClause(ctx, c, '15', 'ENTIRE AGREEMENT', 'This contract contains the entire agreement of the parties and cannot be changed except by their written agreement.')

  c = drawClause(ctx, c, '16', 'SPECIAL PROVISIONS', v(d,'special_provisions','None'))

  // Page 3: Seller Signature (A→B leg)
  c = addPage(ctx)
  c = drawHeader(ctx, c)
  c.y -= 10
  c = drawCenteredText(ctx, c, 'A→B LEG — SELLER ACKNOWLEDGEMENT & SIGNATURE', 13)
  c.y -= 5

  c = drawParagraph(ctx, c, `Seller: ${v(d,'seller_name')}`)
  c = drawParagraph(ctx, c, `Property: ${v(d,'property_address')}`)
  c = drawParagraph(ctx, c, `Title Company: ${v(d,'title_company')}`)
  c = drawParagraph(ctx, c, `Simultaneous Closing Date: ${v(d,'closing_date')}`)
  c.y -= 10

  c = drawParagraph(ctx, c, 'I/We, the Seller, have read and understood this Double Close Agreement and agree to sell the Property to Klose LLC per the terms stated herein. I/We understand that Klose LLC will simultaneously resell the Property and acknowledge the confidentiality of the A→B purchase price.')
  c.y -= 10
  c = drawSignatureBlock(ctx, c, 'Seller Signature', v(d,'seller_name','_________________'), 'Buyer Signature', 'Klose LLC / Authorized Signatory')

  // Page 4: End Buyer Disclosures + B→C Signature
  buildInvestorDisclosurePage(ctx, 'End Buyer')

  // Override the last sig block for the DC B→C leg
  c = addPage(ctx)
  c = drawHeader(ctx, c)
  c.y -= 10
  c = drawCenteredText(ctx, c, 'B→C LEG — END BUYER SIGNATURE', 13)
  c.y -= 5

  c = drawParagraph(ctx, c, 'NOTICE OF NON-REPRESENTATION')
  c = drawParagraph(ctx, c, 'Klose LLC does not represent the End Buyer as a real estate broker or agent. End Buyer should seek independent representation prior to closing.')
  c.y -= 5
  c = drawCenteredText(ctx, c, 'FAIR HOUSING STATEMENT', 11)
  c = drawParagraph(ctx, c, 'It is illegal discrimination under the Federal Fair Housing Law, 42 U.S.C.A. 3601, to take any actions based on race, color, religion, sex, disability, familial status, or national origin.', 9)
  c.y -= 10

  c = drawParagraph(ctx, c, `End Buyer: ${v(d,'buyer_name')}`)
  c = drawParagraph(ctx, c, `B→C Purchase Price: $ ${money(d.bc_price)}`)
  c.y -= 5
  c = drawParagraph(ctx, c, 'By signing below, End Buyer acknowledges receipt of all disclosures, agrees to the B→C purchase terms, and understands the double close structure of this transaction.')
  c.y -= 10
  c = drawSignatureBlock(ctx, c, 'End Buyer Signature', v(d,'buyer_name','_________________'), 'Seller Signature', 'Klose LLC / Authorized Signatory')
}

function buildSellerResponsibilityPage(ctx: PdfCtx) {
  let c = addPage(ctx)
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
  c = drawSingleSigBlock(ctx, c, 'Seller Signature', v(ctx.data,'seller_name',''))
}
