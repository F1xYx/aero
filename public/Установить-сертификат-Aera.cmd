@echo off
chcp 65001 >nul 2>&1
title Установка сертификата Aera

echo.
echo  ============================================================
echo   Aera - доверие сертификату (1 раз, права админа НЕ нужны)
echo  ============================================================
echo.
echo  Этот шаг убирает синее окно SmartScreen
echo  "Система Windows защитила ваш компьютер".
echo.
if not exist "%~dp0Aera-CodeSign.cer" (
  echo  Файл Aera-CodeSign.cer не найден рядом со скриптом!
  pause
  exit /b 1
)

certutil -user -addstore Root "%~dp0Aera-CodeSign.cer" >nul 2>&1
certutil -user -addstore TrustedPublisher "%~dp0Aera-CodeSign.cer" >nul 2>&1

echo  [OK] Сертификат "Aera Browser" добавлен в доверенные.
echo  [OK] Теперь exe-файлы Aera запускаются без SmartScreen.
echo.
echo  Если окно SmartScreen всё же появилось один раз:
echo    нажмите "Подробнее" -^> "Выполнить в любом случае".
echo.
pause
