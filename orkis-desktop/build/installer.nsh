!macro customInstall
  ; 기존 프로세스 정리 (업데이트 설치 시)
  nsExec::ExecToStack 'taskkill /f /im win-sshproxy.exe'
  nsExec::ExecToStack 'taskkill /f /im gvproxy.exe'
  nsExec::ExecToStack 'taskkill /f /im orkis.exe'

  ; WSL2 설치 (이미 설치되어 있으면 무시됨, exit code 무시)
  DetailPrint "Ensuring WSL2 is installed..."
  nsExec::ExecToStack 'wsl --install --no-distribution'
  Pop $0
!macroend

!macro customUnInstall
  ; Podman 관련 프로세스 정리
  nsExec::ExecToStack 'taskkill /f /im win-sshproxy.exe'
  nsExec::ExecToStack 'taskkill /f /im gvproxy.exe'
  nsExec::ExecToStack 'taskkill /f /im orkis.exe'

  ; orkis.exe 프로세스 완전 종료 대기 (최대 10초)
  StrCpy $R0 0
  _waitProc:
    IntOp $R0 $R0 + 1
    IntCmp $R0 10 _procDone _procDone
    nsExec::ExecToStack 'cmd /c tasklist /FI "IMAGENAME eq orkis.exe" /NH 2>nul | findstr /i /c:"orkis.exe"'
    Pop $0
    ; findstr: "0" = 프로세스 존재, 그 외 = 종료됨
    StrCmp $0 "0" 0 _procDone
    Sleep 1000
    Goto _waitProc
  _procDone:

  ; Podman machine 정리 (WSL 디스트로 + 설정)
  DetailPrint "Cleaning up Podman machine..."
  nsExec::ExecToStack '"$INSTDIR\resources\podman\win\podman.exe" machine stop'
  nsExec::ExecToStack '"$INSTDIR\resources\podman\win\podman.exe" machine rm -f'
  nsExec::ExecToStack 'wsl --unregister podman-machine-default'

  ; Podman 설정 파일 삭제
  RMDir /r "$PROFILE\.local\share\containers"
  RMDir /r "$PROFILE\.config\containers"

  ; 방화벽 규칙 제거
  nsExec::ExecToStack 'netsh advfirewall firewall delete rule name="orkis"'

  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Do you want to remove app data (settings, databases, etc.)?" \
    IDNO keepData
    ; perMachine 모드에서 $APPDATA가 현재 사용자를 가리키도록 전환
    SetShellVarContext current
    RMDir /r "$APPDATA\orkis-electron"
    RMDir /r "$LOCALAPPDATA\orkis-electron"
    SetShellVarContext all
  keepData:
!macroend
