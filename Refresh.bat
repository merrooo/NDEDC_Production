@echo off
title Ultimate System Cleaner PRO++
color 0A

:: ===== Admin Check =====
NET SESSION >nul 2>&1
if %errorLevel% neq 0 (
    powershell -WindowStyle Hidden -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ===============================
echo   ULTIMATE CLEANER STARTING
echo ===============================

:: ===== Disk Space Before =====
echo Checking disk space BEFORE...
for /f "tokens=3" %%a in ('dir C:\ ^| find "bytes free"') do set before=%%a

:: ===== Cleaning =====

echo Cleaning Temp...
del /f /s /q "%temp%\*" >nul 2>&1
for /d %%x in ("%temp%\*") do rd /s /q "%%x" >nul 2>&1

echo Cleaning Windows Temp...
del /f /s /q "C:\Windows\Temp\*" >nul 2>&1
for /d %%x in ("C:\Windows\Temp\*") do rd /s /q "%%x" >nul 2>&1

echo Cleaning Recent...
del /f /s /q "%appdata%\Microsoft\Windows\Recent\*" >nul 2>&1

echo Cleaning Prefetch...
del /f /s /q "C:\Windows\Prefetch\*" >nul 2>&1

echo Cleaning Windows Update...
net stop wuauserv >nul 2>&1
net stop bits >nul 2>&1
del /f /s /q "C:\Windows\SoftwareDistribution\Download\*" >nul 2>&1
net start wuauserv >nul 2>&1
net start bits >nul 2>&1

echo Flushing DNS...
ipconfig /flushdns >nul 2>&1

echo Emptying Recycle Bin...
powershell -WindowStyle Hidden -command "Clear-RecycleBin -Force" >nul 2>&1

:: ===== Browsers =====
echo Cleaning Browsers...
taskkill /f /im chrome.exe >nul 2>&1
taskkill /f /im msedge.exe >nul 2>&1

del /f /s /q "%localappdata%\Google\Chrome\User Data\Default\Cache\*" >nul 2>&1
del /f /s /q "%localappdata%\Microsoft\Edge\User Data\Default\Cache\*" >nul 2>&1

:: ===== Logs =====
echo Cleaning Logs...
del /f /s /q "C:\Windows\Logs\*" >nul 2>&1

:: ===== DirectX =====
echo Cleaning DirectX Cache...
del /f /s /q "%localappdata%\D3DSCache\*" >nul 2>&1

:: ===== RAM Cleanup =====
echo Refreshing Memory...
%windir%\system32\rundll32.exe advapi32.dll,ProcessIdleTasks

:: ===== Startup Optimization (Safe) =====
echo Optimizing Startup...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v OneDrive /f >nul 2>&1

:: ===== Disk Optimize =====
echo Optimizing Disk...
defrag C: /O >nul 2>&1

:: ===== Disk Space After =====
echo Checking disk space AFTER...
for /f "tokens=3" %%a in ('dir C:\ ^| find "bytes free"') do set after=%%a

echo ===============================
echo   CLEANING COMPLETE
echo ===============================
echo Space Before: %before%
echo Space After : %after%
echo ===============================

pause