@echo off
echo ========================================
echo   Limpando Processos do Sistema BI
echo ========================================
echo.

echo Encerrando processos Python...
taskkill /F /IM python.exe 2>nul
if %errorlevel% == 0 (
    echo [OK] Processos Python encerrados
) else (
    echo [INFO] Nenhum processo Python encontrado
)

echo.
echo Encerrando processos Node.js...
taskkill /F /IM node.exe 2>nul
if %errorlevel% == 0 (
    echo [OK] Processos Node.js encerrados
) else (
    echo [INFO] Nenhum processo Node.js encontrado
)

echo.
echo ========================================
echo   Limpeza concluida!
echo ========================================
echo.
pause
