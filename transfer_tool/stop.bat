@echo off
echo Stopping tool...
taskkill /f /im LANTransferTool.exe 2>nul
if %errorlevel% equ 0 (
    echo Tool stopped successfully!
) else (
    echo Tool is not running or already stopped.
)
pause 