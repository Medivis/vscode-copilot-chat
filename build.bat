@echo off
setlocal

cd /d "%~dp0"
echo ==================================================
echo Copilot Chat Extension Build Script
echo ==================================================
echo.

echo [1/3] Installing dependencies...
call npm ci
if errorlevel 1 goto :fail

echo.
echo [2/3] Building extension (compile)...
call npm run compile
if errorlevel 1 goto :fail

echo.
echo [3/3] Packaging extension to .vsix...
for /f %%v in ('node -p "require('./package.json').version"') do set "PKG_VERSION=%%v"
for /f %%n in ('node -p "require('./package.json').name"') do set "PKG_NAME=%%n"

if not defined PKG_VERSION goto :fail
if not defined PKG_NAME goto :fail

set "VSIX_FINAL=%~dp0%PKG_NAME%-%PKG_VERSION%.vsix"
npx vsce package --out "%VSIX_FINAL%" --allow-package-secrets sendgrid
if errorlevel 1 goto :fail

echo.
echo Build + package complete.
echo   .vsix file: %VSIX_FINAL%
echo.
echo Next steps:
echo   - Install: code --install-extension "%VSIX_FINAL%"
echo   - Start watch tasks: npm run watch
echo.
echo Done.
goto :eof

:fail
echo.
echo Build failed. See errors above.
exit /b 1
