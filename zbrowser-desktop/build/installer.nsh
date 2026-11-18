; Aero custom installer script (electron-builder NSIS include)
; Modern 2-click installer like Chrome / Edge:
;   1. Welcome page: painted glass banner (logo + wordmark + version pill),
;      big title, properly sized shortcut options, install folder, CTA
;   2. Progress (InstFiles)
;   3. Finish page: banner, "Aero installed", "Запустить Aero" checkbox
; No license page, no old-style sidebar, no install-mode page.
;
; Layout hardening (2.3.12):
;   - checkbox rows are 14u tall with 15u pitch — no clipped glyphs/text at
;     125%–150% Windows DPI (10u rows clipped at high DPI)
;   - labels shortened, long explanation moved to a small hint line
;   - banner bitmap is placed via NSD_SetStretchedImage (scales to the
;     control at any DPI; NSD_SetImage drew it native-size and cropped it)
;   - Browse button no longer overlaps the read-only path field
;   - all control widths are explicit dialog units (no unit ambiguity)

!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "StrContains.nsh"

; Custom-script build: electron-builder does not run the two-pass uninstaller
; extraction (needs wine), so UNINSTALLER_OUT_FILE is undefined. The template's
; installApplicationFiles macro embeds that file as ${UNINSTALL_FILENAME};
; point it at a placeholder which our WriteUninstaller (installer.nsi) then
; replaces with the real, natively generated uninstaller during install.
!define /redef UNINSTALLER_OUT_FILE "${BUILD_RESOURCES_DIR}\__dummy_uninstaller.exe"

; %SystemRoot% resolved at runtime (certutil path for the auto-trust step)
Var aeroCertUtil

; Modern typography for every page (defined before MUI2.nsh is parsed)
!define MUI_FONT "Segoe UI"
!define MUI_FONTSIZE 9

; Colors used on the white pages
!define AERO_TEXT      "1D1D1F"
!define AERO_TEXT_SUB  "6E6E73"
!define AERO_PAGE_BG   "FFFFFF"
!define AERO_FIELD_BG  "F2F2F4"

; ─────────────────────────────────────────────────────────────
; Force per-user install (like Chrome): skips the install-mode
; page entirely. Elevation still allowed on demand by the template.
; ─────────────────────────────────────────────────────────────
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

; ─────────────────────────────────────────────────────────────
; Init: plugins dir + branding assets for the custom pages
; ─────────────────────────────────────────────────────────────
!macro customInit
  InitPluginsDir
  File "/oname=$PLUGINSDIR\aero-logo.bmp" "${BUILD_RESOURCES_DIR}\installerLogo.bmp"
  File "/oname=$PLUGINSDIR\aero-finish.bmp" "${BUILD_RESOURCES_DIR}\installerFinishLogo.bmp"
  ; public code-signing certificate (2.3.15+): installed automatically below
  File "/oname=$PLUGINSDIR\aero-code.cer" "${BUILD_RESOURCES_DIR}\signing\aero-code.crt"
!macroend

; ─────────────────────────────────────────────────────────────
; App-running check without GetProcessInfo (which would need an
; un.-prefixed function inside the uninstall section in single-script
; builds). Faithfully mirrors the stock _CHECK_APP_RUNNING behavior.
; ─────────────────────────────────────────────────────────────
!macro customCheckAppRunning
  ; $pid comes from allowOnlyOneAeroCheck.nsh top-level declarations
  !insertmacro IS_POWERSHELL_AVAILABLE
  System::Call 'kernel32::GetCurrentProcessId() i.r0'
  StrCpy $pid $0

  !insertmacro FIND_PROCESS "${APP_EXECUTABLE_FILENAME}" $R0
  ${if} $R0 == 0
    ${if} ${isUpdated}
      Sleep 1000
      Goto doStopProcess
    ${endIf}
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDOK doStopProcess
    Quit

    doStopProcess:

    DetailPrint "$(appClosing)"

    !insertmacro KILL_PROCESS "${APP_EXECUTABLE_FILENAME}" 0
    Sleep 300

    StrCpy $R1 0

    loopAero:
      IntOp $R1 $R1 + 1

      !insertmacro FIND_PROCESS "${APP_EXECUTABLE_FILENAME}" $R0
      ${if} $R0 == 0
        Sleep 1000
        !insertmacro KILL_PROCESS "${APP_EXECUTABLE_FILENAME}" 1
        !insertmacro FIND_PROCESS "${APP_EXECUTABLE_FILENAME}" $R0
        ${if} $R0 == 0
          DetailPrint `Waiting for "${PRODUCT_NAME}" to close.`
          Sleep 2000
        ${else}
          Goto not_running_aero
        ${endIf}
      ${else}
        Goto not_running_aero
      ${endIf}

      ${if} $R1 > 1
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY loopAero
        Quit
      ${else}
        Goto loopAero
      ${endIf}
    not_running_aero:
  ${endIf}
