// Issues a premium Academy certificate PDF when a user completes a track at 100%
// Idempotent: if already issued, returns the existing certificate.
// Auto-issues the MASTER certificate when all 4 tracks have individual certificates.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'https://esm.sh/pdf-lib@1.17.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Landscape A4 (more diploma-like proportions than US Letter)
const PAGE_W = 842
const PAGE_H = 595

// Brand palette (HSL converted to RGB approximations)
const INK = rgb(0.06, 0.07, 0.12)        // #0F1220 - deep navy ink
const PAPER = rgb(0.99, 0.98, 0.95)      // #FCFAF2 - warm cream
const GOLD = rgb(0.78, 0.62, 0.20)       // #C79E33 - antique gold
const GOLD_DEEP = rgb(0.55, 0.42, 0.10)  // #8C6B1A - deep gold
const MUTED = rgb(0.45, 0.42, 0.38)      // soft sepia gray
const ACCENT = rgb(0.10, 0.30, 0.45)     // deep teal-blue accent

type CertificateType = 'foundations' | 'closer' | 'scaler' | 'creative_finance' | 'master'

interface TrackMeta {
  type: CertificateType
  title: string
  subtitle: string
  honor: string
  trackSlug: string | null // null = master (aggregates all)
}

const CERT_META: Record<CertificateType, TrackMeta> = {
  foundations: {
    type: 'foundations',
    title: 'Klose Wholesaling Fundamentals',
    subtitle: 'Foundations Track',
    honor: 'has demonstrated mastery of the foundational principles, ethics, and core mechanics of real estate wholesaling',
    trackSlug: 'foundations',
  },
  closer: {
    type: 'closer',
    title: 'Klose Certified Closer',
    subtitle: 'Closer Track',
    honor: 'has demonstrated advanced negotiation, objection handling, and contract execution skills required to close motivated seller deals',
    trackSlug: 'closer',
  },
  scaler: {
    type: 'scaler',
    title: 'Klose Certified Scaler',
    subtitle: 'Scaler Track',
    honor: 'has demonstrated the strategic, operational, and dispositions expertise required to scale a wholesaling operation',
    trackSlug: 'scaler',
  },
  creative_finance: {
    type: 'creative_finance',
    title: 'Klose Creative Finance Specialist',
    subtitle: 'Creative Finance Mastery Track',
    honor: 'has demonstrated specialist-level command of Subject-To, Seller Finance, Wraps, Novations, and Hybrid creative acquisition strategies',
    trackSlug: 'creative-finance',
  },
  master: {
    type: 'master',
    title: 'Master of Creative Finance & Wholesaling',
    subtitle: 'Klose Academy — Highest Distinction',
    honor: 'has completed every track of the Klose Academy with full distinction, mastering Foundations, Closer, Scaler, and Creative Finance',
    trackSlug: null,
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonRes({ error: 'Missing authorization' }, 401)
    }
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) {
      return jsonRes({ error: 'Unauthorized' }, 401)
    }

    const body = await req.json().catch(() => ({}))
    const requestedType = body.certificateType as CertificateType | undefined

    // If specific type requested → try to issue that one. Otherwise auto-detect what user qualifies for.
    const typesToCheck: CertificateType[] = requestedType
      ? [requestedType]
      : ['foundations', 'closer', 'scaler', 'creative_finance']

    const issued: any[] = []
    for (const t of typesToCheck) {
      const result = await issueIfQualified(supabase, user.id, t)
      if (result) issued.push(result)
    }

    // After issuing track-level certs, check if user qualifies for the MASTER
    const masterResult = await issueIfQualified(supabase, user.id, 'master')
    if (masterResult) issued.push(masterResult)

    return jsonRes({ ok: true, issued })
  } catch (e) {
    console.error('issue-certificate error:', e)
    return jsonRes({ error: (e as Error).message }, 500)
  }
})

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function issueIfQualified(
  supabase: any,
  userId: string,
  certType: CertificateType
) {
  const meta = CERT_META[certType]

  // Already issued?
  const { data: existing } = await supabase
    .from('academy_certificates')
    .select('*')
    .eq('user_id', userId)
    .eq('certificate_type', certType)
    .maybeSingle()
  if (existing) return null // skip — already has it

  // Get recipient name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('user_id', userId)
    .maybeSingle()
  const recipientName = (profile?.full_name as string | null)?.trim() || 'Klose Academy Graduate'

  let totalXp = 0
  let totalLessons = 0
  let qualifies = false

  if (certType === 'master') {
    // Master = user has individual certificates for all 4 tracks
    const { data: certs } = await supabase
      .from('academy_certificates')
      .select('certificate_type, total_xp_earned, total_lessons_completed')
      .eq('user_id', userId)
      .in('certificate_type', ['foundations', 'closer', 'scaler', 'creative_finance'])
    if (!certs || certs.length < 4) return null
    qualifies = true
    totalXp = certs.reduce((s: number, c: any) => s + (c.total_xp_earned ?? 0), 0)
    totalLessons = certs.reduce((s: number, c: any) => s + (c.total_lessons_completed ?? 0), 0)
  } else {
    // Track cert = user completed 100% of that track's published lessons
    const { data: track } = await supabase
      .from('academy_tracks')
      .select('id')
      .eq('slug', meta.trackSlug!)
      .maybeSingle()
    if (!track) return null

    const { data: lessons } = await supabase
      .from('academy_lessons')
      .select('id, xp_reward')
      .eq('track_id', track.id)
      .eq('is_published', true)
    if (!lessons || lessons.length === 0) return null

    const lessonIds = lessons.map((l: any) => l.id)
    const { data: progress } = await supabase
      .from('academy_lesson_progress')
      .select('lesson_id, xp_earned, status')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds)
      .eq('status', 'completed')

    const completedIds = new Set((progress ?? []).map((p: any) => p.lesson_id))
    if (completedIds.size < lessonIds.length) return null // not 100%
    qualifies = true
    totalLessons = lessons.length
    totalXp = lessons.reduce((s: number, l: any) => s + (l.xp_reward ?? 0), 0)
  }

  if (!qualifies) return null

  // Generate certificate number
  const { data: certNumber } = await supabase.rpc('generate_certificate_number', { _cert_type: certType })
  if (!certNumber) throw new Error('Failed to generate certificate number')

  const issuedAt = new Date()

  // Render PDF
  const pdfBytes = await renderCertificatePdf({
    certType,
    certNumber,
    recipientName,
    issuedAt,
    totalXp,
    totalLessons,
  })

  // Upload to storage: {userId}/{certType}-{certNumber}.pdf
  const path = `${userId}/${certType}-${certNumber}.pdf`
  const { error: upErr } = await supabase.storage
    .from('academy-certificates')
    .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true })
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

  // Insert certificate record
  const { data: row, error: insErr } = await supabase
    .from('academy_certificates')
    .insert({
      user_id: userId,
      certificate_type: certType,
      track_id: certType === 'master' ? null : await getTrackId(supabase, meta.trackSlug!),
      certificate_number: certNumber,
      recipient_name: recipientName,
      total_xp_earned: totalXp,
      total_lessons_completed: totalLessons,
      pdf_path: path,
      issued_at: issuedAt.toISOString(),
    })
    .select()
    .single()
  if (insErr) throw new Error(`Insert failed: ${insErr.message}`)

  return row
}

