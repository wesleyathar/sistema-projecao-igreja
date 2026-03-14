@echo off
echo Encerrando processos antigos do backend...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM uvicorn.exe /T 2>nul

echo.
echo Iniciando Backend com as correcoes...
start cmd /k "cd backend && python -m uvicorn main:app --reload --port 8000"

echo.
echo Reiniciando Frontend (por precaucao)...
echo Feche a janela antiga do frontend se estiver aberta.
start cmd /k "cd frontend && npm run dev"

echo.
echo Sistema reiniciado! Tente enviar o arquivo novamente.
pause