!macroend

!ifndef BUILD_UNINSTALLER

; ─────────────────────────────────────────────────────────────
; Welcome page: banner, title, options, install folder, big CTA
; ─────────────────────────────────────────────────────────────
Var hAeroWelcomeDlg
Var hAeroLogoCtl
Var hAeroTitleLbl
Var hAeroSubLbl
Var hAeroChkDesktop
Var hAeroChkMenu
Var hAeroChkRun
Var hAeroChkLinks
Var hAeroHintLbl
Var hAeroPathLbl
Var hAeroPathTxt
Var hAeroPathBtn
Var hAeroFontTitle
Var hAeroFinishDlg
Var hAeroFinishLogoCtl
Var hAeroFinishTitle
Var hAeroFinishSub
Var hAeroFinishChk
Var hAeroFinishImg
Var hAeroFinishImg2

Var AeroOptDesktop
Var AeroOptMenu
Var AeroOptRun
Var AeroOptLinks
Var AeroRunAfterInstall

; NOTE: all Functions live INSIDE the customWelcomePage/customFinishPage
; macros (not at include top level) so they are parsed AFTER the template
; declares $launchLink and friends — NSIS resolves variables by parse order.

!macro customWelcomePage
  Page custom AeroWelcomeCreate AeroWelcomeLeave

  Function AeroWelcomeCreate
    nsDialogs::Create 1018
    Pop $hAeroWelcomeDlg

    SetCtlColors $hAeroWelcomeDlg "${AERO_TEXT}" "${AERO_PAGE_BG}"

    ; painted glass banner (logo + wordmark + version pill), scales to any DPI
    ${NSD_CreateBitmap} 0 0 100% 50u ""
    Pop $hAeroLogoCtl
    ${NSD_SetStretchedImage} $hAeroLogoCtl "$PLUGINSDIR\aero-logo.bmp" $hAeroFinishImg2

    ; title + subtitle
    ${NSD_CreateLabel} 12u 56u 309u 15u "$(aeroWelcomeTitle)"
    Pop $hAeroTitleLbl
    System::Call 'user32::CreateFontW(i -24, i 0, i 0, i 0, i 620, i 0, i 0, i 0, i 0, i 0, i 0, i 0, i 0, t "Segoe UI") i.s'
    Pop $hAeroFontTitle
    SendMessage $hAeroTitleLbl ${WM_SETFONT} $hAeroFontTitle 1
    SetCtlColors $hAeroTitleLbl "${AERO_TEXT}" "${AERO_PAGE_BG}"

    ${NSD_CreateLabel} 12u 73u 309u 10u "$(aeroWelcomeSub)"
    Pop $hAeroSubLbl
    SetCtlColors $hAeroSubLbl "${AERO_TEXT_SUB}" "${AERO_PAGE_BG}"

    ; options — 14u tall rows (DPI-safe), short labels, hint line below
    ${NSD_CreateCheckbox} 12u 92u 309u 14u "$(aeroOptDesktop)"
    Pop $hAeroChkDesktop
    SetCtlColors $hAeroChkDesktop "${AERO_TEXT}" "${AERO_PAGE_BG}"

    ${NSD_CreateCheckbox} 12u 107u 309u 14u "$(aeroOptMenu)"
    Pop $hAeroChkMenu
    SetCtlColors $hAeroChkMenu "${AERO_TEXT}" "${AERO_PAGE_BG}"

    ${NSD_CreateCheckbox} 12u 122u 309u 14u "$(aeroOptRun)"
    Pop $hAeroChkRun
    SetCtlColors $hAeroChkRun "${AERO_TEXT}" "${AERO_PAGE_BG}"

    ${NSD_CreateCheckbox} 12u 137u 309u 14u "$(aeroOptLinks)"
    Pop $hAeroChkLinks
    SetCtlColors $hAeroChkLinks "${AERO_TEXT}" "${AERO_PAGE_BG}"

    ${NSD_CreateLabel} 24u 153u 297u 8u "$(aeroOptLinksHint)"
    Pop $hAeroHintLbl
    SetCtlColors $hAeroHintLbl "${AERO_TEXT_SUB}" "${AERO_PAGE_BG}"

    ; install folder row (field and button do not overlap)
    ${NSD_CreateLabel} 12u 166u 309u 8u "$(aeroFolderLabel)"
    Pop $hAeroPathLbl
    SetCtlColors $hAeroPathLbl "${AERO_TEXT_SUB}" "${AERO_PAGE_BG}"

    ${NSD_CreateText} 12u 176u 262u 13u "$INSTDIR"
    Pop $hAeroPathTxt
    SetCtlColors $hAeroPathTxt "${AERO_TEXT_SUB}" "${AERO_FIELD_BG}"
    SendMessage $hAeroPathTxt ${EM_SETREADONLY} 1 0

    ${NSD_CreateButton} 280u 176u 41u 13u "$(aeroBrowse)"
    Pop $hAeroPathBtn
    ${NSD_OnClick} $hAeroPathBtn AeroBrowseFolder

    ; restore defaults if page re-entered
    Call AeroOptDefaults

    ; relabel wizard buttons: primary CTA, cancel
    GetDlgItem $0 $HWNDPARENT 1
    SendMessage $0 ${WM_SETTEXT} 0 "STR:$(aeroBtnInstall)"
    GetDlgItem $0 $HWNDPARENT 2
    SendMessage $0 ${WM_SETTEXT} 0 "STR:$(aeroBtnCancel)"

    ; clean wizard chrome: own window title, blank header strip texts
    SendMessage $HWNDPARENT ${WM_SETTEXT} 0 "STR:Aero — установка"
    FindWindow $R0 "#32770" "" $HWNDPARENT
    GetDlgItem $R1 $R0 1037
    SendMessage $R1 ${WM_SETTEXT} 0 "STR:"
    GetDlgItem $R1 $R0 1038
    SendMessage $R1 ${WM_SETTEXT} 0 "STR:"

    nsDialogs::Show

    ; cleanup image handle
    ${NSD_FreeImage} $hAeroFinishImg2
  FunctionEnd

  Function AeroBrowseFolder
    nsDialogs::SelectFolderDialog "$(aeroSelFolderTitle)" "$INSTDIR"
    Pop $0
    ${If} $0 != "error"
    ${AndIf} $0 != "cancel"
      StrCpy $INSTDIR "$0"
      ${NSD_SetText} $hAeroPathTxt "$INSTDIR"
    ${EndIf}
  FunctionEnd

  Function AeroOptDefaults
    ${If} $AeroOptDesktop == ""
      StrCpy $AeroOptDesktop "1"
    ${EndIf}
    ${If} $AeroOptMenu == ""
      StrCpy $AeroOptMenu "1"
    ${EndIf}
    ${If} $AeroOptRun == ""
      StrCpy $AeroOptRun "0"
    ${EndIf}
    ${If} $AeroOptLinks == ""
      StrCpy $AeroOptLinks "1"
    ${EndIf}
    ${If} $AeroRunAfterInstall == ""
      StrCpy $AeroRunAfterInstall "1"
    ${EndIf}

    SendMessage $hAeroChkDesktop ${BM_SETCHECK} $AeroOptDesktop 0
    SendMessage $hAeroChkMenu ${BM_SETCHECK} $AeroOptMenu 0
    SendMessage $hAeroChkRun ${BM_SETCHECK} $AeroOptRun 0
    SendMessage $hAeroChkLinks ${BM_SETCHECK} $AeroOptLinks 0
  FunctionEnd

  Function AeroWelcomeLeave
    ${NSD_GetState} $hAeroChkDesktop $AeroOptDesktop
    ${NSD_GetState} $hAeroChkMenu $AeroOptMenu
    ${NSD_GetState} $hAeroChkRun $AeroOptRun
    ${NSD_GetState} $hAeroChkLinks $AeroOptLinks

    ; sanitize: make sure the target folder has an app folder name
    ${StrContains} $0 "${APP_FILENAME}" $INSTDIR
    ${If} $0 == ""
      StrCpy $INSTDIR "$INSTDIR\${APP_FILENAME}"
    ${EndIf}
  FunctionEnd
