# ============================================================
# AI Agents Test Suite — goklose.com
# Run from PowerShell: .\supabase\functions\test-agents.ps1
#
# Tests function reachability + error responses.
# Twilio/ElevenLabs tests require valid secrets deployed.
# ============================================================

$BASE = "https://nbswprixtajseabjbrre.supabase.co/functions/v1"
$ANON  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ic3dwcml4dGFqc2VhYmpicnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjU2NjksImV4cCI6MjA4MTQwMTY2OX0.wjFtF8XFiWjQg0VSUlzDPyO_ax-oOeave033m0KbL8I"

$pass = 0; $fail = 0

function Test-Agent {
  param($name, $url, $method, $body, $headers, $expectStatus, $expectField)
  try {
    $params = @{ Uri = $url; Method = $method; Headers = $headers; ErrorAction = "Stop" }
    if ($body) { $params.Body = ($body | ConvertTo-Json); $params.ContentType = "application/json" }
    $r = Invoke-WebRequest @params -UseBasicParsing
    $status = $r.StatusCode
    $json = $r.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
    $fieldOk = !$expectField -or ($r.Content -match $expectField)
    if ($status -eq $expectStatus -and $fieldOk) {
      Write-Host "  PASS [$name] HTTP $status" -ForegroundColor Green; $script:pass++
    } else {
      Write-Host "  FAIL [$name] Expected HTTP $expectStatus got $status | content: $($r.Content.Substring(0,[Math]::Min(200,$r.Content.Length)))" -ForegroundColor Red; $script:fail++
    }
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    $errBody = ""
    try { $errBody = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() } catch {}
    if ($code -eq $expectStatus) {
      Write-Host "  PASS [$name] HTTP $code (expected error)" -ForegroundColor Green; $script:pass++
    } else {
      Write-Host "  FAIL [$name] Expected $expectStatus got $code | $errBody" -ForegroundColor Red; $script:fail++
    }
  }
}

$authHeader = @{ "Authorization" = "Bearer $ANON"; "apikey" = $ANON }
$noAuth     = @{ "apikey" = $ANON }

# ── AGENT 1: send-campaign-sms ────────────────────────────────
Write-Host "`n== AGENT 1: send-campaign-sms ==" -ForegroundColor Cyan

# No auth → 401
Test-Agent "sms-no-auth" "$BASE/send-campaign-sms" "POST" @{to="+12055550000";message="test"} $noAuth 401 $null

# No body fields → 400 (user auth required first — with anon key this gets 401 too)
Test-Agent "sms-missing-fields" "$BASE/send-campaign-sms" "POST" @{} $authHeader 400 $null

# Invalid phone format → 400
Test-Agent "sms-bad-phone" "$BASE/send-campaign-sms" "POST" @{to="not-a-phone";message="hi"} $authHeader 400 "Invalid phone"

# ── AGENT 2: twilio-webhook ────────────────────────────────────
Write-Host "`n== AGENT 2: twilio-webhook ==" -ForegroundColor Cyan

# GET → 405
Test-Agent "webhook-get-blocked" "$BASE/twilio-webhook" "GET" $null $noAuth 405 $null

# POST empty body (no signature, should process without crashing if TWILIO_WEBHOOK_URL not set)
Test-Agent "webhook-post-empty" "$BASE/twilio-webhook" "POST" $null @{"Content-Type"="application/x-www-form-urlencoded"} 204 $null

# ── AGENT 3: process-sms-sequences ────────────────────────────
Write-Host "`n== AGENT 3: process-sms-sequences ==" -ForegroundColor Cyan

# No Twilio secrets → runs but sends 0 (returns stats JSON)
Test-Agent "sequences-run" "$BASE/process-sms-sequences" "POST" @{} $authHeader 200 $null

# ── AGENT 4: elevenlabs-conversation-token ────────────────────
Write-Host "`n== AGENT 4: elevenlabs-conversation-token ==" -ForegroundColor Cyan

# No auth → 401
Test-Agent "elevenlabs-no-auth" "$BASE/elevenlabs-conversation-token" "POST" @{mode="live";lead_id="00000000-0000-0000-0000-000000000000"} $noAuth 401 $null

# Missing lead_id in live mode → 400
Test-Agent "elevenlabs-missing-lead" "$BASE/elevenlabs-conversation-token" "POST" @{mode="live"} $authHeader 400 "lead_id required"

# ── AGENT 5: generate-outreach-drafts ─────────────────────────
Write-Host "`n== AGENT 5: generate-outreach-drafts ==" -ForegroundColor Cyan

# Run (no ANTHROPIC_API_KEY deployed → 503, or 200 with 0 generated)
Test-Agent "drafts-run" "$BASE/generate-outreach-drafts" "POST" @{} $authHeader 200 $null

# ── AGENT 6: process-propwire-import ──────────────────────────
Write-Host "`n== AGENT 6: process-propwire-import ==" -ForegroundColor Cyan

# No CSV in bucket → status no_files or already_processed
Test-Agent "propwire-no-file" "$BASE/process-propwire-import" "POST" @{} $authHeader 200 "no_files|already_processed|success"

# ── Summary ───────────────────────────────────────────────────
Write-Host "`n============================================" -ForegroundColor White
Write-Host "Results: $pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
if ($fail -gt 0) {
  Write-Host "Note: FAIL on 200 for agents 5/6 is expected if ANTHROPIC_API_KEY/bucket not configured." -ForegroundColor DarkYellow
}
