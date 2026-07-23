@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  Resume Keyword Matcher - Setup and Launch
echo ============================================
echo.

python -m install -r requirements.txt

echo.
echo Starting the app...
echo   Frontend: http://localhost:5500/start.html
echo   Backend docs: http://localhost:8000/docs
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