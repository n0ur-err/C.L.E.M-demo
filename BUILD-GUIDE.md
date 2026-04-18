# 🚀 Build CLEM Installer - Quick Guide

## What You'll Get

Running the build process will create:
- **CLEM-Setup-1.0.0.exe** - Professional Windows installer (~80-120 MB)
- **CLEM.exe** - The main application executable
- **Portable version** - No installation required

---

## 🎯 Quick Start (3 Steps)

### 1️⃣ Install Node.js (if you haven't)
- Download: https://nodejs.org/
- Install and restart your terminal

### 2️⃣ Install Inno Setup (for .exe installer)
- Download: https://jrsoftware.org/isdl.php
- Install it (use default settings)

### 3️⃣ Run the Builder
```bash
CREATE-INSTALLER.bat
```

**That's it!** Your installer will be in `dist/CLEM-Setup-1.0.0.exe`

---

## 📦 What Gets Created

### The Installer (.exe)
**File**: `dist/CLEM-Setup-1.0.0.exe`

**What it does:**
- ✅ Installs CLEM to Program Files
- ✅ Creates desktop shortcut
- ✅ Adds to Start Menu
- ✅ Sets up Python environments automatically
- ✅ Includes uninstaller
- ✅ Professional installation wizard

**To distribute**: Just share this .exe file!

### The Portable Version
**Folder**: `dist/win-unpacked/`
**Executable**: `dist/win-unpacked/CLEM.exe`

**Benefits:**
- No installation needed
- Run from USB drive
- No admin rights required

**To distribute**: 
1. Zip the `win-unpacked` folder
2. Share the zip file
3. Users extract and run CLEM.exe

---

## 🔧 Build Options

### Option 1: Full Automated Build
```bash
CREATE-INSTALLER.bat
```
Does everything automatically!

### Option 2: Step by Step
```bash
# Install dependencies
npm install

# Build the app
npm run build:dir

# Create installer (if Inno Setup is installed)
iscc build-installer.iss
```

### Option 3: Just the App (No Installer)
```bash
npm install
npm run build:dir
```
Result: `dist/win-unpacked/CLEM.exe`

---

## 📝 Build Output

After building, your `dist/` folder will contain:

```
dist/
├── CLEM-Setup-1.0.0.exe     ← Share this installer
└── win-unpacked/
    ├── CLEM.exe              ← The main app
    ├── resources/
    │   └── app.asar          ← Packaged app code
    ├── Python310/            ← Python runtime
    ├── python-apps/          ← All Python applications
    ├── config/               ← App configuration
    └── assets/               ← Icons and resources
```

---

## 🎮 Testing Your Build

### Test the Installer
1. Double-click `dist/CLEM-Setup-1.0.0.exe`
2. Follow the installation wizard
3. Launch CLEM from desktop or Start Menu

### Test the Portable Version
1. Navigate to `dist/win-unpacked/`
2. Double-click `CLEM.exe`
3. App should launch directly!

---

## 🐛 Troubleshooting

### "Node.js not found"
**Solution**: Install Node.js from https://nodejs.org/

### "Inno Setup not found"
**Solution**: 
1. Install Inno Setup from https://jrsoftware.org/isdl.php
2. OR skip installer creation - use portable version in `dist/win-unpacked/`

### "Build fails"
**Try this**:
```bash
# Clean everything and start fresh
rmdir /S /Q node_modules
rmdir /S /Q dist
npm install
CREATE-INSTALLER.bat
```

### "App won't start after installation"
**Check**:
- Windows Defender might be scanning it (wait a bit)
- Run as Administrator if needed
- Check if Python310 folder exists in installation directory

---

## 📤 Distributing Your App

### For GitHub Releases

1. Create a release on GitHub
2. Upload `dist/CLEM-Setup-1.0.0.exe`
3. Users download and install!

### For Direct Sharing

**Installer**: Share `CLEM-Setup-1.0.0.exe`
- Users run it and follow wizard
- Everything installs automatically

**Portable**: 
1. Zip `dist/win-unpacked/` folder
2. Share the zip
3. Users extract and run CLEM.exe

---

## 📊 File Sizes

- **Installer**: ~80-120 MB
- **Portable (unpacked)**: ~250 MB
- **Portable (zipped)**: ~80-100 MB

---

## 🔐 Windows SmartScreen Warning

First-time users might see a SmartScreen warning because the app isn't digitally signed.

**To bypass**:
1. Click "More info"
2. Click "Run anyway"

**To prevent this** (optional):
- Get a code signing certificate ($50-300/year)
- Sign the installer before distribution

---

## 💡 Tips

### Making It Smaller
The app is large because it includes:
- Full Python 3.10 runtime
- All Python libraries (OpenCV, TensorFlow, etc.)
- Multiple AI models

This ensures it works on any Windows PC without dependencies!

### Faster Builds
After first build, subsequent builds are much faster (~2-3 minutes).

### Clean Builds
If you change dependencies, do a clean build:
```bash
rmdir /S /Q dist
CREATE-INSTALLER.bat
```

---

## ✅ Checklist Before Distribution

- [ ] Test the installer on a clean Windows PC
- [ ] Test all Python apps work
- [ ] Camera permissions work
- [ ] Check README.md is clear
- [ ] Update version number in package.json
- [ ] Update version in build-installer.iss
- [ ] Test uninstaller works properly

---

## 🆘 Need Help?

- Check `DEPLOYMENT.md` for advanced options
- See `README.md` for app usage
- Report issues: https://github.com/nour23019870/C.L.E.M-demo/issues

---

**Happy Building! 🎉**
