@echo off
chcp 65001 > nul
echo ========================================
echo   Kovka007 Конструктор - Запуск
echo ========================================
echo.

:: Проверка Node.js
where node > nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не установлен!
    echo Скачайте и установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js найден: 
node --version

:: Переход в директорию проекта
cd /d "%~dp0"

:: Проверка node_modules
if not exist "node_modules" (
    echo.
    echo [INFO] Установка зависимостей...
    call npm install
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Не удалось установить зависимости!
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Запуск сервера разработки...
echo [INFO] Приложение будет доступно по адресу: http://localhost:5000
echo.
echo Нажмите Ctrl+C для остановки сервера
echo ========================================
echo.

:: Запуск Vite
call npm run dev

pause
