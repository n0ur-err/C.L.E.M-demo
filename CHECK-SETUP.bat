@echo off
REM ========================================
REM CLEM Build Environment Checker
REM Run this to verify your setup is ready
REM ========================================

echo.
echo ========================================
echo CLEM Build Environment Check
echo ========================================
echo.

set ALL_GOOD=1

REM Check Node.js
echo [1/5] Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [X] FAILED: Node.js not found
    echo     Download: https://nodejs.org/
    set ALL_GOOD=0
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [OK] Node.js !NODE_VERSION! installed
)

REM Check npm
echo.
echo [2/5] Checking npm...
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [X] FAILED: npm not found
    set ALL_GOOD=0
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [OK] npm !NPM_VERSION! installed
)

REM Check Python
echo.
echo [3/5] Checking Python...
if exist "Python310\python.exe" (
    for /f "tokens=*" %%i in ('Python310\python.exe --version') do set PYTHON_VERSION=%%i
    echo [OK] !PYTHON_VERSION! found in Python310\
) else (
    echo [!] WARNING: Python310 folder not found
    echo     This is OK - it will be included in the build
)

REM Check Inno Setup
echo.
echo [4/5] Checking Inno Setup...
where iscc >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] WARNING: Inno Setup not found
    echo     You can still build the app, but won't create installer .exe
    echo     Download: https://jrsoftware.org/isdl.php
) else (
    for /f "tokens=*" %%i in ('iscc /? ^| findstr /C:"Inno Setup"') do set INNO_VERSION=%%i
    echo [OK] Inno Setup installed
    echo     !INNO_VERSION!
)

REM Check node_modules
echo.
echo [5/5] Checking dependencies...
if exist "node_modules\" (
    echo [OK] node_modules folder exists
) else (
    echo [!] WARNING: node_modules not found
    echo     Run 'npm install' first or use CREATE-INSTALLER.bat
)

REM Summary
echo.
echo ========================================
echo Summary
echo ========================================
echo.

if %ALL_GOOD%==1 (
    echo [✓] All required tools installed!
    echo.
    echo You're ready to build CLEM:
    echo   Run: CREATE-INSTALLER.bat
    echo.
) else (
    echo [X] Some required tools are missing
    echo     Please install them and run this check again
    echo.
)

REM File structure check
echo Current directory structure:
if exist "main.js" (echo [OK] main.js) else (echo [X] main.js missing)
if exist "package.json" (echo [OK] package.json) else (echo [X] package.json missing)
if exist "config\apps.json" (echo [OK] config\apps.json) else (echo [X] config\apps.json missing)
if exist "python-apps\" (echo [OK] python-apps\) else (echo [X] python-apps\ missing)
if exist "assets\" (echo [OK] assets\) else (echo [X] assets\ missing)

echo.
echo ========================================
echo.
pause
