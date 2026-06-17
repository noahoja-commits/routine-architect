@echo off
echo Starting Routine Architect local web server...
start "" http://localhost:8000
python -m http.server 8000
