@echo off
REM ========================================
REM CLEM Build and Installer Creation Script
REM This script builds the Electron app and creates a Windows installer
REM ========================================

echo.
echo ========================================
echo CLEM Build System
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
)

echo [1/6] Installing/Updating Node dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install Node dependencies
    pause
    exit /b 1
)

echo.
echo [2/6] Installing electron-builder...
call npm install --save-dev electron-builder
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install electron-builder
    pause
    exit /b 1
)

echo.
echo [3/6] Cleaning previous builds...
if exist dist rmdir /S /Q dist
if exist release rmdir /S /Q release

echo.
echo [4/6] Building Electron application...
call npm run build:dir
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Electron build failed
    pause
    exit /b 1
)

echo.
echo [5/6] Checking for Inno Setup...
where iscc >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Inno Setup not found in PATH
    echo.
    echo You need to install Inno Setup to create the installer:
    echo 1. Download from: https://jrsoftware.org/isdl.php
    echo 2. Install it
    echo 3. Add "C:\Program Files (x86)\Inno Setup 6" to your PATH
    echo.
    echo The app is built in: dist\win-unpacked\CLEM.exe
    echo You can run it directly from there.
    echo.
    pause
    exit /b 0
)

echo.
echo [6/6] Creating Windows installer with Inno Setup...
iscc build-installer.iss
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Inno Setup compilation failed
    echo The app is still available in: dist\win-unpacked\CLEM.exe
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD SUCCESSFUL!
echo ========================================
echo.
echo Your installer is ready:
echo   - Installer: dist\CLEM-Setup-1.0.0.exe
echo   - App folder: dist\win-unpacked\
echo   - Executable: dist\win-unpacked\CLEM.exe
echo.
echo To distribute CLEM:
echo   1. Share "dist\CLEM-Setup-1.0.0.exe" for full installation
echo   2. Or share the "dist\win-unpacked" folder as portable version
echo.
pause
