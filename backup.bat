@echo off
echo Creating database backup...
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set BACKUP_FILE=backup_%datetime:~0,8%_%datetime:~8,6%.sql
docker exec gms_db pg_dump -U gms_user gms_db > "backups\%BACKUP_FILE%"
echo Backup saved to backups\%BACKUP_FILE%
pause
