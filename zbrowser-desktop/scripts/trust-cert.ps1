# ============================================================================
# Aera — доверие сертификату Aera (Windows).
# Запускается ОДИН РАЗ пользователем, чтобы SmartScreen и UAC видели
# «Aera Browser» как доверенного издателя и перестали показывать предупреждение.
# Права администратора НЕ нужны: используется хранилище текущего пользователя.
# ============================================================================

$cerPath = Join-Path $PSScriptRoot 'Aera-CodeSign.cer'
if (!(Test-Path $cerPath)) { $cerPath = Join-Path $PSScriptRoot '..\Aera-CodeSign.cer' }
if (!(Test-Path $cerPath)) {
  Write-Host 'Файл Aera-CodeSign.cer не найден рядом со скриптом.' -ForegroundColor Yellow
  exit 1
}

Write-Host 'Добавляем сертификат Aera в доверенные...'
Import-Certificate -FilePath $cerPath -CertStoreLocation 'Cert:\CurrentUser\Root' | Out-Null
Import-Certificate -FilePath $cerPath -CertStoreLocation 'Cert:\CurrentUser\TrustedPublisher' | Out-Null

# Убираем пометку «скачано из интернета» (Mark of the Web) у локальных сборок
Get-ChildItem $PSScriptRoot -Filter '*.exe' -ErrorAction SilentlyContinue | ForEach-Object {
  Unblock-File -Path $_.FullName -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host 'Готово! Теперь сборки Aera запускаются без предупреждения SmartScreen.' -ForegroundColor Green
