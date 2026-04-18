# CLEM Deployment Guide

This guide explains how to build and deploy CLEM for distribution.

## Prerequisites

### Required Software

1. **Node.js** (v14 or higher)
   - Download: https://nodejs.org/

2. **Inno Setup** (for creating Windows installer)
   - Download: https://jrsoftware.org/isdl.php
   - After installation, add to PATH: `C:\Program Files (x86)\Inno Setup 6`

3. **Git** (for version control)
   - Download: https://git-scm.com/

## Building the Application

### Quick Build (Recommended)

Simply run the build script:

```bash
build.bat
```

This will:
1. Install all Node.js dependencies
2. Build the Electron application
3. Create a Windows installer (.exe)

### Manual Build Steps

If you need to build manually:

```bash
# 1. Install dependencies
npm install
npm install --save-dev electron-builder

# 2. Build the Electron app
npm run build:dir

# 3. Create installer with Inno Setup
iscc build-installer.iss
```

## Output Files

After building, you'll find:

- **`dist/CLEM-Setup-1.0.0.exe`** - Full installer (recommended for distribution)
- **`dist/win-unpacked/CLEM.exe`** - Portable executable
- **`dist/win-unpacked/`** - Complete portable folder

## Distribution Options

### Option 1: Full Installer (Recommended)

**File**: `dist/CLEM-Setup-1.0.0.exe`

**Pros:**
- Professional installation experience
- Creates Start Menu shortcuts
- Proper uninstaller
- Sets up Python environments automatically

**Distribution:**
```bash
# Upload to GitHub Releases
# Share via cloud storage (Google Drive, OneDrive, etc.)
```

### Option 2: Portable Version

**Folder**: `dist/win-unpacked/`

**Pros:**
- No installation required
- Can run from USB drive
- Smaller download (if you zip it)

**Distribution:**
```bash
# Compress the folder
# dist/win-unpacked/ -> CLEM-Portable-1.0.0.zip
```

## File Sizes

- **Installer**: ~80-120 MB
- **Portable**: ~200-250 MB (unpacked)
- **Portable (zipped)**: ~80-100 MB

## Python Environment Setup

### Included in Installer

The installer automatically:
1. Installs Python 3.10 (included)
2. Creates virtual environments
3. Installs all dependencies

### For Portable Version

Users need to run once:
```bash
cd CLEM-Portable
Python310\python.exe -m pip install virtualenv
Python310\python.exe -m virtualenv env
env\Scripts\pip.exe install -r requirements.txt
```

## Updating the Version

1. Update version in `package.json`:
```json
{
  "version": "1.0.1"
}
```

2. Update version in `build-installer.iss`:
```iss
#define MyAppVersion "1.0.1"
```

3. Rebuild:
```bash
build.bat
```

## Publishing to GitHub

### Create a Release

```bash
# 1. Tag the version
git tag v1.0.0
git push origin v1.0.0

# 2. Go to GitHub > Releases > Create new release
# 3. Upload dist/CLEM-Setup-1.0.0.exe
# 4. Upload dist/CLEM-Portable-1.0.0.zip (if created)
```

## Troubleshooting

### Build Fails

**Issue**: npm install fails
**Solution**: Delete `node_modules` and `package-lock.json`, then run `npm install` again

**Issue**: electron-builder fails
**Solution**: Make sure you have enough disk space (at least 5GB free)

### Installer Fails

**Issue**: Inno Setup not found
**Solution**: Install Inno Setup and add it to PATH

**Issue**: Missing icon error
**Solution**: Make sure `assets/icons/logo.png` exists

### Python Errors

**Issue**: Python apps don't work after installation
**Solution**: The installer sets up Python automatically. If manual setup is needed:
```bash
cd "C:\Program Files\CLEM"
Python310\python.exe -m pip install virtualenv
Python310\python.exe -m virtualenv env
env\Scripts\pip.exe install -r requirements.txt
```

## Advanced Configuration

### Customizing the Installer

Edit `build-installer.iss` to customize:
- Installation directory
- Shortcuts
- License agreement
- Custom scripts

### Changing App Icon

1. Convert your icon to `.ico` format (256x256 recommended)
2. Replace `assets/icons/logo.png`
3. For installer icon: Update `SetupIconFile` in `build-installer.iss`

### Excluding Files from Build

Edit `package.json` > `build` > `files` to exclude patterns:
```json
"files": [
  "**/*",
  "!**/*.log",
  "!**/temp/**"
]
```

## CI/CD Integration

### GitHub Actions (Example)

```yaml
name: Build CLEM
on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm run build
      - uses: actions/upload-artifact@v2
        with:
          name: CLEM-Installer
          path: dist/CLEM-Setup-*.exe
```

## Security Considerations

### Code Signing (Optional but Recommended)

To avoid Windows SmartScreen warnings:

1. Obtain a code signing certificate
2. Sign the installer:
```bash
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com dist/CLEM-Setup-1.0.0.exe
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/nour23019870/C.L.E.M-demo/issues
- Documentation: README.md

---

© 2025 CLEM Project | MIT License
