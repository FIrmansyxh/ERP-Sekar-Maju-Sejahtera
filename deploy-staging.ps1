# =============================================================
# deploy-staging.ps1
# Script deploy MANUAL Frontend ke Staging VPS dari laptop
# =============================================================
# Cara pakai:
#   1. Buka terminal di folder ERP-Sekar-Maju-Sejahtera
#   2. Jalankan: .\deploy-staging.ps1
# =============================================================

# ── KONFIGURASI (sesuaikan dengan VPS staging kamu) ──────────
$STAGING_HOST = "IP_STAGING_VPS"        # Ganti dengan IP VPS staging
$STAGING_USER = "username_ssh"           # Ganti dengan username SSH
$STAGING_PORT = 22                       # Port SSH (default 22)
$SSH_KEY_PATH = "$HOME\.ssh\id_rsa"     # Path ke SSH private key kamu
$REMOTE_PATH  = "/var/www/erp-fe/ERP-Sekar-Maju-Sejahtera"
$REMOTE_BRANCH = "staging"
# ─────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   DEPLOY FRONTEND → STAGING VPS" -ForegroundColor Cyan
Write-Host "   Target: $STAGING_USER@$STAGING_HOST" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# STEP 1: Build lokal
Write-Host "[1/4] Install dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "GAGAL: npm install" -ForegroundColor Red; exit 1 }

Write-Host "[2/4] Build Vite untuk staging..." -ForegroundColor Yellow
# Salin .env.staging ke .env sementara jika ada, lalu build
if (Test-Path ".env.staging") {
    Copy-Item ".env.staging" ".env.build.tmp"
    Copy-Item ".env.staging" ".env.local"
    Write-Host "      Menggunakan .env.staging untuk build" -ForegroundColor Gray
}
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "GAGAL: npm run build" -ForegroundColor Red; exit 1 }
# Bersihkan file temp jika ada
if (Test-Path ".env.build.tmp") { Remove-Item ".env.build.tmp" }

# STEP 2: Kompres dist
Write-Host "[3/4] Kompres hasil build..." -ForegroundColor Yellow
if (Test-Path "dist.tar.gz") { Remove-Item "dist.tar.gz" }
tar -czf dist.tar.gz dist/
if ($LASTEXITCODE -ne 0) { Write-Host "GAGAL: tar" -ForegroundColor Red; exit 1 }

# STEP 3: Kirim ke VPS via SCP
Write-Host "[4/4] Kirim ke Staging VPS via SCP..." -ForegroundColor Yellow
scp -i "$SSH_KEY_PATH" -P $STAGING_PORT dist.tar.gz "${STAGING_USER}@${STAGING_HOST}:${REMOTE_PATH}/"
if ($LASTEXITCODE -ne 0) { Write-Host "GAGAL: scp" -ForegroundColor Red; exit 1 }

# STEP 4: Ekstrak di VPS & reload Nginx
Write-Host "" 
Write-Host "Deploy & reload Nginx di Staging VPS..." -ForegroundColor Yellow
ssh -i "$SSH_KEY_PATH" -p $STAGING_PORT "${STAGING_USER}@${STAGING_HOST}" @"
  echo '=== Masuk ke folder frontend staging ==='
  cd $REMOTE_PATH

  echo '=== Ekstrak aset terbaru ==='
  tar -xzf dist.tar.gz
  rm -f dist.tar.gz

  echo '=== Reload Nginx ==='
  sudo systemctl reload nginx

  echo '=== SELESAI! ==='
"@
if ($LASTEXITCODE -ne 0) { Write-Host "GAGAL: ssh deploy" -ForegroundColor Red; exit 1 }

# Bersihkan file lokal
Remove-Item "dist.tar.gz" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   DEPLOY STAGING BERHASIL!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
