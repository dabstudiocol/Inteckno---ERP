@echo off
echo ========================================================
echo   INTECKNO ERP - DESPLIEGUE A FIREBASE (GOOGLE CLOUD)
echo   Proyecto: inteckno-erp (https://inteckno-erp.web.app)
echo ========================================================
echo.

echo 1. Compilando aplicacion (TypeScript + Vite)...
call "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build
if %errorlevel% neq 0 (
    echo [ERROR] La compilacion fallo. Corrige los errores antes de desplegar.
    pause
    exit /b %errorlevel%
)

echo.
echo 2. Desplegando Frontend y Reglas de Seguridad en Firebase Hosting...
call "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js" -y firebase-tools deploy --only hosting,firestore:rules --project inteckno-erp
if %errorlevel% neq 0 (
    echo.
    echo [ATENCION] Si ves error de autenticacion, inicia sesion una sola vez ejecutando:
    echo   npx firebase-tools login
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo   DESPLIEGUE COMPLETADO CON EXITO!
echo   Tu ERP esta disponible en: https://inteckno-erp.web.app
echo ========================================================
pause