async function getTrackId(supabase: any, slug: string) {
  const { data } = await supabase.from('academy_tracks').select('id').eq('slug', slug).maybeSingle()
  return data?.id ?? null
}

// =====================================================================
// PDF RENDERING — premium landscape diploma
// =====================================================================
interface RenderArgs {
  certType: CertificateType
  certNumber: string
  recipientName: string
  issuedAt: Date
  totalXp: number
  totalLessons: number
}

async function renderCertificatePdf(args: RenderArgs): Promise<Uint8Array> {
  const meta = CERT_META[args.certType]
  const isMaster = args.certType === 'master'

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([PAGE_W, PAGE_H])

  const fontRegular = await pdf.embedFont(StandardFonts.HelveticaOblique)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const fontSerif = await pdf.embedFont(StandardFonts.TimesRoman)
  const fontSerifBold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const fontSerifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic)

  // Background
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAPER })

  // Outer ornate border (double frame)
  drawDoubleBorder(page, isMaster)

  // Corner ornaments
  drawCornerOrnaments(page, isMaster)

  // Top monogram / seal area
  drawHeader(page, fontBold, fontSerifBold, isMaster)

  // Recipient block
  const centerX = PAGE_W / 2

  // "This certificate is presented to"
  drawCenteredText(
    page,
    'This Certificate is Proudly Presented to',
    centerX,
    PAGE_H - 200,
    fontSerifItalic,
    14,
    MUTED
  )

  // Recipient name (large, serif, gold underline)
  const nameSize = args.recipientName.length > 30 ? 36 : 44
  drawCenteredText(page, args.recipientName, centerX, PAGE_H - 252, fontSerifBold, nameSize, INK)

  // Decorative gold flourish under name
  drawNameUnderline(page, centerX, PAGE_H - 268)

  // Honor statement (wrapped)
  const honorY = PAGE_H - 305
  drawCenteredWrapped(
    page,
    `who ${meta.honor}, having completed ${args.totalLessons} lessons and earned ${args.totalXp.toLocaleString()} XP within the Klose Academy.`,
    centerX,
    honorY,
    fontSerif,
    12,
    INK,
    560,
    16
  )

  // Award title block (the certificate itself)
  drawAwardBlock(page, fontSerifBold, fontSerif, meta.title, meta.subtitle, isMaster)

  // Footer signatures + cert number + date
  drawFooter(page, fontBold, fontRegular, fontSerifItalic, args.certNumber, args.issuedAt, isMaster)

  return await pdf.save()
}

