# 00_setup.ps1 — نفس 00_setup.sh لويندوز بلا قِت-باش (PowerShell أو CMD).
# ما فيه منطق هنا: كل الفحص والتنصيب بـengine/doctor.js (نود، نفس الكود لكل الأنظمة).
#   powershell -ExecutionPolicy Bypass -File 00_setup.ps1             ← يفحص ويقول شنو ناقص (ما ينصّب شي)
#   powershell -ExecutionPolicy Bypass -File 00_setup.ps1 --install   ← ينصّب الناقص بـwinget + pip + npm
#   powershell -ExecutionPolicy Bypass -File 00_setup.ps1 --install --all   ← ومعاه الاختياري (Blender …)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$doctor = Join-Path $PSScriptRoot '..\..\..\engine\doctor.js'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js ناقص — أنصّبه بـwinget (OpenJS.NodeJS.LTS)…'
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host 'winget ناقص: نصّب «App Installer» من متجر مايكروسوفت، أو Node من nodejs.org، وعيد التشغيل.'
    exit 10
  }
  if ($args -notcontains '--install') { Write-Host 'شغّل مع --install عشان أنصّبه.'; exit 10 }
  winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
  Write-Host 'افتح PowerShell جديد (عشان PATH يتحدّث) وشغّل الأمر مرة ثانية.'
  exit 11
}
& node $doctor @args
exit $LASTEXITCODE
