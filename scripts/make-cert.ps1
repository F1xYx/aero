# ============================================================================
# Aera — создание собственного сертификата подписи кода (Windows).
# Запускается ОДИН РАЗ на машине сборщика: правый клик → «Выполнить с PowerShell».
# Результат:
#   build\codesign\aera-codesign.pfx  — сертификат для подписи сборок;
#   Aera-CodeSign.cer                 — публичный сертификат для пользователей.
# Сертификат ставится в локальные хранилища, чтобы SmartScreen доверял сборкам
# уже на ЭТОЙ машине. Для других машин пользователь один раз запускает
# «Установить-сертификат-Aera.cmd» из архива сборки.
# ============================================================================

$ErrorActionPreference = 'Stop'

$cn     = 'Aera Browser'
$store  = 'CurrentUser\My'
$outDir = Join-Path $PSScriptRoot '..\build\codesign'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host 'Создаём сертификат подписи кода (10 лет, codeSigning)...'
$cert = New-SelfSignedCertificate `
  -Type CodeSigningCert `
  -Subject "CN=$cn" `
  -KeyAlgorithm RSA -KeyLength 3072 -HashAlgorithm SHA256 `
  -NotAfter (Get-Date).AddYears(10) `
  -CertStoreLocation $store

# Экспорт PFX для подписи
$password = ConvertTo-SecureString -String ([System.Guid]::NewGuid().ToString('N')) -Force -AsPlainText
$pfxPath = Join-Path $outDir 'aera-codesign.pfx'
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password | Out-Null
$plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
Set-Content -Path (Join-Path $outDir 'pass.txt') -Value $plain -NoNewline

# Экспорт публичного .cer для пользователей
$cerPath = Join-Path $outDir 'Aera-CodeSign.cer'
Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null

# Доверие на машине сборщика: издатель + корневой
Import-Certificate -FilePath $cerPath -CertStoreLocation 'Cert:\CurrentUser\Root' | Out-Null
Import-Certificate -FilePath $cerPath -CertStoreLocation 'Cert:\CurrentUser\TrustedPublisher' | Out-Null

Write-Host ''
Write-Host "Готово: $pfxPath"
Write-Host "Пароль PFX сохранён в build\codesign\pass.txt"
Write-Host "Публичный сертификат: $cerPath"
