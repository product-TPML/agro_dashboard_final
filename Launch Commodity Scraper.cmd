@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Commodity Scraper Setup
cd /d "%~dp0"
set "ROOT_DIR=%~dp0"
set "NODE_EXE="

echo.
echo Commodity Scraper
echo -----------------
echo.

rem Find an existing Node.js installation first.
for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if defined LOCALAPPDATA if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"

if not defined NODE_EXE (
  echo Node.js was not found on this computer.
  echo The one-time setup needs to install Node.js LTS through Windows Package Manager.
  echo An administrator approval or other organisation policy may be required.
  echo.
  where winget >nul 2>&1
  if errorlevel 1 (
    echo ERROR: Windows Package Manager ^(winget^) is not available.
    echo Install Node.js LTS manually from https://nodejs.org/ and run this launcher again.
    pause
    exit /b 1
  )
  choice /C YN /N /M "Install Node.js LTS now? [Y/N]: "
  if errorlevel 2 (
    echo Node.js installation cancelled.
    pause
    exit /b 1
  )
  echo.
  echo Installing Node.js LTS. Please approve any Windows permission prompt.
  winget install -e --id OpenJS.NodeJS.LTS --source winget --silent --accept-package-agreements --accept-source-agreements
  if errorlevel 1 (
    echo.
    echo ERROR: Node.js installation failed or was cancelled.
    pause
    exit /b 1
  )
  if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
  if not defined NODE_EXE if defined LOCALAPPDATA if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
  if not defined NODE_EXE (
    echo ERROR: Node.js was installed but its executable could not be found.
    echo Restart Windows or refresh the system PATH, then run this launcher again.
    pause
    exit /b 1
  )
)

for %%N in ("%NODE_EXE%") do set "NODE_DIR=%%~dpN"
rem npm lifecycle scripts invoke node by name; make the discovered install
rem visible even when Node was installed moments ago and PATH is stale.
set "PATH=%NODE_DIR%;%PATH%"
set "NPM_CMD=%NODE_DIR%npm.cmd"
set "NPX_CMD=%NODE_DIR%npx.cmd"
if not exist "%NPM_CMD%" (
  echo ERROR: npm was not found beside Node.js: "%NPM_CMD%"
  pause
  exit /b 1
)

echo Node.js: "%NODE_EXE%"
call "%NODE_EXE%" --version

rem npm install is idempotent and is needed once per extracted package.
if not exist "%ROOT_DIR%node_modules\playwright" goto install_dependencies
if not exist "%ROOT_DIR%node_modules\pdf-parse" goto install_dependencies
if not exist "%ROOT_DIR%node_modules\.bin\wrangler.cmd" goto install_dependencies
goto dependencies_ready

:install_dependencies
echo.
echo Installing scraper dependencies, including Wrangler...
call "%NPM_CMD%" install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo ERROR: Dependency installation failed.
  pause
  exit /b 1
)

:dependencies_ready
rem Use existing Edge/Chrome, or install Playwright Chromium as a fallback.
set "HAS_BROWSER="
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "HAS_BROWSER=1"
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "HAS_BROWSER=1"
if exist "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" set "HAS_BROWSER=1"
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "HAS_BROWSER=1"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "HAS_BROWSER=1"
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "HAS_BROWSER=1"
if exist "%LOCALAPPDATA%\ms-playwright" set "HAS_BROWSER=1"
if defined HAS_BROWSER goto browser_ready

echo.
echo No supported browser was found. Installing Playwright Chromium...
call "%NPX_CMD%" --no-install playwright install chromium
if errorlevel 1 (
  echo.
  echo ERROR: Playwright Chromium installation failed.
  pause
  exit /b 1
)

:browser_ready
echo Browser dependency is ready.

rem Publish only when both required Cloudflare values are present.
set "PUBLISH_ARG="
if exist "%ROOT_DIR%.env" (
  findstr /R /C:"^[ ]*CLOUDFLARE_API_TOKEN[ ]*=[ ]*[^ ]" "%ROOT_DIR%.env" >nul 2>&1
  if not errorlevel 1 (
    findstr /R /C:"^[ ]*CLOUDFLARE_ACCOUNT_ID[ ]*=[ ]*[^ ]" "%ROOT_DIR%.env" >nul 2>&1
    if not errorlevel 1 set "PUBLISH_ARG=--publish"
  )
)

if defined PUBLISH_ARG (
  echo Cloudflare credentials found. Successful scrapes will be published.
  call "%NODE_EXE%" "%ROOT_DIR%scrape_krama.js" --ui --publish
) else (
  echo No complete .env configuration found.
  echo The scraper will run locally and save JSON only. Add .env to enable Cloudflare publishing.
  call "%NODE_EXE%" "%ROOT_DIR%scrape_krama.js" --ui
)
set "SCRAPER_EXIT=%ERRORLEVEL%"
if not "%SCRAPER_EXIT%"=="0" (
  echo.
  echo Scraper exited with code %SCRAPER_EXIT%.
  pause
)
exit /b %SCRAPER_EXIT%
