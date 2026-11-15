; Aero custom NSIS script (single-pass, wine-free build)
; Based on the electron-builder assisted installer template, with the
; uninstaller built natively via WriteUninstaller instead of the
; two-pass + wine extraction used by the default template.

Var newStartMenuLink
Var oldStartMenuLink
Var newDesktopLink
Var oldDesktopLink
Var oldShortcutName
Var oldMenuDirectory

!include "common.nsh"
!include "MUI2.nsh"
!include "multiUser.nsh"
; Aero: patched copy (globals hoisted to top level so CHECK_APP_RUNNING can be
; inserted in both the install section and the uninstall section of this
; single-script build)
!include "${BUILD_RESOURCES_DIR}\allowOnlyOneAeroCheck.nsh"

!ifdef INSTALL_MODE_PER_ALL_USERS
  RequestExecutionLevel admin
!else
  RequestExecutionLevel user
!endif

Var appExe
Var launchLink

!include "assistedInstaller.nsh"
!include "installUtil.nsh"

; ─────────────────────────────────────────────────────────────
; Uninstall pages + uninstall section (native, single script)
; ─────────────────────────────────────────────────────────────
ShowUninstDetails nevershow
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH
!include "uninstaller.nsh"

!insertmacro addLangs

!ifmacrodef customHeader
  !insertmacro customHeader
!endif

Function .onInit
  Call setInstallSectionSpaceRequired

  SetOutPath $INSTDIR
  ${LogSet} on

  !ifmacrodef preInit
    !insertmacro preInit
  !endif

  !ifdef DISPLAY_LANG_SELECTOR
    !insertmacro MUI_LANGDLL_DISPLAY
  !endif

  ${IfNot} ${UAC_IsInnerInstance}
    !insertmacro ALLOW_ONLY_ONE_INSTALLER_INSTANCE
  ${EndIf}

  !insertmacro initMultiUser

  !ifmacrodef customInit
    !insertmacro customInit
  !endif

  !ifmacrodef addLicenseFiles
    InitPluginsDir
    !insertmacro addLicenseFiles
  !endif
FunctionEnd

Section "install" INSTALL_SECTION_ID
  !include "installSection.nsh"
  ; native uninstaller generation (no prebuilt stub, no wine required)
  WriteUninstaller "$INSTDIR\${UNINSTALL_FILENAME}"
SectionEnd

Function setInstallSectionSpaceRequired
  !insertmacro setSpaceRequired ${INSTALL_SECTION_ID}
FunctionEnd