!macroend

; ─────────────────────────────────────────────────────────────
; Finish page: banner, done text, "Запустить Aero" checkbox
; ─────────────────────────────────────────────────────────────
!macro customFinishPage
  Page custom AeroFinishCreate AeroFinishLeave

  Function AeroFinishCreate
    nsDialogs::Create 1018
    Pop $hAeroFinishDlg

    SetCtlColors $hAeroFinishDlg "${AERO_TEXT}" "${AERO_PAGE_BG}"

    ${NSD_CreateBitmap} 0 0 100% 50u ""
    Pop $hAeroFinishLogoCtl
    ${NSD_SetStretchedImage} $hAeroFinishLogoCtl "$PLUGINSDIR\aero-finish.bmp" $hAeroFinishImg

    ${NSD_CreateLabel} 12u 56u 309u 15u "$(aeroFinishTitle)"
    Pop $hAeroFinishTitle
    System::Call 'user32::CreateFontW(i -24, i 0, i 0, i 0, i 620, i 0, i 0, i 0, i 0, i 0, i 0, i 0, i 0, t "Segoe UI") i.s'
    Pop $0
    SendMessage $hAeroFinishTitle ${WM_SETFONT} $0 1
    SetCtlColors $hAeroFinishTitle "${AERO_TEXT}" "${AERO_PAGE_BG}"

    ${NSD_CreateLabel} 12u 73u 309u 10u "$(aeroFinishSub)"
    Pop $hAeroFinishSub
    SetCtlColors $hAeroFinishSub "${AERO_TEXT_SUB}" "${AERO_PAGE_BG}"

    ${NSD_CreateCheckbox} 12u 96u 309u 14u "$(aeroFinishRun)"
    Pop $hAeroFinishChk
    SetCtlColors $hAeroFinishChk "${AERO_TEXT}" "${AERO_PAGE_BG}"

    ${If} $AeroRunAfterInstall == ""
      StrCpy $AeroRunAfterInstall "1"
    ${EndIf}
    SendMessage $hAeroFinishChk ${BM_SETCHECK} $AeroRunAfterInstall 0

    GetDlgItem $0 $HWNDPARENT 1
    SendMessage $0 ${WM_SETTEXT} 0 "STR:$(aeroBtnDone)"
    GetDlgItem $0 $HWNDPARENT 2
    SendMessage $0 ${WM_SETTEXT} 0 "STR:$(aeroBtnCancel)"

    SendMessage $HWNDPARENT ${WM_SETTEXT} 0 "STR:Aero — установка завершена"
    FindWindow $R0 "#32770" "" $HWNDPARENT
    GetDlgItem $R1 $R0 1037
    SendMessage $R1 ${WM_SETTEXT} 0 "STR:"
    GetDlgItem $R1 $R0 1038
    SendMessage $R1 ${WM_SETTEXT} 0 "STR:"

    nsDialogs::Show

    ${NSD_FreeImage} $hAeroFinishImg
  FunctionEnd

  Function AeroFinishLeave
    ${NSD_GetState} $hAeroFinishChk $AeroRunAfterInstall
    ${If} $AeroRunAfterInstall == "1"
      ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" ""
    ${EndIf}
  FunctionEnd
