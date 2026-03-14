@echo off
echo Iniciando Sistema de BI...

echo Iniciando Backend...
start cmd /k "cd backend && python -m pip install -r requirements.txt && python -m uvicorn main:app --reload --port 8000"

timeout /t 5 >nul

echo Iniciando Frontend...
echo Instalando dependencias do frontend (pode demorar na primeira vez)...
start cmd /k "cd frontend && npm install && npm run dev"

echo Tudo pronto! O sistema deve abrir no seu navegador.
pause
