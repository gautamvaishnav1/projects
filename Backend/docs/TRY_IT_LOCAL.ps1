# ============================================================
#  Software World - Full API Walkthrough (PowerShell 5.1+)
#  Run:  powershell -ExecutionPolicy Bypass -File docs\TRY_IT_LOCAL.ps1
#  Requires: server running -> npm run dev
# ============================================================

$BASE    = "http://localhost:5000"
$EMAIL   = "gautam@test.com"          # <- your account
$PASS    = "passw0rd123"
$REPOURL = "https://github.com/gautamvaishnav1/firstReactProject"

# Post/Get helpers: SUCCESS -> normal object | FAILURE -> {__error, __body}
function Post($url, $body, $headers) {
    try {
        return Invoke-RestMethod -Method Post -Uri $url -Headers $headers `
            -ContentType "application/json" -Body ($body | ConvertTo-Json -Compress)
    } catch {
        $parsed = $null
        try { $parsed = $_.ErrorDetails.Message | ConvertFrom-Json } catch {}
        Write-Host ("  <- " + $_.Exception.Response.StatusCode.value__ + " " + $_.ErrorDetails.Message) -ForegroundColor DarkYellow
        return [PSCustomObject]@{ __error = $true; __body = $parsed }
    }
}
function GetReq($url, $headers) {
    try { return Invoke-RestMethod -Method Get -Uri $url -Headers $headers }
    catch {
        Write-Host ("  <- " + $_.Exception.Message) -ForegroundColor Red
        return $null
    }
}

Write-Host "`n===== STEP 0 · GET http://localhost:5000/health =====" -ForegroundColor Cyan
GetReq "$BASE/health" @{} | Format-List status, db

Write-Host "===== STEP 1 · POST /api/v1/auth/register ====="
Write-Host "  body: { name, email, password }"
$reg = Post "$BASE/api/v1/auth/register" @{ name="Gautam"; email=$EMAIL; password=$PASS } @{}
if ($reg -and -not $reg.__error) {
    Write-Host ("  -> " + $reg.message)
    if ($reg.devCode) { Write-Host ("  -> devCode = " + $reg.devCode) -ForegroundColor Yellow }
}

Write-Host "`n===== STEP 2 · POST /api/v1/auth/login ====="
Write-Host "  body: { email, password }"
$login = Post "$BASE/api/v1/auth/login" @{ email=$EMAIL; password=$PASS } @{}
if ($login.__error -and $login.__body.details.needsVerification) {
    # account not verified yet -> need a fresh code (server may still be in 60s resend cooldown)
    $code = $login.__body.details.devCode
    if (-not $code) {
        Write-Host "  waiting out the 60s OTP resend cooldown..."
        do {
            Start-Sleep -Seconds 12
            $rs = Post "$BASE/api/v1/auth/resend-otp" @{ email=$EMAIL } @{}
        } while ($rs.__error -and $rs.__body.message -match "wait")
        if ($rs -and -not $rs.__error) { $code = $rs.devCode }
    }
    if (-not $code) { Write-Host "No code available."; return }
    Write-Host "  needsVerification -> POST /api/v1/auth/verify-otp with code $code"
    $ver = Post "$BASE/api/v1/auth/verify-otp" @{ email=$EMAIL; code="$code" } @{}
    if (-not $ver.__error) {
        $login = [PSCustomObject]@{ data = $ver.data }
        Write-Host "  verified + logged in"
    }
}
if (-not $login -or $login.__error) { Write-Host "Cannot continue without login." -ForegroundColor Red; return }

$TOKEN = $login.data.token
Write-Host ("  TOKEN  : " + $TOKEN.Substring(0,25) + "...") -ForegroundColor Green
$H = @{ Authorization = "Bearer $TOKEN" }

Write-Host "`n===== STEP 3 · POST /api/v1/projects   (PROJECT_ID comes from here) ====="
Write-Host "  body: { name, description, repoUrl }"
$proj = Post "$BASE/api/v1/projects" @{ name="FirstReactProject"; description="my react app"; repoUrl=$REPOURL } $H
$PROJECT_ID = $null
if ($proj -and -not $proj.__error) { $PROJECT_ID = $proj.data.project.id }
if (-not $PROJECT_ID) {
    Write-Host "  (duplicate URL or other error -> finding it in your list)"
    $list = GetReq "$BASE/api/v1/projects" $H
    if ($list) { $PROJECT_ID = ($list.data.projects | Where-Object repoUrl -eq $REPOURL | Select-Object -First 1).id }
}
if (-not $PROJECT_ID) { Write-Host "No project id found."; return }
Write-Host ("  >>> PROJECT_ID = " + $PROJECT_ID) -ForegroundColor Green

Write-Host "`n===== STEP 4 · GET /api/v1/projects (your list) ====="
(GetReq "$BASE/api/v1/projects" $H).data.projects |
    Select-Object id, name, repoUrl, lastAnalysisId | Format-Table -AutoSize

Write-Host "===== STEP 5 · POST /api/v1/projects/$PROJECT_ID/analyze ====="
$an = Post "$BASE/api/v1/projects/$PROJECT_ID/analyze" @{} $H
if (-not $an -or $an.__error) { return }
$ANALYSIS_ID = $an.data.analysisId
Write-Host ("  >>> ANALYSIS_ID = " + $ANALYSIS_ID) -ForegroundColor Green

Write-Host "`n===== STEP 6 · GET /api/v1/analyses/$ANALYSIS_ID/status (polling) ====="
do {
    Start-Sleep -Seconds 4
    $st = GetReq "$BASE/api/v1/analyses/$ANALYSIS_ID/status" $H
    Write-Host ("  status: " + $st.data.status)
} while ($st.data.status -eq "running")
if ($st.data.status -ne "completed") { Write-Host ("FAILED: " + $st.data.error.message); return }

Write-Host "`n===== STEP 7 · GET /api/v1/projects/$PROJECT_ID/architecture ====="
$arch = GetReq "$BASE/api/v1/projects/$PROJECT_ID/architecture" $H
Write-Host ("  components: " + $arch.data.architecture.components.Count +
            " | connections: " + $arch.data.architecture.connections.Count)
$arch.data.architecture.components | Select-Object id, type, name | Format-Table -AutoSize
$arch | ConvertTo-Json -Depth 8 | Set-Content "$PWD\architecture.json" -Encoding utf8
Write-Host "  full JSON saved -> architecture.json" -ForegroundColor Yellow

Write-Host "`n===== STEP 8 · POST /api/v1/projects/$PROJECT_ID/chat ====="
$chat = Post "$BASE/api/v1/projects/$PROJECT_ID/chat" @{ question="How does authentication work?" } $H
if ($chat -and -not $chat.__error) {
    Write-Host ("  answer          : " + $chat.data.answer)
    Write-Host ("  targetComponent : " + $chat.data.targetComponent)
    Write-Host ("  path            : " + ($chat.data.path -join " -> "))
}

Write-Host "`n================ YOUR IDs ================" -ForegroundColor Cyan
Write-Host ("TOKEN       = " + $TOKEN)
Write-Host ("PROJECT_ID  = " + $PROJECT_ID)
Write-Host ("ANALYSIS_ID = " + $ANALYSIS_ID)
