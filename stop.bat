@echo off
echo Stopping GMS...
cd /d "%~dp0"
docker-compose down
echo GMS stopped.
pause