// ---------------------------------------------------------------------
function drawDoubleBorder(page: PDFPage, isMaster: boolean) {
  const goldColor = isMaster ? GOLD_DEEP : GOLD
  // Outer thin frame
  page.drawRectangle({
    x: 24,
    y: 24,
    width: PAGE_W - 48,
    height: PAGE_H - 48,
    borderColor: goldColor,
    borderWidth: 1.5,
  })
  // Inner thicker frame
  page.drawRectangle({
    x: 36,
    y: 36,
    width: PAGE_W - 72,
    height: PAGE_H - 72,
    borderColor: goldColor,
    borderWidth: 0.6,
  })
  // Master gets a third hairline frame for extra prestige
  if (isMaster) {
    page.drawRectangle({
      x: 44,
      y: 44,
      width: PAGE_W - 88,
      height: PAGE_H - 88,
      borderColor: GOLD,
      borderWidth: 0.4,
    })
  }
}

function drawCornerOrnaments(page: PDFPage, isMaster: boolean) {
  const color = isMaster ? GOLD_DEEP : GOLD
  const size = 18
  const offset = 36

  // Four corners — small squared diamonds
  const corners = [
    [offset, offset],
    [PAGE_W - offset, offset],
    [offset, PAGE_H - offset],
    [PAGE_W - offset, PAGE_H - offset],
  ]
  for (const [cx, cy] of corners) {
    // Small rotated square
    page.drawRectangle({
      x: cx - size / 2,
      y: cy - size / 2,
      width: size,
      height: size,
      borderColor: color,
      borderWidth: 0.8,
      rotate: { type: 'degrees' as any, angle: 45 },
    })
    page.drawCircle({ x: cx, y: cy, size: 2, color })
  }
}

function drawHeader(
  page: PDFPage,
  fontBold: PDFFont,
  fontSerifBold: PDFFont,
  isMaster: boolean
) {
  const centerX = PAGE_W / 2
  const topY = PAGE_H - 70

  // KLOSE wordmark
  drawCenteredText(page, 'KLOSE', centerX, topY, fontSerifBold, 28, INK)

  // Tracking dots either side of wordmark
  page.drawCircle({ x: centerX - 80, y: topY + 10, size: 2, color: GOLD })
  page.drawCircle({ x: centerX + 80, y: topY + 10, size: 2, color: GOLD })

  // Subtitle
  drawCenteredText(page, 'A C A D E M Y', centerX, topY - 18, fontBold, 9, MUTED)

  // Banner
  const bannerText = isMaster ? '— Highest Distinction —' : '— Certificate of Completion —'
  drawCenteredText(page, bannerText, centerX, topY - 50, fontSerifBold, 12, isMaster ? GOLD_DEEP : ACCENT)
}