!macroend

; ─────────────────────────────────────────────────────────────
; Localized strings (ru + en; installerLanguages restricted to both)
; ─────────────────────────────────────────────────────────────
LangString aeroWelcomeTitle 1049 "Установка Aero"
LangString aeroWelcomeSub   1049 "Браузер в стиле Safari 27 для Windows. Настройте параметры и нажмите «Установить»."
LangString aeroFolderLabel  1049 "Папка установки"
LangString aeroBrowse       1049 "Обзор…"
LangString aeroSelFolderTitle 1049 "Выберите папку установки"
LangString aeroBtnInstall   1049 "Установить Aero"
LangString aeroBtnCancel    1049 "Отмена"
LangString aeroBtnDone      1049 "Готово"
LangString aeroOptDesktop   1049 "Создать ярлык на рабочем столе"
LangString aeroOptMenu      1049 "Создать ярлык в меню «Пуск»"
LangString aeroOptRun       1049 "Запускать Aero при входе в Windows"
LangString aeroOptLinks     1049 "Открывать веб-ссылки (http/https) в Aero"
LangString aeroOptLinksHint 1049 "Aero появится в списке «Открыть с помощью» и в параметрах Windows."
LangString aeroFinishTitle  1049 "Aero установлен"
LangString aeroFinishSub    1049 "Спасибо, что выбрали Aero. Хороших прогулок по интернету."
LangString aeroFinishRun    1049 "Запустить Aero"

