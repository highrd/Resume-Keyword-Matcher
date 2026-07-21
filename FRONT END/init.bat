@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  Resume Keyword Matcher - Setup and Launch
echo ============================================
echo.

echo [1/3] Checking/installing backend dependencies (fastapi, uvicorn, spacy)...
python -m pip install fastapi uvicorn spacy
if errorlevel 1 (
    echo.
    echo Pip install failed - see the error above. Fix it, then re-run this script.
    pause
    exit /b 1
)

echo.
echo [2/3] Checking/installing the spaCy language model...
python -m spacy download en_core_web_sm
if errorlevel 1 (
    echo.
    echo spaCy model download failed - see the error above. Fix it, then re-run this script.
    pause
    exit /b 1
)

echo.
echo Starting the app...
echo   Frontend: http://localhost:5500/start.html
echo   Backend docs: http://localhost:8000/docs
echo.
echo This window runs the backend - press Ctrl+C here to stop it.
echo Close the other window to stop the frontend server.
echo.

start "Resume Matcher Frontend - port 5500" cmd /k "python -m http.server 5500"

timeout /t 2 /nobreak > nul
start "" "http://localhost:5500/start.html"

cd ..
cd "BACK END"
python -m uvicorn Backend:app --reload

echo.
echo Backend stopped.
pause
endlocal