function drawNameUnderline(page: PDFPage, centerX: number, y: number) {
  const w = 360
  // Center decorative line with diamond in the middle
  page.drawLine({
    start: { x: centerX - w / 2, y },
    end: { x: centerX - 12, y },
    thickness: 0.8,
    color: GOLD,
  })
  page.drawLine({
    start: { x: centerX + 12, y },
    end: { x: centerX + w / 2, y },
    thickness: 0.8,
    color: GOLD,
  })
  // Center diamond
  page.drawRectangle({
    x: centerX - 4,
    y: y - 4,
    width: 8,
    height: 8,
    color: GOLD,
    rotate: { type: 'degrees' as any, angle: 45 },
  })
}

function drawAwardBlock(
  page: PDFPage,
  fontSerifBold: PDFFont,
  fontSerif: PDFFont,
  title: string,
  subtitle: string,
  isMaster: boolean
) {
  const centerX = PAGE_W / 2
  const y = 200

  // "is hereby awarded the title of"
  drawCenteredText(page, 'is hereby awarded the title of', centerX, y + 50, fontSerif, 11, MUTED)

  // Title (large)
  const titleSize = title.length > 35 ? 22 : 26
  drawCenteredText(page, title, centerX, y + 22, fontSerifBold, titleSize, isMaster ? GOLD_DEEP : INK)

  // Subtitle
  drawCenteredText(page, subtitle, centerX, y, fontSerif, 11, MUTED)
}

function drawFooter(
  page: PDFPage,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  fontSerifItalic: PDFFont,
  certNumber: string,
  issuedAt: Date,
  isMaster: boolean
) {
  const sigY = 110
  const leftX = 150
  const rightX = PAGE_W - 150

  // Left signature: Sergio Mantilla — Managing Member
  page.drawLine({
    start: { x: leftX - 80, y: sigY },
    end: { x: leftX + 80, y: sigY },
    thickness: 0.6,
    color: INK,
  })
  drawCenteredText(page, 'Sergio Mantilla', leftX, sigY + 6, fontSerifItalic, 14, INK)
  drawCenteredText(page, 'Managing Member · Klose LLC', leftX, sigY - 14, fontRegular, 8, MUTED)

  // Right signature: Klose Academy seal area
  page.drawLine({
    start: { x: rightX - 80, y: sigY },
    end: { x: rightX + 80, y: sigY },
    thickness: 0.6,
    color: INK,
  })
  drawCenteredText(page, 'Klose Academy', rightX, sigY + 6, fontSerifItalic, 14, INK)
  drawCenteredText(page, 'Director of Education', rightX, sigY - 14, fontRegular, 8, MUTED)

  // Center seal (gold concentric circles)
  const centerX = PAGE_W / 2
  const sealColor = isMaster ? GOLD_DEEP : GOLD
  page.drawCircle({ x: centerX, y: sigY + 4, size: 32, borderColor: sealColor, borderWidth: 1.2 })
  page.drawCircle({ x: centerX, y: sigY + 4, size: 26, borderColor: sealColor, borderWidth: 0.5 })
  drawCenteredText(page, 'KL', centerX, sigY + 6, fontBold, 16, sealColor)
  drawCenteredText(page, isMaster ? 'MASTER' : 'CERTIFIED', centerX, sigY - 8, fontBold, 5, sealColor)

  // Bottom: cert number + verification + date
  const bottomY = 60
  drawCenteredText(
    page,
    `Certificate No. ${certNumber}  ·  Issued ${issuedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`,
    centerX,
    bottomY,
    fontRegular,
    8,
    MUTED
  )
  drawCenteredText(
    page,
    `Verify authenticity at goklose.com/verify/${certNumber}`,
    centerX,
    bottomY - 12,
    fontRegular,
    7,
    MUTED
  )
}

// =====================================================================
// Text helpers
// =====================================================================
function drawCenteredText(
  page: PDFPage,
  text: string,
  centerX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>
) {
  const w = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: centerX - w / 2, y, size, font, color })
}

function drawCenteredWrapped(
  page: PDFPage,
  text: string,
  centerX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const probe = current ? `${current} ${w}` : w
    if (font.widthOfTextAtSize(probe, size) > maxWidth) {
      lines.push(current)
      current = w
    } else {
      current = probe
    }
  }
  if (current) lines.push(current)
  lines.forEach((line, i) => {
    drawCenteredText(page, line, centerX, y - i * lineHeight, font, size, color)
  })
}