LangString aeroWelcomeTitle 1033 "Install Aero"
LangString aeroWelcomeSub   1033 "A browser with the Safari 27 look for Windows. Adjust the options below and hit Install."
LangString aeroFolderLabel  1033 "Installation folder"
LangString aeroBrowse       1033 "Browse…"
LangString aeroSelFolderTitle 1033 "Choose installation folder"
LangString aeroBtnInstall   1033 "Install Aero"
LangString aeroBtnCancel    1033 "Cancel"
LangString aeroBtnDone      1033 "Finish"
LangString aeroOptDesktop   1033 "Create a desktop shortcut"
LangString aeroOptMenu      1033 "Create a Start Menu shortcut"
LangString aeroOptRun       1033 "Launch Aero when Windows starts"
LangString aeroOptLinks     1033 "Open web links (http/https) in Aero"
LangString aeroOptLinksHint 1033 "Aero will appear in the Open With list and in Windows settings."
LangString aeroFinishTitle  1033 "Aero is installed"
LangString aeroFinishSub    1033 "Thanks for choosing Aero. Enjoy the web."
LangString aeroFinishRun    1033 "Launch Aero"
!endif

; ─────────────────────────────────────────────────────────────
; After install: honor checkbox state, register web link handler
; ─────────────────────────────────────────────────────────────
!macro customInstall
  ; ─────────────────────────────────────────────────────────────
  ; Trust the Aero code-signing certificate (2.3.15+).
  ; Per-user stores — no admin needed. Windows shows ONE confirmation
  ; dialog for the Root store (user clicks Yes); TrustedPublisher is
  ; silent. Nothing else to download or run manually.
  ; ─────────────────────────────────────────────────────────────
  ExpandEnvStrings $aeroCertUtil "%SystemRoot%"
  nsExec::Exec '"$aeroCertUtil\System32\certutil.exe" -user -addstore Root "$PLUGINSDIR\aero-code.cer"'
  Pop $0
  nsExec::Exec '"$aeroCertUtil\System32\certutil.exe" -user -addstore TrustedPublisher "$PLUGINSDIR\aero-code.cer"'
  Pop $0

  ${If} $AeroOptDesktop == "0"
    ${If} ${FileExists} "$newDesktopLink"
      Delete "$newDesktopLink"
    ${EndIf}
  ${EndIf}
  ${If} $AeroOptMenu == "0"
    ${If} ${FileExists} "$newStartMenuLink"
      Delete "$newStartMenuLink"
    ${EndIf}
  ${EndIf}

  ${If} $AeroOptRun == "1"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Aero" '"$INSTDIR\Aero.exe"'
  ${Else}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Aero"
  ${EndIf}

  ${If} $AeroOptLinks == "1"
    ; ProgId for http/https
    WriteRegStr HKCU "Software\Classes\Aero.HTML" "" "Aero HTML Document"
    WriteRegStr HKCU "Software\Classes\Aero.HTML" "URL Protocol" ""
    WriteRegStr HKCU "Software\Classes\Aero.HTML\DefaultIcon" "" "$INSTDIR\Aero.exe,0"
    WriteRegStr HKCU "Software\Classes\Aero.HTML\shell\open\command" "" '"$INSTDIR\Aero.exe" "%1"'

    ; Appear in Windows "Default apps" (Settings > Apps > Default apps)
    WriteRegStr HKCU "Software\Aero\Capabilities" "ApplicationName" "Aero"
    WriteRegStr HKCU "Software\Aero\Capabilities" "ApplicationDescription" "Browser with Safari 27 (Golden Gate) interface"
    WriteRegStr HKCU "Software\Aero\Capabilities" "ApplicationIcon" "$INSTDIR\Aero.exe,0"
    WriteRegStr HKCU "Software\Aero\Capabilities\URLAssociations" "http" "Aero.HTML"
    WriteRegStr HKCU "Software\Aero\Capabilities\URLAssociations" "https" "Aero.HTML"
    WriteRegStr HKCU "Software\RegisteredApplications" "Aero" "Software\Aero\Capabilities"
  ${EndIf}
!macroend

; ─────────────────────────────────────────────────────────────
; Uninstall cleanup
; ─────────────────────────────────────────────────────────────
!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Aero"
  DeleteRegKey /ifempty HKCU "Software\Classes\Aero.HTML\shell\open\command"
  DeleteRegKey /ifempty HKCU "Software\Classes\Aero.HTML\shell\open"
  DeleteRegKey /ifempty HKCU "Software\Classes\Aero.HTML\shell"
  DeleteRegKey /ifempty HKCU "Software\Classes\Aero.HTML\DefaultIcon"
  DeleteRegKey /ifempty HKCU "Software\Classes\Aero.HTML"
  DeleteRegKey /ifempty HKCU "Software\Aero\Capabilities\URLAssociations"
  DeleteRegKey /ifempty HKCU "Software\Aero\Capabilities"
  DeleteRegKey /ifempty HKCU "Software\Aero"
  DeleteRegValue HKCU "Software\RegisteredApplications" "Aero"
!macroend
