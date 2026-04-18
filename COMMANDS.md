# 🎯 CLEM Quick Command Reference

## 🚀 Building & Distribution

### Create Full Installer (.exe)
```bash
CREATE-INSTALLER.bat
```
**Output**: `dist/CLEM-Setup-1.0.0.exe`

### Build App Only (No Installer)
```bash
npm install
npm run build:dir
```
**Output**: `dist/win-unpacked/CLEM.exe`

### Check Your Build Environment
```bash
CHECK-SETUP.bat
```

---

## 🔧 Development

### Run in Development Mode
```bash
npm start
```
or
```bash
CLEM.bat
```

### Install Dependencies
```bash
npm install
```

### Clean Build
```bash
rmdir /S /Q dist
rmdir /S /Q node_modules
npm install
CREATE-INSTALLER.bat
```

---

## 📦 What Each File Does

| File | Purpose |
|------|---------|
| `CREATE-INSTALLER.bat` | **Main builder** - Creates installer .exe |
| `CHECK-SETUP.bat` | Verifies your build environment |
| `build.bat` | Alternative builder (same as CREATE-INSTALLER) |
| `CLEM.bat` | Runs app in development mode |
| `START-HERE.bat` | Quick start guide |
| `build-installer.iss` | Inno Setup script (installer config) |
| `package.json` | Node.js configuration |

---

## 📁 Output Directories

```
dist/
├── CLEM-Setup-1.0.0.exe          ← Installer (share this!)
└── win-unpacked/
    ├── CLEM.exe                  ← App executable
    ├── resources/
    ├── Python310/
    ├── python-apps/
    └── ...
```

---

## 🐛 Quick Fixes

### Problem: "Node.js not found"
```bash
# Install Node.js from: https://nodejs.org/
```

### Problem: "Cannot create installer"
```bash
# Install Inno Setup from: https://jrsoftware.org/isdl.php
# Or use portable version: dist/win-unpacked/
```

### Problem: "Build fails"
```bash
rmdir /S /Q node_modules
npm install
CREATE-INSTALLER.bat
```

### Problem: "App won't start"
```bash
# Check Windows Defender isn't blocking it
# Run as Administrator
# Make sure camera is not in use by another app
```

---

## 🎨 Icon Conversion (Optional)

If you need to convert logo.png to .ico:
```bash
python convert-icon.py
```

---

## 📤 Distribution Checklist

- [ ] Run `CREATE-INSTALLER.bat`
- [ ] Test `dist/CLEM-Setup-1.0.0.exe` on clean PC
- [ ] Verify all Python apps work
- [ ] Check camera detection works
- [ ] Test uninstaller
- [ ] Upload to GitHub releases or share directly

---

## 💡 Tips

**Faster builds**: After first build, rebuilds are faster (2-3 min)

**Smaller size**: Can't make it much smaller - includes full Python + AI models

**Testing**: Always test installer on a different PC if possible

**Version updates**: Update version in both `package.json` AND `build-installer.iss`

---

## 📖 Full Documentation

- **BUILD-GUIDE.md** - Detailed building instructions
- **DEPLOYMENT.md** - Advanced deployment options
- **README.md** - App usage and features

---

**Need help?** Check the documentation or report issues on GitHub!
