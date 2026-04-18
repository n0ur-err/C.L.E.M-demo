@echo off
REM ========================================
REM CLEM - Simple Installer Builder
REM Just run this to create your .exe installer!
REM ========================================

echo.
echo ====================================
echo   CLEM Installer Builder
echo ====================================
echo.

REM Step 1: Check prerequisites
echo [Step 1/5] Checking prerequisites...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo [X] ERROR: Node.js not found!
    echo.
    echo Please install Node.js first:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js is installed

REM Step 2: Install dependencies
echo.
echo [Step 2/5] Installing dependencies...
call npm install --silent
if %ERRORLEVEL% neq 0 (
    echo [X] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed

REM Step 3: Install electron-builder if needed
echo.
echo [Step 3/5] Checking electron-builder...
call npm list electron-builder >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Installing electron-builder...
    call npm install --save-dev electron-builder --silent
)
echo [OK] electron-builder ready

REM Step 4: Build the Electron app
echo.
echo [Step 4/5] Building CLEM application...
echo This may take a few minutes...
if exist dist\win-unpacked rmdir /S /Q dist\win-unpacked
call npm run build:dir
if %ERRORLEVEL% neq 0 (
    echo [X] Build failed!
    pause
    exit /b 1
)
echo [OK] Application built successfully

REM Step 5: Check for Inno Setup and create installer
echo.
echo [Step 5/5] Creating Windows installer...
where iscc >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo ====================================
    echo   BUILD COMPLETE!
    echo ====================================
    echo.
    echo Your app is ready in: dist\win-unpacked\CLEM.exe
    echo.
    echo [!] Inno Setup not found
    echo.
    echo To create the installer .exe:
    echo 1. Download Inno Setup: https://jrsoftware.org/isdl.php
    echo 2. Install it
    echo 3. Run this script again
    echo.
    echo For now, you can:
    echo - Test the app: dist\win-unpacked\CLEM.exe
    echo - Zip dist\win-unpacked folder for portable distribution
    echo.
    pause
    exit /b 0
)

REM Create installer with Inno Setup
iscc build-installer.iss
if %ERRORLEVEL% neq 0 (
    echo [X] Installer creation failed
    echo But your app is still available: dist\win-unpacked\CLEM.exe
    pause
    exit /b 1
)

echo.
echo ====================================
echo   SUCCESS!
echo ====================================
echo.
echo Your installer is ready:
echo   FILE: dist\CLEM-Setup-1.0.0.exe
echo   SIZE: ~80-120 MB
echo.
echo The installer will:
echo   - Install CLEM to Program Files
echo   - Create desktop shortcut
echo   - Set up Python environments
echo   - Add Start Menu entry
echo.
echo You can now:
echo   1. Test it: dist\CLEM-Setup-1.0.0.exe
echo   2. Share it with others
echo   3. Upload to GitHub releases
echo.
echo The portable version is also available:
echo   FOLDER: dist\win-unpacked\
echo   RUN: dist\win-unpacked\CLEM.exe
echo.
pause
