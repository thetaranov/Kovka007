import React, { useState, useEffect } from "react";
import { Scene } from "./components/Scene";
import { Controls } from "./components/Controls";
import { FinalModel } from "./components/FinalModel";
import {
    CarportConfig,
    RoofType,
    PillarSize,
    RoofMaterial,
    PaintType,
    CalculationResult,
    AppMode,
} from "./types";
import { PRICING, FRAME_COLORS, ROOF_COLORS, CONSTRUCTION_REGIONS } from "./constants";
import {
    X,
    FileText,
    Globe,
    TrendingDown,
    Send,
    Settings2,
    Eye,
    HardHat,
} from "lucide-react";

const moscowRegion = CONSTRUCTION_REGIONS.find(r => r.name === "Москва и Московская обл.")!;

const INITIAL_CONFIG: CarportConfig = {
    width: 4.5,
    length: 6,
    height: 2.1,
    roofType: RoofType.Gable,
    roofSlope: 20,
    pillarSize: PillarSize.Size80,
    roofMaterial: RoofMaterial.Polycarbonate,
    paintType: PaintType.Ral,
    frameColor: FRAME_COLORS[0].hex,
    roofColor: ROOF_COLORS[5].hex,
    hasTrusses: true,
    hasGutters: false,
    hasSideWalls: false,
    hasFoundation: false,
    hasInstallation: true,
    constructionRegionId: moscowRegion.id,
    snowRegion: moscowRegion.snow,
    windRegion: moscowRegion.wind,
};

