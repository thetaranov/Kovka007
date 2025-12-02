// ... (импорты те же) ...

// ... (BrowserOrderModal и getRecommendedPillarSize те же) ...

export default function App() {
    // ... (состояния и эффекты те же) ...

    return (
        // Добавлен touch-action-none и overflow-hidden на главный контейнер
        <div className="flex flex-col lg:flex-row h-[100dvh] w-screen overflow-hidden bg-slate-100 font-sans touch-none overscroll-none fixed inset-0">
            {/* HEADER */}
            <div className="absolute top-0 left-0 right-0 z-40 p-4 pointer-events-none flex justify-center lg:justify-start lg:p-6">
                {/* ... */}
            </div>

            <div className="relative w-full flex-grow min-h-0 lg:h-full transition-all duration-300">
                <Scene config={config} />
                {/* ... */}
            </div>

            {/* ... MOBILE PANEL, SIDEBAR, MODAL (остальной код без изменений) ... */}
            {/* Вставьте оставшуюся часть JSX из предыдущей версии App.tsx */}
            {/* ... */}
        </div>
    );
}
