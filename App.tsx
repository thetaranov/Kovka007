import React, { useState, useEffect, useCallback } from 'react';
import { Scene } from './components/Scene';
import { Controls } from './components/Controls';
import { CarportConfig, RoofType, PillarSize, RoofMaterial, PaintType } from './types';
import { PRICING, FRAME_COLORS, ROOF_COLORS, SPECS } from './constants';
import { Menu, X, FileText, Globe, TrendingDown, Send, Copy, Settings2 } from 'lucide-react';

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
};

// Модальное окно для браузера
const BrowserOrderModal = ({ isOpen, onClose, orderData }: any) => {
    if (!isOpen) return null;

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(orderData).then(() => {
                alert("Скопировано! Отправьте этот код боту.");
                window.open('https://t.me/Kovka007bot', '_blank');
            });
        } else {
            prompt("Скопируйте код:", orderData);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">Оформить заявку</h3><button onClick={onClose}><X/></button></div>
                <div className="space-y-3">
                    <p className="text-sm text-slate-500">Вы в браузере. Чтобы оформить заказ, скопируйте код и отправьте его боту.</p>
                    <button onClick={handleCopy} className="w-full bg-[#2AABEE] text-white p-4 rounded-xl flex items-center gap-3 justify-center font-bold shadow-lg shadow-blue-200">
                        <Send size={20}/> <span>Скопировать и перейти в Telegram</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const getRecommendedPillarSize = (width: number, length: number, height: number): PillarSize => {
  const area = width * length;
  if (width > 8.0 || height > 3.5 || area > 60) return PillarSize.Size100;
  if (width > 5.0 || height > 2.8 || area > 30) return PillarSize.Size80;
  return PillarSize.Size60;
};

export default function App() {
  const [config, setConfig] = useState<CarportConfig>(INITIAL_CONFIG);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBrowserOrderModal, setShowBrowserOrderModal] = useState(false);
  const [price, setPrice] = useState(0);
  const [orderJson, setOrderJson] = useState("");

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      try { 
          window.Telegram.WebApp.expand(); 
          document.body.style.height = window.Telegram.WebApp.viewportHeight + 'px';
      } catch (e) { console.warn(e); }
    }
  }, []);

  const handleConfigChange = (newConfig: CarportConfig) => {
    if (
      newConfig.width !== config.width ||
      newConfig.length !== config.length ||
      newConfig.height !== config.height
    ) {
       const recommended = getRecommendedPillarSize(newConfig.width, newConfig.length, newConfig.height);
       if (newConfig.pillarSize === PillarSize.Size60 && recommended !== PillarSize.Size60) {
           newConfig.pillarSize = recommended;
       }
    }
    setConfig(newConfig);
  };

  // --- РАСЧЕТ СТОИМОСТИ ---
  useEffect(() => {
    let materialCost = 0;
    const floorArea = config.width * config.length; 

    const baseRate = PRICING.baseTrussStructure.base;
    const widthPenalty = Math.max(0, config.width - 4.5) * PRICING.baseTrussStructure.widthFactor;

    let volumeDiscount = 1.0;
    if (floorArea > 50) volumeDiscount = 0.95;
    if (floorArea > 100) volumeDiscount = 0.90;

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
    if (config.roofType === RoofType.Arched) roofAreaMultiplier = 1.30;
    if (config.roofType === RoofType.SemiArched) roofAreaMultiplier = 1.35;

    const roofArea = floorArea * roofAreaMultiplier;
    materialCost += roofArea * PRICING.roofMaterialPricePerSqm[config.roofMaterial];
    materialCost += floorArea * PRICING.paintMultiplier[config.paintType];

    if (config.hasTrusses) materialCost += floorArea * PRICING.extras.trusses; 
    if (config.hasGutters) materialCost += config.length * 2 * PRICING.extras.gutters;
    if (config.hasSideWalls) {
        const wallArea = (config.length * config.height) + (config.width * config.height);
        materialCost += wallArea * PRICING.extras.sideWalls;
    }
    if (config.hasFoundation) {
        materialCost += pillarCount * 4000; 
    }

    let total = materialCost;
    if (config.hasInstallation) {
      let installPercent = PRICING.extras.installation;
      if (materialCost > 300000) installPercent = 0.22;
      if (materialCost > 600000) installPercent = 0.20;
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

  const calculateBOM = useCallback(() => {
    const pillarCount = (Math.ceil(config.width / 6.0) + 1) * (Math.ceil(config.length / 3.0) + 1);
    return { pillarCount, roofArea: (config.width * config.length * 1.2).toFixed(1) }; 
  }, [config]);

  const handleDownloadReport = () => { alert("Смета скачивается..."); };

  const getOrderPayload = () => {
    const frameColorObj = FRAME_COLORS.find(c => c.hex === config.frameColor);
    const roofColorObj = ROOF_COLORS.find(c => c.hex === config.roofColor);

    const areaFloor = (config.width * config.length).toFixed(2);
    let roofAreaMultiplier = 1.0;
    if (config.roofType === RoofType.Gable) roofAreaMultiplier = 1.25;
    else if (config.roofType === RoofType.Arched) roofAreaMultiplier = 1.35;
    else roofAreaMultiplier = 1.1;
    const areaRoof = (config.width * config.length * roofAreaMultiplier).toFixed(2);

    let peakHeight = config.height;
    if (config.roofType === RoofType.Gable) peakHeight += (config.width / 2) * Math.tan(config.roofSlope * Math.PI / 180);
    else if (config.roofType === RoofType.Arched) peakHeight += config.width * SPECS.trussHeightArch;

    return {
        id: `CFG-${Date.now().toString(36).toUpperCase().slice(-5)}`,
        type: config.roofType,
        width: config.width,
        length: config.length,
        height: config.height,
        height_peak: parseFloat(peakHeight.toFixed(2)),
        slope: config.roofSlope,
        pillar: config.pillarSize,
        area_floor: areaFloor,
        area_roof: areaRoof,
        material: config.roofMaterial,
        paint: config.paintType,
        color_frame: frameColorObj ? frameColorObj.name : config.frameColor,
        color_roof: roofColorObj ? roofColorObj.name : config.roofColor,
        opts: {
            trusses: config.hasTrusses,
            gutters: config.hasGutters,
            walls: config.hasSideWalls,
            found: config.hasFoundation,
            install: config.hasInstallation
        },
        price: price
    };
  };

  const handleOrder = () => {
    const payload = getOrderPayload();
    const dataToSend = JSON.stringify(payload);

    if (window.Telegram && window.Telegram.WebApp) {
        if (typeof window.Telegram.WebApp.sendData === 'function') {
            try {
                window.Telegram.WebApp.sendData(dataToSend);
            } catch (e) {
                console.error("sendData failed:", e);
                setOrderJson(dataToSend);
                setShowBrowserOrderModal(true);
            }
        } else {
            setOrderJson(dataToSend);
            setShowBrowserOrderModal(true);
        }
    } else {
        setOrderJson(dataToSend);
        setShowBrowserOrderModal(true);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-screen overflow-hidden bg-slate-100 font-sans touch-none overscroll-none fixed inset-0">

      {/* HEADER */}
      <div className="absolute top-0 left-0 right-0 z-40 p-4 pointer-events-none flex justify-center lg:justify-start lg:p-6">
        <div className="bg-white/90 backdrop-blur-md px-6 py-2 rounded-xl shadow-sm border border-slate-200/50 text-center lg:text-left pointer-events-auto">
           <h1 className="font-bold text-slate-900 leading-tight">
             Kovka007 <span className="hidden lg:inline text-slate-400">|</span> <span className="text-xs font-normal text-slate-500 uppercase tracking-wider">конструктор</span>
           </h1>
        </div>
      </div>

      <div className="relative w-full flex-grow min-h-0 lg:h-full transition-all duration-300">
         <Scene config={config} />

         {/* ИНФО-ПЛАШКА */}
         <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30 px-4">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-slate-200 text-slate-800 flex items-center gap-3 text-xs sm:text-sm font-medium whitespace-nowrap overflow-x-auto hide-scrollbar max-w-full">
               <div className="flex items-baseline gap-1">
                   <span className="font-bold text-slate-700">{config.length}×{config.width}×{config.height}м</span>
                   <span className="text-[10px] text-slate-400 font-normal">(Д×Ш×В)</span>
               </div>
               <span className="w-px h-3 bg-slate-300 flex-shrink-0"></span>
               <span className="font-bold text-slate-700">{(config.width * config.length).toFixed(1)} м²</span>
               <span className="w-px h-3 bg-slate-300 flex-shrink-0"></span>
               <span className="text-slate-500">~{Math.round(price / (config.width * config.length)).toLocaleString()} ₽/м²</span>
            </div>
         </div>
      </div>

      {/* MOBILE PANEL */}
      <div className="lg:hidden flex flex-col z-30 flex-shrink-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
         <div className="grid grid-cols-2 gap-3 p-3 border-b border-slate-100">
             <button onClick={handleDownloadReport} className="bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl border flex justify-center items-center gap-2 active:scale-95"><FileText size={16} className="text-green-600"/><span className="text-xs">Смета</span></button>
             <a href="https://kovka007.ru/" target="_blank" rel="noopener noreferrer" className="bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl border flex justify-center items-center gap-2 active:scale-95"><Globe size={16} className="text-indigo-600"/><span className="text-xs">Сайт</span></a>
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
                    {config.hasInstallation && (<div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">с монтажом</div>)}
                </div>
                <div className="flex items-end justify-between">
                    <p className="text-3xl font-black text-slate-900 leading-none tracking-tight">{price.toLocaleString()} ₽</p>
                    <div className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded"><TrendingDown size={14}/><span>Выгода {savings.toLocaleString()} ₽</span></div>
                </div>
            </div>
            <button onClick={handleOrder} className="w-full bg-slate-900 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg flex justify-center gap-3 active:scale-[0.98]">
              <span>Оформить заявку</span>
              <div className="opacity-80 ml-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21.9287 2.52309C22.2575 2.15556 21.9904 1.58309 21.5173 1.76459L2.09459 9.30809C1.72484 9.45034 1.72259 9.97734 2.09109 10.1236L6.59109 11.9026C6.88359 12.0181 7.21584 11.9446 7.43934 11.7143L17.7983 1.05609C17.9251 0.925587 18.0661 1.09434 17.9543 1.23534L8.71059 12.9098C8.52684 13.1416 8.52834 13.4678 8.71359 13.6981L14.7353 21.1688C15.0346 21.5398 15.6368 21.4111 15.7681 20.9491L21.9287 2.52309Z" fill="currentColor"/></svg>
              </div>
            </button>
         </div>
      </div>

      {/* DESKTOP SIDEBAR */}
      <div className={`fixed inset-0 z-50 lg:static lg:z-auto transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${isMobileMenuOpen ? 'translate-y-0' : 'translate-y-[100%] lg:translate-y-0'} lg:w-[450px] lg:min-w-[400px] flex-shrink-0 h-full shadow-2xl lg:shadow-none flex flex-col bg-white`}>
        <div className="lg:hidden absolute top-4 right-4 z-50"><button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-full"><X size={24}/></button></div>
        <Controls config={config} onChange={handleConfigChange} price={price} onOrder={handleOrder} />
      </div>

      {/* DESKTOP BUTTONS */}
      <div className="hidden lg:flex fixed bottom-6 left-6 z-50 gap-4 items-center">
         <button onClick={handleDownloadReport} className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-3 transition-all active:scale-95">
            <div className="p-1.5 bg-green-100 rounded text-green-700"><FileText size={18} /></div>
            <span className="text-sm">Скачать смету</span>
         </button>
         <a href="https://kovka007.ru/" target="_blank" rel="noopener noreferrer" className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-3 transition-all active:scale-95 no-underline">
             <div className="p-1.5 bg-indigo-100 rounded text-indigo-700"><Globe size={18} /></div>
             <span className="text-sm">Сайт</span>
         </a>
      </div>

      <BrowserOrderModal 
          isOpen={showBrowserOrderModal} 
          onClose={() => setShowBrowserOrderModal(false)}
          orderData={orderJson}
      />
    </div>
  );
}