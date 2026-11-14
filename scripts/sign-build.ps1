# ============================================================================
# Aera — подпись собранных exe (Windows).
# Подписывает ВСЕ exe в папке dist\ сертификатом build\codesign\aera-codesign.pfx
# (Set-AuthenticodeSignature входит в состав PowerShell, signtool не нужен).
# Запуск: правый клик → «Выполнить с PowerShell» или .\sign-build.ps1
# ============================================================================

$ErrorActionPreference = 'Stop'

$pfxPath = Join-Path $PSScriptRoot '..\build\codesign\aera-codesign.pfx'
$passPath = Join-Path $PSScriptRoot '..\build\codesign\pass.txt'
$distDir = Join-Path $PSScriptRoot '..\dist'

if (!(Test-Path $pfxPath)) {
  Write-Host 'Сертификат не найден. Сначала запустите make-cert.ps1' -ForegroundColor Yellow
  exit 1
}
$pass = Get-Content $passPath -Raw
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2(
  $pfxPath, $pass,
  [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::EphemeralKeySet)

Get-ChildItem $distDir -Filter '*.exe' | ForEach-Object {
  Write-Host "Подписываем $($_.Name) ..."
  $result = Set-AuthenticodeSignature -FilePath $_.FullName -Certificate $cert -HashAlgorithm SHA256
  if ($result.Status -ne 'Valid') {
    Write-Host "  Не удалось подписать: $($result.StatusMessage)" -ForegroundColor Red
  } else {
    Write-Host '  Подписано (SHA-256)' -ForegroundColor Green
  }
}

Write-Host ''
Write-Host 'Готово. Не забудьте приложить к сборке Aera-CodeSign.cer и Установить-сертификат-Aera.cmd'