const BrowserOrderModal = ({ isOpen, onClose, orderData }: any) => {
    if (!isOpen) return null;

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(orderData).then(() => {
                alert("Скопировано! Отправьте этот код боту.");
                window.open("https://t.me/Kovka007bot", "_blank");
            });
        } else {
            prompt("Скопируйте код:", orderData);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                <div className="flex justify-between mb-4">
                    <h3 className="text-xl font-bold">Оформить заявку</h3>
                    <button onClick={onClose}>
                        <X />
                    </button>
                </div>
                <div className="space-y-3">
                    <p className="text-sm text-slate-500">
                        Вы в браузере. Чтобы оформить заказ, скопируйте код и
                        отправьте его боту.
                    </p>
                    <button
                        onClick={handleCopy}
                        className="w-full bg-[#2AABEE] text-white p-4 rounded-xl flex items-center gap-3 justify-center font-bold shadow-lg shadow-blue-200"
                    >
                        <Send size={20} />{" "}
                        <span>Скопировать и перейти в Telegram</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function App() {
    const [appMode, setAppMode] = useState<AppMode>('visualizer');
    const [config, setConfig] = useState<CarportConfig>(INITIAL_CONFIG);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showBrowserOrderModal, setShowBrowserOrderModal] = useState(false);
    const [price, setPrice] = useState(0);
    const [orderJson, setOrderJson] = useState("");
    const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
    const [calculationMode, setCalculationMode] = useState<'edit' | 'calculated'>('edit');

    useEffect(() => {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            try {
                window.Telegram.WebApp.expand();
            } catch (e) {
                console.warn(e);
            }
        }
    }, []);

    useEffect(() => {
        let materialCost = 0;
        const floorArea = config.width * config.length;
        const baseRate = PRICING.baseTrussStructure.base;
        const widthPenalty = Math.max(0, config.width - 4.5) * PRICING.baseTrussStructure.widthFactor;
        let volumeDiscount = 1.0;
        if (floorArea > 50) volumeDiscount = 0.95;
        if (floorArea > 100) volumeDiscount = 0.9;
        const trussCostPerSqm = (baseRate + widthPenalty) * volumeDiscount;
        materialCost += floorArea * trussCostPerSqm * PRICING.roofTypeMultiplier[config.roofType];
        const maxSpan = 6.0;
        const numCols = Math.ceil(config.width / maxSpan) + 1;
        const postSpacing = 3.5;
        const numRows = Math.ceil(config.length / postSpacing) + 1;
        const pillarCount = numCols * numRows;
        const totalPillarHeight = pillarCount * config.height;
        materialCost += totalPillarHeight * PRICING.pillarMultiplier[config.pillarSize];
        let roofAreaMultiplier = 1.1;
        if (config.roofType === RoofType.Gable) roofAreaMultiplier = 1.25;
        if (config.roofType === RoofType.Arched) roofAreaMultiplier = 1.3;
        if (config.roofType === RoofType.SemiArched) roofAreaMultiplier = 1.35;
        const roofArea = floorArea * roofAreaMultiplier;
        materialCost += roofArea * PRICING.roofMaterialPricePerSqm[config.roofMaterial];
        materialCost += floorArea * PRICING.paintMultiplier[config.paintType];
        if (config.hasTrusses) materialCost += floorArea * PRICING.extras.trusses;
        if (config.hasGutters) materialCost += config.length * 2 * PRICING.extras.gutters;
        if (config.hasSideWalls) {
            const wallArea = config.length * config.height + config.width * config.height;
            materialCost += wallArea * PRICING.extras.sideWalls;
        }
        if (config.hasFoundation) {
            materialCost += pillarCount * 4000;
        }
        let total = materialCost;
        if (config.hasInstallation) {
            let installPercent = PRICING.extras.installation;
            if (materialCost > 300000) installPercent = 0.22;
            if (materialCost > 600000) installPercent = 0.2;
            if (config.height > 3.2) installPercent += PRICING.extras.highWork;
            total = total * (1 + installPercent);
        }
        const minTotal = floorArea * PRICING.minPricePerSqm;
        if (total < minTotal) {
            total = minTotal;
        }
        setPrice(Math.round(total / 100) * 100);
    }, [config]);

    const oldPrice = Math.round(price * 1.2);
    const savings = oldPrice - price;

    const handleDownloadReport = () => { alert("Смета скачивается..."); };

    const getOrderPayload = () => {
        const frameColorObj = FRAME_COLORS.find((c) => c.hex === config.frameColor);
        const roofColorObj = ROOF_COLORS.find((c) => c.hex === config.roofColor);
        return {
            id: `CFG-${Date.now().toString(36).toUpperCase().slice(-5)}`,
            type: config.roofType,
            width: config.width,
            length: config.length,
            height: config.height,
            price: price,
            color_frame: frameColorObj ? frameColorObj.name : config.frameColor,
            color_roof: roofColorObj ? roofColorObj.name : config.roofColor,
        };
    };

    const handleOrder = () => {
        const payload = getOrderPayload();
        const dataToSend = JSON.stringify(payload);
        if (window.Telegram && window.Telegram.WebApp) {
            if (typeof window.Telegram.WebApp.sendData === "function") {
                window.Telegram.WebApp.sendData(dataToSend);
            } else { setOrderJson(dataToSend); setShowBrowserOrderModal(true); }
        } else { setOrderJson(dataToSend); setShowBrowserOrderModal(true); }
    };

    const handleCalculationComplete = (result: CalculationResult) => {
        setCalculationResult(result);
        setCalculationMode('calculated');
    };

    const handleBackToEdit = () => {
        setCalculationMode('edit');
        // Не сбрасываем calculationResult, чтобы можно было вернуться к нему
    };

    if (appMode === 'calculator' && calculationMode === 'calculated' && calculationResult) {
        return (
            <FinalModel 
                config={config}
                calculation={calculationResult}
                onBack={handleBackToEdit}
            />
        );
    }

    return (
        <div className="flex flex-col lg:flex-row h-[100dvh] w-screen overflow-hidden bg-slate-100 font-sans touch-none overscroll-none fixed inset-0">
            <div className="absolute top-0 left-0 right-0 z-40 p-4 pointer-events-none flex justify-between lg:justify-start lg:p-6 items-center">
                <div className="bg-white/90 backdrop-blur-md px-6 py-2 rounded-xl shadow-sm border border-slate-200/50 text-center lg:text-left pointer-events-auto">
                    <h1 className="font-bold text-slate-900 leading-tight">
                        Kovka007 <span className="hidden lg:inline text-slate-400">|</span> <span className="text-xs font-normal text-slate-500 uppercase tracking-wider">конструктор</span>
                    </h1>
                </div>
                <div className="bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-sm border border-slate-200/50 pointer-events-auto flex gap-1 lg:ml-6">
                    <button onClick={() => setAppMode('visualizer')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${appMode === 'visualizer' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <Eye size={14}/> 3D Визуализация
                    </button>
                    <button onClick={() => setAppMode('calculator')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${appMode === 'calculator' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <HardHat size={14}/> Инженерный расчет
                    </button>
                </div>
            </div>

            <div className="relative w-full flex-grow min-h-0 lg:h-full transition-all duration-300">
                <Scene config={config} calculation={appMode === 'calculator' ? calculationResult : null} />
                <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30 px-4">
                    <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-slate-200 text-slate-800 flex items-center gap-3 text-xs sm:text-sm font-medium whitespace-nowrap overflow-x-auto hide-scrollbar max-w-full">
                        <div className="flex items-baseline gap-1">
                            <span className="font-bold text-slate-700">{config.length}×{config.width}×{config.height}м</span>
                        </div>
                        <span className="w-px h-3 bg-slate-300 flex-shrink-0"></span>
                        <span className="font-bold text-slate-700">{(config.width * config.length).toFixed(1)} м²</span>
                        <span className="w-px h-3 bg-slate-300 flex-shrink-0"></span>
                        <span className="text-slate-500">~{price > 0 && config.width > 0 && config.length > 0 ? Math.round(price / (config.width * config.length)).toLocaleString() : 0} ₽/м²</span>
                    </div>
                </div>
            </div>

            <div className="lg:hidden flex flex-col z-30 flex-shrink-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
                <div className="grid grid-cols-2 gap-3 p-3 border-b border-slate-100">
                    <button onClick={handleDownloadReport} className="bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl border flex justify-center items-center gap-2 active:scale-95">
                        <FileText size={16} className="text-green-600" />
                        <span className="text-xs">Смета</span>
                    </button>
                    <a href="https://kovka007.ru/" target="_blank" rel="noopener noreferrer" className="bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl border flex justify-center items-center gap-2 active:scale-95">
                        <Globe size={16} className="text-indigo-600" />
                        <span className="text-xs">Сайт</span>
                    </a>
                </div>
                <div className="px-4 pt-3">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95">
                        <Settings2 size={18} />
                        <span>Настроить параметры</span>
                    </button>
                </div>
                <div className="p-4">
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-medium text-slate-400 line-through decoration-slate-400/50">{oldPrice.toLocaleString()} ₽</span>
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">-20%</span>
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <p className="text-3xl font-black text-slate-900 leading-none tracking-tight">{price.toLocaleString()} ₽</p>
                            <div className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">
                                <TrendingDown size={14} />
                                <span>Выгода {savings.toLocaleString()} ₽</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleOrder} className="w-full bg-slate-900 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg flex justify-center gap-3 active:scale-[0.98]">
                        <span>Оформить заявку</span>
                    </button>
                </div>
            </div>

            <div className={`fixed inset-0 z-50 lg:static lg:z-auto transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${isMobileMenuOpen ? "translate-y-0" : "translate-y-[100%] lg:translate-y-0"} lg:w-[450px] lg:min-w-[400px] flex-shrink-0 h-full shadow-2xl lg:shadow-none flex flex-col bg-white`}>
                <div className="lg:hidden absolute top-4 right-4 z-50">
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>
                <Controls
                    config={config}
                    onChange={setConfig}
                    price={price}
                    onOrder={handleOrder}
                    appMode={appMode}
                    onCalculated={handleCalculationComplete}
                />
            </div>

            <BrowserOrderModal
                isOpen={showBrowserOrderModal}
                onClose={() => setShowBrowserOrderModal(false)}
                orderData={orderJson}
            />
        </div>
    );
}