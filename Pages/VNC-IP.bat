@echo off
echo ===== Your Local IP Address =====
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    echo IP: %%a
)
echo =================================
pause