import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { contractId, contractType, contractData, leadId } = await req.json()

    if (!contractId || !contractType || !contractData || !leadId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders })
    }

    // Fetch lead + property data
    const { data: lead } = await supabase
      .from('leads')
      .select('*, property:properties(*)')
      .eq('id', leadId)
      .single()

    if (!lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404, headers: corsHeaders })
    }

    const property = lead.property

    // Generate PDF content as HTML-styled text
    // We'll create a simple but professional PDF using basic text rendering
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    
    // Build contract text based on type
    let pdfContent = ''
    let fileName = ''

    if (contractType === 'AB') {
      fileName = `AB_Contract_${(property?.address || 'property').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      pdfContent = buildABContract(contractData, today)
    } else if (contractType === 'BC') {
      fileName = `BC_Contract_${(property?.address || 'property').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      pdfContent = buildBCContract(contractData, today)
    } else if (contractType === 'AMENDMENT') {
      fileName = `Amendment_${(property?.address || 'property').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      pdfContent = buildAmendment(contractData, today)
    }

    // Since we can't use pdf-lib in Deno edge functions easily, we'll generate
    // a simple HTML-based PDF approach. For now, store the contract data and 
    // generate a basic text file that can be converted client-side.
    
    // Store as a simple text/html file in storage
    const htmlContent = generateHTMLPdf(contractType, contractData, today, property)
    
    const filePath = `${contractId}/${fileName.replace('.pdf', '.html')}`
    
    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(filePath, new Blob([htmlContent], { type: 'text/html' }), {
        contentType: 'text/html',
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function generateHTMLPdf(type: string, data: Record<string, any>, date: string, property: any): string {
  const header = `
    <div style="background: #0a0a14; color: white; padding: 20px 30px; text-align: center; border-bottom: 3px solid #00d4aa;">
      <h1 style="margin: 0; font-size: 28px; letter-spacing: 4px;">KLOSE LLC</h1>
      <p style="margin: 5px 0 0; font-size: 12px; color: #aaa;">A Wyoming Limited Liability Company | Real Estate Investment</p>
      <p style="margin: 3px 0 0; font-size: 11px; color: #888;">EIN: 41-4409334</p>
    </div>
  `

  const sigBlock = `
    <div style="margin-top: 40px; display: flex; justify-content: space-between;">
      <div style="width: 45%;">
        <div style="border-bottom: 1px solid #333; height: 40px;"></div>
        <p style="font-size: 11px; color: #666;">Buyer Signature</p>
        <p style="font-size: 11px;"><strong>Klose LLC</strong> / Authorized Signatory</p>
        <p style="font-size: 11px;">Date: ____________</p>
      </div>
      <div style="width: 45%;">
        <div style="border-bottom: 1px solid #333; height: 40px;"></div>
        <p style="font-size: 11px; color: #666;">Seller Signature</p>
        <p style="font-size: 11px;">${data.seller_name || '_________________'}</p>
        <p style="font-size: 11px;">Date: ____________</p>
      </div>
    </div>
  `

  let body = ''

  if (type === 'AB') {
    body = buildABHTML(data, date, sigBlock)
  } else if (type === 'BC') {
    body = buildBCHTML(data, date, sigBlock)
  } else {
    body = buildAmendmentHTML(data, date, sigBlock)
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Klose LLC Contract</title>
  <style>
    @media print { body { margin: 0; } }
    body { font-family: 'Georgia', serif; font-size: 13px; line-height: 1.6; color: #222; max-width: 800px; margin: 0 auto; }
    .page { padding: 30px 40px; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    h2 { font-size: 18px; text-align: center; margin: 20px 0; text-transform: uppercase; letter-spacing: 1px; }
    h3 { font-size: 14px; margin: 15px 0 5px; }
    .clause { margin: 12px 0; text-align: justify; }
    .field { color: #0088aa; font-weight: bold; }
    .sig-line { border-bottom: 1px solid #333; width: 200px; display: inline-block; height: 20px; }
  </style>
</head>
<body>
${header}
${body}
</body>
</html>`
}

function buildABHTML(data: Record<string, any>, date: string, sigBlock: string): string {
  const fullAddress = `${data.property_address || '___'}, ${data.property_city || '___'}, ${data.property_county || '___'} County, ${data.property_state || '___'}`
  
  return `
<div class="page">
  <h2>STANDARD PURCHASE AND SALE AGREEMENT</h2>
  <h3 style="text-align:center;">"AS IS" CASH-OFFER</h3>

  <p class="clause"><strong>1. PARTIES:</strong> Klose LLC, a Wyoming Limited Liability Company (hereinafter "BUYER"), and <span class="field">${data.seller_name || '_______________'}</span> (hereinafter "SELLER"), which terms may be singular or plural and will include the heirs, successors, personal representatives, and assigns of Seller and Buyer, hereby agree that Seller will sell and Buyer will buy the following property, upon the following terms and conditions.</p>

  <p class="clause"><strong>2. PROPERTY:</strong><br/>
  (Street Address): <span class="field">${data.property_address || '_______________'}</span><br/>
  (City): <span class="field">${data.property_city || '_______________'}</span><br/>
  (County): <span class="field">${data.property_county || '_______________'}</span> (State): <span class="field">${data.property_state || '___'}</span><br/><br/>
  The Property includes the land and all appurtenant rights, privileges and easements, all buildings and fixtures, including without limitation, all of the following as are NOW on the Property: electrical, heating, cooling, plumbing, bathroom mirrors and fixtures, awnings, screens, storm windows and doors, landscaping, disposals, TV antennas, built-in electronics wiring, ceiling fans, smoke alarms, security systems, doorbells, thermostats, garage door openers and controls, attached carpeting, ranges/ovens, microwave ovens, kitchen refrigerators, dishwashers, air conditioners, water softeners, existing window treatments, satellite/TV reception systems, affixed gas/oil tanks not including fuel therein unless otherwise agreed by the parties. NOT Included: <span class="field">${data.not_included_items || 'None'}</span>. All property sold by this contract is called the "Property".</p>

  <p class="clause"><strong>3. CONTRACT TERMS:</strong><br/>
  Sale Price: $ <span class="field">${Number(data.sale_price || 0).toLocaleString()}</span></p>

  <p class="clause"><strong>4. NON-FINANCING / ALL CASH:</strong> This is an all-cash sale; no financing is involved, unless agreed upon in writing by both parties at a later date.</p>

  <p class="clause"><strong>5. CLOSING:</strong> Buyer will deliver contract to <span class="field">${data.title_company || '_______________'}</span> (the "Title Company") upon execution of the contract by both parties. Closing shall occur within <span class="field">${data.closing_days || '30'}</span> business days from the execution of this agreement, or within seven (7) days after objection to title has been cured, whichever date is later.</p>

  <p class="clause"><strong>6. TITLE POLICY:</strong> Seller shall furnish to Buyer at Buyer's expense an Owner's Policy of Title Insurance issued by the Title Company in the amount of the Sales Price, dated at or after closing, insuring Buyer against loss under the provisions of the Title Policy.</p>

  <p class="clause"><strong>7. PROPERTY CONDITION:</strong> The Buyer is purchasing the Property in an "AS-IS" condition subject to a <span class="field">${data.due_diligence_days || '10'}</span> – "AS-IS" SUBJECT TO Business Day Due Diligence Period. During Due Diligence, Buyer will need to access the property with Inspectors, Appraisers, Investors, Contractors, and potentially others. If Buyer determines, in its sole and absolute discretion, before the expiration of the Due Diligence Period that the Property is unacceptable for Buyer's purposes, Buyer shall have the right to terminate this Agreement by giving Seller written notice before the expiration of the Due Diligence Period.</p>

  <p class="clause"><strong>8. POSSESSION:</strong> The possession of the Property shall be delivered to the Buyer at closing. No exceptions, unless specifically agreed upon in writing by all parties.</p>

  <p class="clause"><strong>9. PRE-MARKETING AGREEMENT:</strong> If vacant, and upon acceptance of this contract by Seller, Seller is to furnish Buyer a key or combination to lockbox and give Buyer permission to enter the premises for inspections prior to closing. At Buyer's option, Buyer is allowed to display a For Sale or similar sign in front of the Property. Buyer has the right to market its contract interest in the Property in Buyer's sole discretion.</p>

  <p class="clause"><strong>10. PRORATIONS:</strong> Property Taxes, flood and hazard insurance, rents, maintenance fees, interest on any present loan, and any prepaid unearned mortgage insurance premium which is refundable in whole or in part shall be prorated through the Closing Date.</p>

  <p class="clause"><strong>11. PROPERTY DOCUMENTATION:</strong> Seller to furnish Buyer a General Warranty Deed conveying title subject only to liens securing payment of debt created as part of the consideration, taxes for the current year, restrictive covenants and utility easements common to the platted subdivision.</p>

  <p class="clause"><strong>12. CASUALTY LOSS:</strong> If any part of Property is damaged or destroyed by fire or other casualty loss, Seller shall restore the same to its previous condition as soon as reasonably possible, but in any event by Closing Date.</p>

  <p class="clause"><strong>13. DEFAULT:</strong> If Seller fails to comply herewith for any reason, Buyer may either (a) enforce specific performance hereof and seek such other relief as may be provided by law, or (b) terminate this contract, thereby releasing Seller from this contract.</p>

  <p class="clause"><strong>14. REPRESENTATIONS:</strong> Seller represents that as of the Closing Date (a) there will be no unrecorded liens, assessments, or Uniform Commercial Code Security interests against any of the Property, and (b) any loans will be without default.</p>

  <p class="clause"><strong>15. SALES EXPENSES:</strong><br/>
  A. Buyer's Expenses: Expenses stipulated to be paid by Buyer under other provisions of this contract.<br/>
  B. Seller's Expenses: Releases of existing liens, including prepayment penalties and recording fees; release of Seller's loan liability; tax statements or certificates; real estate transfer tax and/or conveyance fees.<br/>
  C. If Seller(s) fails to perform, they are responsible for any consequential damages.</p>

  <p class="clause"><strong>16. RESALE OF PROPERTY:</strong> Seller agrees that Buyer retains all profit, whether by note, trade, or cash, in the event of resale, simultaneous close, or assignment of this contract.</p>

  <p class="clause"><strong>17. ASSIGNMENT OF CONTRACT:</strong> Buyer may assign the contract. If assigned, all rights, interests, suits, claims, and titles in and to the contract will be assigned, and the Assignor will be released of all liability.</p>

  <p class="clause"><strong>18. HOLD HARMLESS AND ASSUMPTION OF LIABILITY:</strong> In the event the Seller has any damages or other liabilities caused by a third party, Buyer is to be held harmless by the Seller for these damages or other liabilities.</p>

  <p class="clause"><strong>19. ENTIRE AGREEMENT OF PARTIES:</strong> This contract contains the entire agreement of the parties and cannot be changed except by their written agreement.</p>

  <p class="clause"><strong>20. SPECIAL PROVISIONS:</strong><br/>
  <span class="field">${data.special_provisions || '_______________________________________________'}</span></p>

  <p style="margin-top: 10px;"><strong>Klose LLC</strong></p>
  ${sigBlock}
</div>

<!-- Preliminary Seller Information Worksheet -->
<div class="page">
  ${generateSellerWorksheetHTML(data)}
</div>

<!-- Investor Disclosure -->
<div class="page">
  ${generateInvestorDisclosureHTML(data, 'Seller')}
</div>

<!-- Fair Housing -->
<div class="page">
  ${generateFairHousingHTML(data, 'Seller')}
</div>

<!-- Notice of Non-Representation -->
<div class="page">
  ${generateNonRepresentationHTML(data, 'Seller')}
</div>

<!-- Authorization to Sign -->
<div class="page">
  ${generateAuthToSignHTML(data)}
</div>

<!-- Authorization for Release -->
<div class="page">
  ${generateReleaseAuthHTML(data)}
</div>

<!-- Seller's Responsibility -->
<div class="page">
  ${generateSellerResponsibilityHTML(data)}
</div>`
}

function buildBCHTML(data: Record<string, any>, date: string, sigBlock: string): string {
  const assigneeSigBlock = `
    <div style="margin-top: 40px; display: flex; justify-content: space-between;">
      <div style="width: 45%;">
        <div style="border-bottom: 1px solid #333; height: 40px;"></div>
        <p style="font-size: 11px; color: #666;">Assignor Signature</p>
        <p style="font-size: 11px;"><strong>Klose LLC</strong> / Authorized Signatory</p>
        <p style="font-size: 11px;">Date: ____________</p>
      </div>
      <div style="width: 45%;">
        <div style="border-bottom: 1px solid #333; height: 40px;"></div>
        <p style="font-size: 11px; color: #666;">Assignee Signature</p>
        <p style="font-size: 11px;">${data.assignee_name || '_________________'}</p>
        <p style="font-size: 11px;">Date: ____________</p>
      </div>
    </div>
  `

  return `
<div class="page">
  <h2>ASSIGNMENT OF "AS IS" CASH-OFFER PURCHASE AND SALE AGREEMENT</h2>

  <p class="clause"><strong>1. PARTIES:</strong> The undersigned Klose LLC, a Wyoming Limited Liability Company (the "ASSIGNOR"), having executed an "As Is" Cash-Offer Purchase and Sale Agreement (the "INITIAL PURCHASE AGREEMENT") with <span class="field">${data.seller_name || '_______________'}</span> (the "SELLER"), for the Property identified in Paragraph 2, hereby assigns and otherwise transfers all rights, title, and interest held by Assignor in said Property to <span class="field">${data.assignee_name || '_______________'}</span> (the "ASSIGNEE") in exchange for an Assignment Fee as described below.</p>

  <p class="clause"><strong>2. PROPERTY:</strong> <span class="field">${data.property_address || '_______________'}, ${data.property_city || ''}, ${data.property_state || ''}</span>, including all fixtures, appliances, other permanently installed equipment.</p>

  <p class="clause"><strong>3. AGREEMENT AND ASSIGNMENT TERMS:</strong> Assignee shall pay a gross amount of $ <span class="field">${Number(data.total_assignment_amount || 0).toLocaleString()}</span> (which shall include the purchase price in the Purchase and Sale Agreement being assigned and the Assignment Fee due to the Assignor).</p>

  <p class="clause"><strong>4. METHOD OF PAYMENT:</strong> ASSIGNEE warrants that at Closing they will have sufficient cash to complete the purchase. ASSIGNEE'S method of payment: <span class="field">${data.payment_method || '_______________'}</span>${data.lender_name ? `<br/>Lender: <span class="field">${data.lender_name}</span> Contact: <span class="field">${data.lender_contact || ''}</span> Email: <span class="field">${data.lender_email || ''}</span> Phone: <span class="field">${data.lender_phone || ''}</span>` : ''}</p>

  <p class="clause"><strong>5. CLOSING COSTS:</strong> ASSIGNEE expressly agrees to pay all closing costs associated with this transaction.</p>

  <p class="clause"><strong>6. ASSIGNEE REPRESENTATIONS:</strong> ASSIGNEE represents and acknowledges receipt of the INITIAL PURCHASE AGREEMENT prior to execution. ASSIGNEE further agrees to:<br/>
  1. Perform as required in good faith;<br/>
  2. Indemnify and hold harmless the ASSIGNOR from any claim;<br/>
  3. Indemnify and hold harmless the ASSIGNOR for any cost in junk removal;<br/>
  4. Waive any right to further assign this ASSIGNMENT;<br/>
  5. Acknowledge ASSIGNOR makes no warranty.</p>

  <p class="clause"><strong>7. ASSIGNOR REPRESENTATIONS:</strong> ASSIGNOR represents that the INITIAL PURCHASE AGREEMENT is in full force and effect and is fully assignable.</p>

  <p class="clause"><strong>8. CONDITION OF THE PROPERTY – "AS-IS":</strong> ASSIGNEE acknowledges purchasing the Property in its present physical condition. EXCEPT: <span class="field">${data.exceptions || 'None'}</span>.</p>

  <p class="clause"><strong>9. NON-REFUNDABLE OPTION FEE:</strong> ASSIGNEE has paid or will pay immediately upon execution a non-refundable Assignment Option Fee of $ <span class="field">${Number(data.option_fee || 0).toLocaleString()}</span> to <span class="field">${data.title_company || '_______________'}</span> (the "TITLE COMPANY").</p>

  <p class="clause"><strong>10. CLOSING:</strong> ASSIGNOR will deliver this ASSIGNMENT to the TITLE COMPANY. Closing shall occur on or before <span class="field">${data.closing_date || '_______________'}</span>.</p>

  <p class="clause"><strong>11. TITLE POLICY:</strong> The SELLER shall furnish to ASSIGNEE an Owner's Policy of Title Insurance.</p>

  <p class="clause"><strong>12. DEFAULT:</strong> If the ASSIGNOR is unable to perform, the ASSIGNEE'S sole remedy shall be limited to termination and return of the Non-Refundable Option Fee.</p>

  <p class="clause"><strong>13. MARKETABLE TITLE:</strong> This sale is contingent upon Seller obtaining marketable title. If unable, Seller shall return option money.</p>

  <p class="clause"><strong>14. HOLD HARMLESS:</strong> Assignee understands and assumes the risk of loss for any liability caused by a third-party action.</p>

  <p class="clause"><strong>15. ENTIRE AGREEMENT:</strong> This contract contains the entire agreement of the parties.</p>

  <p class="clause"><strong>16. SPECIAL PROVISIONS:</strong><br/>
  <span class="field">${data.special_provisions || '_______________________________________________'}</span></p>

  <p style="margin-top: 10px;"><strong>Klose LLC</strong></p>
  ${assigneeSigBlock}
</div>

<!-- Investor Disclosure (Buyer/Assignee version) -->
<div class="page">
  ${generateInvestorDisclosureHTML(data, 'Buyer/Assignee')}
</div>

<!-- Notice of Non-Representation (Buyer/Assignee version) -->
<div class="page">
  ${generateNonRepresentationHTML(data, 'Buyer/Assignee')}
</div>

<!-- Fair Housing -->
<div class="page">
  ${generateFairHousingHTML(data, 'Buyer/Assignee')}
</div>`
}

function buildAmendmentHTML(data: Record<string, any>, date: string, sigBlock: string): string {
  const sellerSigBlock = `
    <div style="margin-top: 40px;">
      <p><strong>The party(ies) below have signed and acknowledge receipt of a copy.</strong></p>
      <div style="display: flex; justify-content: space-between; margin-top: 20px;">
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid #333; height: 40px;"></div>
          <p style="font-size: 11px; color: #666;">SELLER Signature</p>
          <p style="font-size: 11px;">${data.seller_name || '_________________'}</p>
          <p style="font-size: 11px;">Date: ____________</p>
        </div>
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid #333; height: 40px;"></div>
          <p style="font-size: 11px; color: #666;">SELLER (2nd, if applicable)</p>
          <p style="font-size: 11px;">Printed Name</p>
          <p style="font-size: 11px;">Date: ____________</p>
        </div>
      </div>
    </div>
  `

  return `
<div class="page">
  <h2>AMENDMENT TO PURCHASE AND SALE AGREEMENT</h2>

  <p class="clause"><strong>Buyer:</strong> Klose LLC, a Wyoming Limited Liability Company</p>
  <p class="clause"><strong>Seller:</strong> <span class="field">${data.seller_name || '_______________'}</span></p>
  <p class="clause"><strong>Property:</strong> <span class="field">${data.property_address || '_______________'}</span></p>

  <p class="clause">In consideration of the mutual covenants herein and other good and valuable consideration, the parties agree to amend that certain Purchase and Sale Agreement with a Binding Agreement Date of <span class="field">${data.binding_agreement_date || '_______________'}</span> and any incorporated addenda, exhibits, or prior amendments (collectively referred to herein as "Agreement") as follows:</p>

  ${data.new_purchase_price ? `<p class="clause"><strong>Amendment 1 – Purchase Price:</strong><br/>Buyer & Seller hereby mutually agree to amend the purchase price to: $ <span class="field">${Number(data.new_purchase_price).toLocaleString()}</span></p>` : ''}

  ${data.new_closing_date ? `<p class="clause"><strong>Amendment 2 – Closing / Expiration / Due Diligence Date:</strong><br/>Buyer & Seller hereby mutually agree to amend the closing, contract expiration, and due diligence date to: <span class="field">${data.new_closing_date}</span></p>` : ''}

  ${data.additional_terms ? `<p class="clause"><strong>Amendment 3 – Additional Terms:</strong><br/><span class="field">${data.additional_terms}</span></p>` : ''}

  <p class="clause">This Amendment shall become binding when signed by all parties and shall be incorporated into the Agreement. All other terms and conditions of the Purchase and Sale Agreement shall remain in full force and effect.</p>

  <p><strong>The party(ies) below have signed and acknowledge receipt of a copy.</strong></p>
  ${sigBlock}
  ${sellerSigBlock}
</div>`
}

// Supporting document generators
function generateSellerWorksheetHTML(data: Record<string, any>): string {
  return `
  <div style="background: #0a0a14; color: white; padding: 15px 30px; text-align: center; border-bottom: 3px solid #00d4aa;">
    <h1 style="margin: 0; font-size: 24px; letter-spacing: 4px;">KLOSE LLC</h1>
  </div>
  <h2>PRELIMINARY SELLER INFORMATION WORKSHEET</h2>
  <h3>SELLER INFORMATION</h3>
  <p>Full Legal Name: <span class="field">${data.seller_name || '_______________'}</span></p>
  <p>Date of Birth: <span class="field">${data.seller_dob || '_______________'}</span></p>
  <p>Phone Number: <span class="field">${data.seller_phone || '_______________'}</span></p>
  <p>Email: <span class="field">${data.seller_email || '_______________'}</span></p>
  <p>Marital Status: <span class="field">${data.marital_status || '_______________'}</span></p>
  ${data.spouse_name ? `<p>Spouse Name: <span class="field">${data.spouse_name}</span></p>` : ''}
  <div style="margin-top: 40px; border-bottom: 1px solid #333; width: 250px; height: 30px;"></div>
  <p style="font-size: 11px; color: #666;">Seller Signature &nbsp;&nbsp;&nbsp;&nbsp; Date: ____________</p>`
}

function generateInvestorDisclosureHTML(data: Record<string, any>, role: string): string {
  return `
  <div style="background: #0a0a14; color: white; padding: 15px 30px; text-align: center; border-bottom: 3px solid #00d4aa;">
    <h1 style="margin: 0; font-size: 24px; letter-spacing: 4px;">KLOSE LLC</h1>
    <p style="margin: 3px 0 0; font-size: 11px; color: #aaa;">A Wyoming Limited Liability Company | Real Estate Investment</p>
    <p style="margin: 2px 0 0; font-size: 10px; color: #888;">EIN: 41-4409334</p>
  </div>
  <h2>WORKING WITH KLOSE LLC</h2>
  <h3 style="text-align:center;">INVESTOR DISCLOSURE STATEMENT</h3>
  <p class="clause">I, the undersigned, acknowledge and understand that Klose LLC ("Klose") is a for-profit real estate investment company organized under the laws of Wyoming. Accordingly, the undersigned acknowledges the following:</p>
  <p class="clause">1. Klose is a real estate investor and is NOT a licensed real estate broker or agent.</p>
  <p class="clause">2. Klose holds an equitable interest in the subject property through a Purchase and Sale Agreement.</p>
  <p class="clause">3. Klose is not currently the fee simple owner of the property at the time of assignment.</p>
  <p class="clause">4. This transaction is contingent upon Klose obtaining marketable title.</p>
  <p class="clause">5. Marketable title means the property's title is free from significant liens, disputes, or legal issues.</p>
  <p class="clause">6. The parties agree to use <span class="field">${data.title_company || '_______________'}</span> (Title Company) to determine marketable title.</p>
  <p class="clause">7. If unable to obtain marketable title, Klose shall return option/earnest money.</p>
  <p class="clause">8. The closing may occur through: (a) Assignment of Contract, (b) Simultaneous Closing, or (c) Traditional Purchase.</p>
  <p class="clause">9. This property is sold as-is, where-is.</p>
  <p class="clause">10. The undersigned is encouraged to seek independent legal counsel.</p>
  <h3>ACKNOWLEDGMENT</h3>
  <p class="clause">I/We have read and understand this disclosure.</p>
  <div style="margin-top: 30px; border-bottom: 1px solid #333; width: 250px; height: 30px;"></div>
  <p style="font-size: 11px; color: #666;">${role} Signature &nbsp;&nbsp;&nbsp;&nbsp; Date: ____________</p>`
}

function generateFairHousingHTML(data: Record<string, any>, role: string): string {
  return `
  <div style="background: #0a0a14; color: white; padding: 15px 30px; text-align: center; border-bottom: 3px solid #00d4aa;">
    <h1 style="margin: 0; font-size: 24px; letter-spacing: 4px;">KLOSE LLC</h1>
    <p style="margin: 3px 0 0; font-size: 11px; color: #aaa;">A Wyoming Limited Liability Company | Real Estate Investment</p>
    <p style="margin: 2px 0 0; font-size: 10px; color: #888;">EIN: 41-4409334</p>
  </div>
  <h2>FAIR HOUSING STATEMENT & AFFILIATED BUSINESS DISCLOSURE</h2>
  <h3>FAIR HOUSING STATEMENT</h3>
  <p class="clause" style="font-size: 11px;">It is illegal discrimination under the Federal Fair Housing Law, 42 U.S.C.A. 3601 to take any of the following actions because of race, color, religion, sex (including gender identity and sexual orientation), disability, familial status, or national origin: Refuse to rent or sell housing; Refuse to negotiate for housing; Set different terms, conditions or privileges for sale or rental of a dwelling; Provide different housing services or facilities; Falsely deny that housing is available for inspection, sale or rental; Make, print or publish any notice, statement or advertisement indicating any preference, limitation or discrimination.</p>
  <h3>AFFILIATED BUSINESS DISCLOSURE</h3>
  <p class="clause" style="font-size: 11px;">Klose LLC and/or its affiliated companies may have relationships with certain service providers, including title companies and lenders. You are NOT required to use any specific title company, lender, or settlement service provider as a condition of your purchase or sale.</p>
  <div style="margin-top: 30px; border-bottom: 1px solid #333; width: 250px; height: 30px;"></div>
  <p style="font-size: 11px; color: #666;">${role} Signature &nbsp;&nbsp;&nbsp;&nbsp; Date: ____________</p>`
}

function generateNonRepresentationHTML(data: Record<string, any>, role: string): string {
  return `
  <div style="background: #0a0a14; color: white; padding: 15px 30px; text-align: center; border-bottom: 3px solid #00d4aa;">
    <h1 style="margin: 0; font-size: 24px; letter-spacing: 4px;">KLOSE LLC</h1>
    <p style="margin: 3px 0 0; font-size: 11px; color: #aaa;">A Wyoming Limited Liability Company | Real Estate Investment</p>
    <p style="margin: 2px 0 0; font-size: 10px; color: #888;">EIN: 41-4409334</p>
  </div>
  <h2>NOTICE OF NON-REPRESENTATION</h2>
  <p class="clause">You are hereby notified that Klose LLC and its members, managers, and employees do not represent you in any capacity as a real estate broker or agent.</p>
  <p class="clause">You should not assume that any representative of Klose LLC represents your interests unless you separately engage a licensed real estate agent or attorney. You are advised not to disclose any information you want held in confidence until you decide on representation.</p>
  <p class="clause">Your signature below acknowledges receipt of this notice and does not establish a brokerage relationship.</p>
  <div style="margin-top: 30px; border-bottom: 1px solid #333; width: 250px; height: 30px;"></div>
  <p style="font-size: 11px; color: #666;">${role} Signature &nbsp;&nbsp;&nbsp;&nbsp; Date: ____________</p>`
}

function generateAuthToSignHTML(data: Record<string, any>): string {
  return `
  <div style="background: #0a0a14; color: white; padding: 15px 30px; text-align: center; border-bottom: 3px solid #00d4aa;">
    <h1 style="margin: 0; font-size: 24px; letter-spacing: 4px;">KLOSE LLC</h1>
    <p style="margin: 3px 0 0; font-size: 11px; color: #aaa;">A Wyoming Limited Liability Company | Real Estate Investment</p>
    <p style="margin: 2px 0 0; font-size: 10px; color: #888;">EIN: 41-4409334</p>
  </div>
  <h2>AUTHORIZATION TO SIGN LISTING DOCUMENTS AND OFFERS</h2>
  <h3 style="text-align:center;">(Special Limited Power of Attorney)</h3>
  <p class="clause">BE IT ACKNOWLEDGED that I/we, <span class="field">${data.seller_name || '_______________'}</span>, the "Seller", desire to execute and grant a SPECIAL LIMITED POWER OF ATTORNEY, hereby appointing Klose LLC, a Wyoming Limited Liability Company, as my Attorney-in-Fact to act as follows, GRANTING unto my Attorney-in-Fact full power to:</p>
  <p class="clause">Do all things necessary to close on the sale of the property commonly known as <span class="field">${data.property_address || '_______________'}</span> (hereinafter "Property"), with full power and authority for me and my name to execute any and all documents necessary to list, market, and contract the Property on the Multiple Listing Services ("MLS"), investor networks, Zillow, and/or realtors for the purpose of marketing and selling the Property.</p>
  <p class="clause">This authorization is effective upon execution and shall be valid until such time as any revocation is executed.</p>
  <div style="margin-top: 30px; border-bottom: 1px solid #333; width: 250px; height: 30px;"></div>
  <p style="font-size: 11px; color: #666;">Seller Signature &nbsp;&nbsp;&nbsp;&nbsp; Date: ____________</p>`
}

function generateReleaseAuthHTML(data: Record<string, any>): string {
  return `
  <div style="background: #0a0a14; color: white; padding: 15px 30px; text-align: center; border-bottom: 3px solid #00d4aa;">
    <h1 style="margin: 0; font-size: 24px; letter-spacing: 4px;">KLOSE LLC</h1>
    <p style="margin: 3px 0 0; font-size: 11px; color: #aaa;">A Wyoming Limited Liability Company | Real Estate Investment</p>
    <p style="margin: 2px 0 0; font-size: 10px; color: #888;">EIN: 41-4409334</p>
  </div>
  <h2>AUTHORIZATION FOR THE RELEASE OF INFORMATION</h2>
  <p class="clause">1. I/We have entered into a real property sales contract. As part of this process, <span class="field">${data.title_company || '_______________'}</span> (Title Company) may request information related to my current open mortgage(s), judgments, and other documents required in connection with and in preparation of a closing.</p>
  <p class="clause">2. I/We authorize you to provide to the Title Company any and all information and documentation they request, including but not limited to: judgment and lien payoffs, payoff information on open mortgages, deeds of trust, etc.</p>
  <p class="clause">3. The Title Company or any title company substituted in their place may address this authorization to any party named in the loan application or related to any outstanding liens on the property.</p>
  <p class="clause">4. I agree to hold the Title Company and its agents and employees harmless for any judgment or lien payoff obtained that differs from one obtained independently.</p>
  <p class="clause">5. A copy of this authorization may be accepted as an original.</p>
  <div style="margin-top: 30px; display: flex; justify-content: space-between;">
    <div style="width: 45%;">
      <div style="border-bottom: 1px solid #333; height: 30px;"></div>
      <p style="font-size: 11px; color: #666;">Seller Signature</p>
    </div>
    <div style="width: 45%;">
      <div style="border-bottom: 1px solid #333; height: 30px;"></div>
      <p style="font-size: 11px; color: #666;">SSN (if required by title company)</p>
    </div>
  </div>
  <p style="font-size: 11px;">Seller Printed Name: <span class="field">${data.seller_name || '_______________'}</span></p>
  <p style="font-size: 11px;">Date: ____________</p>`
}

function generateSellerResponsibilityHTML(data: Record<string, any>): string {
  return `
  <div style="background: #0a0a14; color: white; padding: 15px 30px; text-align: center; border-bottom: 3px solid #00d4aa;">
    <h1 style="margin: 0; font-size: 24px; letter-spacing: 4px;">KLOSE LLC</h1>
    <p style="margin: 3px 0 0; font-size: 11px; color: #aaa;">A Wyoming Limited Liability Company | Real Estate Investment</p>
    <p style="margin: 2px 0 0; font-size: 10px; color: #888;">EIN: 41-4409334</p>
  </div>
  <h2>SELLER'S RESPONSIBILITY ACKNOWLEDGEMENT</h2>
  <h3>15. SALES EXPENSES:</h3>
  <p class="clause">The following expenses shall be paid at or prior to closing:</p>
  <p class="clause">A. Buyer's Expenses: Expenses stipulated to be paid by Buyer under other provisions of this contract.</p>
  <p class="clause">B. Seller's Expenses: Releases of existing liens, including prepayment penalties and recording fees; release of Seller's loan liability; tax statements or certificates; real estate transfer tax and/or conveyance fees.</p>
  <p class="clause">C. If Seller(s) fails to perform, they are responsible for any consequential damages, including indirect expenses, incurred by Buyer or Buyer's assignee.</p>
  <p class="clause">To facilitate a clear title transfer, the Seller is required to pay off any outstanding mortgages, utility bills, property taxes, assessments, judgments, legal fees, and any other lien or encumbrance on the property.</p>
  <p class="clause">Klose LLC's cash offer is based on the assumption that the Seller will use the proceeds from the sale of their property to cover the above-described expenses.</p>
  <p class="clause"><strong>Klose LLC is not responsible for directly paying any liens, property taxes, or any other cost discovered in the title examination.</strong></p>
  <p class="clause">By signing this Acknowledgement, I/we confirm that: (i) I/we have carefully read, fully understand, and agree to all terms and conditions herein; (ii) this Acknowledgement constitutes the entire understanding between me/us and Klose LLC regarding my/our payment obligations associated with selling the property; and (iii) my/our payment obligations for the items outlined above will be deducted from the total purchase price.</p>
  <div style="margin-top: 30px; border-bottom: 1px solid #333; width: 250px; height: 30px;"></div>
  <p style="font-size: 11px; color: #666;">Seller Signature</p>
  <p style="font-size: 11px;">Seller Printed Name: <span class="field">${data.seller_name || '_______________'}</span></p>
  <p style="font-size: 11px;">Date: ____________</p>`
}

// Placeholder functions used by main build functions
function buildABContract(data: Record<string, any>, date: string): string { return '' }
function buildBCContract(data: Record<string, any>, date: string): string { return '' }
function buildAmendment(data: Record<string, any>, date: string): string { return '' }
