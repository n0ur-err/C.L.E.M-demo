; CLEM Installer Script for Inno Setup
; This creates a professional Windows installer

#define MyAppName "CLEM"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "CLEM Project"
#define MyAppURL "https://github.com/nour23019870/C.L.E.M-demo"
#define MyAppExeName "CLEM.exe"

[Setup]
; Application Information
AppId={{8F9A2B3C-4D5E-6F7A-8B9C-0D1E2F3A4B5C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=LICENSE.txt
; Uncomment the following line to run in non administrative install mode (install for current user only.)
;PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=dist
OutputBaseFilename=CLEM-Setup-{#MyAppVersion}
; SetupIconFile=assets\icons\logo.png
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
DisableWelcomePage=no
DisableDirPage=no
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\{#MyAppExeName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Main Application Files
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Python Installation
Source: "Python310\*"; DestDir: "{app}\Python310"; Flags: ignoreversion recursesubdirs createallsubdirs
; Python Apps
Source: "python-apps\*"; DestDir: "{app}\python-apps"; Flags: ignoreversion recursesubdirs createallsubdirs
; Configuration
Source: "config\*"; DestDir: "{app}\config"; Flags: ignoreversion recursesubdirs createallsubdirs
; Assets
Source: "assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs
; Requirements
Source: "requirements.txt"; DestDir: "{app}"; Flags: ignoreversion
; Model Files
Source: "deploy.prototxt"; DestDir: "{app}"; Flags: ignoreversion; Check: FileExists('deploy.prototxt')
Source: "openface_nn4.small2.v1.t7"; DestDir: "{app}"; Flags: ignoreversion; Check: FileExists('openface_nn4.small2.v1.t7')
Source: "res10_300x300_ssd_iter_140000.caffemodel"; DestDir: "{app}"; Flags: ignoreversion; Check: FileExists('res10_300x300_ssd_iter_140000.caffemodel')
Source: "yolov5s.pt"; DestDir: "{app}"; Flags: ignoreversion; Check: FileExists('yolov5s.pt')
; Documentation
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "LICENSE.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Setup Python environments after installation
Filename: "{app}\Python310\python.exe"; Parameters: "-m pip install --upgrade pip"; WorkingDir: "{app}"; Flags: runhidden; StatusMsg: "Setting up Python environment..."
Filename: "{app}\Python310\python.exe"; Parameters: "-m pip install virtualenv"; WorkingDir: "{app}"; Flags: runhidden; StatusMsg: "Installing virtualenv..."
Filename: "{app}\Python310\python.exe"; Parameters: "-m virtualenv env"; WorkingDir: "{app}"; Flags: runhidden; StatusMsg: "Creating main virtual environment..."
Filename: "{app}\env\Scripts\pip.exe"; Parameters: "install -r requirements.txt"; WorkingDir: "{app}"; Flags: runhidden; StatusMsg: "Installing Python dependencies..."
; Offer to launch the application
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
function FileExists(FileName: String): Boolean;
begin
  Result := FileExists(ExpandConstant('{src}\' + FileName));
end;
