@echo off
chcp 65001 > nul
echo ========================================
echo   Kovka007 Конструктор - Сборка
echo ========================================
echo.

cd /d "%~dp0"

:: Проверка node_modules
if not exist "node_modules" (
    echo [INFO] Установка зависимостей...
    call npm install
)

echo [INFO] Сборка проекта...
call npm run build

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo [OK] Сборка завершена успешно!
    echo Файлы находятся в папке: dist/
    echo ========================================
) else (
    echo.
    echo [ОШИБКА] Сборка завершилась с ошибками!
)

pause
