@echo off
echo Starting HTTP Server on port 8000...
echo.
echo Access your project at:
echo   - Cosmic Lab: http://localhost:8000/cosmic-lab.html
echo   - Simple Galaxy: http://localhost:8000/index.html
echo.
echo Press Ctrl+C to stop the server
echo.
python -m http.server 8000
