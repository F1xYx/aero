@echo off
rem ============================================================
rem  Aero - code signing certificate installer
rem  Adds the Aero certificate to Windows trusted stores so that
rem  signed Aero builds launch without "Unknown publisher" /
rem  "Keep anyway" warnings on THIS computer.
rem
rem  How to use: right-click this file -> "Run as administrator"
rem ============================================================

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo  [!] Запустите этот файл от имени администратора:
  echo      правый клик по файлу -^> "Запуск от имени администратора"
  echo.
  pause
  exit /b 1
)

echo.
echo  Устанавливаю сертификат Aero...
echo.

certutil -addstore -f Root "%~dp0Aero-CodeSign.cer"
certutil -addstore -f TrustedPublisher "%~dp0Aero-CodeSign.cer"

echo.
echo  ============================================
echo   Готово!
echo   Подписанные сборки Aero больше не будут
echo   показывать "Неизвестный издатель".
echo.
echo   Примечание: SmartScreen может один раз
echo   спросить про новый скачанный файл -
echo   нажмите "Подробнее" -^> "Выполнить в любом случае".
echo  ============================================
echo.
pause
