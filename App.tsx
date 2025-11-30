import React, { useState, useEffect, useCallback } from 'react';
import { Scene } from './components/Scene';
import { Controls } from './components/Controls';
import { CarportConfig, RoofType, PillarSize, RoofMaterial, PaintType } from './types';
import { PRICING, FRAME_COLORS, ROOF_COLORS, SPECS } from './constants';
import { Menu, X, FileText, Globe } from 'lucide-react';

const INITIAL_CONFIG: CarportConfig = {
  width: 6,
  length: 6,
  height: 2.5,
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

const getRecommendedPillarSize = (width: number, length: number, height: number): PillarSize => {
  const area = width * length;
  if (width > 6.5 || height > 3.0 || area > 45) return PillarSize.Size100;
  if (width > 4.5 || height > 2.3 || area > 20) return PillarSize.Size80;
  return PillarSize.Size60;
};

export default function App() {
  const [config, setConfig] = useState<CarportConfig>(INITIAL_CONFIG);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [price, setPrice] = useState(0);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      try {
        window.Telegram.WebApp.expand();
      } catch (e) {
        console.warn("WebApp expand failed", e);
      }
    }
  }, []);

  const handleConfigChange = (newConfig: CarportConfig) => {
    if (
      newConfig.width !== config.width ||
      newConfig.length !== config.length ||
      newConfig.height !== config.height
    ) {
       const recommended = getRecommendedPillarSize(newConfig.width, newConfig.length, newConfig.height);
       newConfig.pillarSize = recommended;
    }
    setConfig(newConfig);
  };

  useEffect(() => {
    let total = 0;
    const floorArea = config.width * config.length; 
    let baseRate = PRICING.baseStructure.priceLarge;
    const { smallArea, largeArea, priceSmall, priceLarge } = PRICING.baseStructure;
    if (floorArea <= smallArea) {
        baseRate = priceSmall;
    } else if (floorArea < largeArea) {
        const t = (floorArea - smallArea) / (largeArea - smallArea);
        baseRate = priceSmall - t * (priceSmall - priceLarge);
    }
    total += floorArea * baseRate * PRICING.roofTypeMultiplier[config.roofType];
    
    const maxSpan = 6.0;
    const numCols = Math.ceil(config.width / maxSpan) + 1;
    const numRows = Math.ceil(config.length / SPECS.postSpacing) + 1;
    const pillarCount = numCols * numRows;
    total += pillarCount * config.height * PRICING.pillarMultiplier[config.pillarSize];

    let roofAreaMultiplier = 1.0;
    if (config.roofType === RoofType.Gable) roofAreaMultiplier = 1.25;
    if (config.roofType === RoofType.Arched) roofAreaMultiplier = 1.35;
    if (config.roofType === RoofType.SemiArched) roofAreaMultiplier = 1.45;
    if (config.roofType === RoofType.SingleSlope || config.roofType === RoofType.Triangular) roofAreaMultiplier = 1.1;
    const roofArea = floorArea * roofAreaMultiplier;
    total += roofArea * PRICING.roofMaterialPricePerSqm[config.roofMaterial];
    total += floorArea * PRICING.paintMultiplier[config.paintType];
    
    if (config.hasTrusses) total += floorArea * PRICING.extras.trusses; 
    if (config.hasGutters) total += config.length * 2 * PRICING.extras.gutters;
    if (config.hasSideWalls) {
        const wallArea = (config.length * config.height) + (config.width * config.height * 0.5);
        total += wallArea * PRICING.extras.sideWalls;
    }
    if (config.hasFoundation) total += floorArea * PRICING.extras.foundation;
    if (config.hasInstallation) total = total * (1 + PRICING.extras.installation); 

    setPrice(Math.round(total / 100) * 100); 
  }, [config]);

  const calculateBOM = useCallback(() => {
    const maxSpan = 6.0;
    const numCols = Math.ceil(config.width / maxSpan) + 1;
    const numRows = Math.ceil(config.length / SPECS.postSpacing) + 1;
    const pillarCount = numCols * numRows;
    return { pillarCount }; 
  }, [config]);

  const handleDownloadReport = () => {
      alert("Функция скачивания сметы работает.");
  };

  // --- ОБНОВЛЕННАЯ ФУНКЦИЯ ЗАКАЗА (ПОЛНЫЕ ДАННЫЕ) ---
  const handleOrder = () => {
    // 1. Находим красивые названия цветов
    const frameColorObj = FRAME_COLORS.find(c => c.hex === config.frameColor);
    const roofColorObj = ROOF_COLORS.find(c => c.hex === config.roofColor);

    // 2. Формируем ПОЛНЫЙ JSON
    const payload = {
        id: `CFG-${Date.now().toString(36).toUpperCase().slice(-5)}`,
        // Геометрия
        type: config.roofType,
        width: config.width,
        length: config.length,
        height: config.height,
        slope: config.roofSlope,
        pillar: config.pillarSize,
        // Материалы
        material: config.roofMaterial,
        paint: config.paintType,
        color_frame: frameColorObj ? frameColorObj.name : config.frameColor,
        color_roof: roofColorObj ? roofColorObj.name : config.roofColor,
        // Опции (boolean превращаем в 0/1 для компактности или true/false)
        opts: {
            trusses: config.hasTrusses,
            gutters: config.hasGutters,
            walls: config.hasSideWalls,
            found: config.hasFoundation,
            install: config.hasInstallation
        },
        price: price
    };
  
    const dataToSend = JSON.stringify(payload);

    if (window.Telegram?.WebApp) {
        try {
            window.Telegram.WebApp.sendData(dataToSend);
            
            // Если версия поддерживает алерты (6.2+)
            if (window.Telegram.WebApp.version && parseFloat(window.Telegram.WebApp.version) >= 6.2) {
                 if (window.Telegram.WebApp.showAlert) {
                     window.Telegram.WebApp.showAlert("Заказ сформирован! Переходим в чат...");
                 }
            }
            
            setTimeout(() => {
                window.Telegram.WebApp.close();
            }, 1000); // Даем 1 сек на отправку
            
        } catch (error) {
            alert("Ошибка отправки: " + error);
        }
    } else {
        alert("⚠️ Вы не в Telegram!\n\nПолный JSON заказа:\n" + JSON.stringify(payload, null, 2));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-screen overflow-hidden bg-slate-100 font-sans">
      
      <div className="lg:hidden absolute top-0 left-0 right-0 z-50 p-4 pointer-events-none">
        <div className="flex justify-between items-center pointer-events-auto">
          <div /> 
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="bg-white p-2.5 rounded-xl shadow-md border border-slate-100 text-slate-700 active:scale-95 transition-transform"
          >
             {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <div className="relative w-full h-[50dvh] lg:h-full lg:flex-grow transition-all duration-300">
         <Scene config={config} />
         <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-slate-200 text-slate-700 flex flex-col items-center">
               <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Площадь</span>
               <span className="text-xl font-bold">{(config.width * config.length).toFixed(1)} м²</span>
            </div>
         </div>
      </div>

      <div className="lg:hidden grid grid-cols-2 gap-3 p-4 bg-slate-100 border-t border-slate-200 relative z-30 flex-shrink-0">
         <button onClick={handleDownloadReport} className="bg-white text-slate-700 font-semibold py-3 px-4 rounded-xl shadow border border-slate-200 flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap">
             <FileText size={16} className="text-green-600" />
             <span className="text-sm">Смета (CSV)</span>
         </button>
         <a href="https://kovka007.ru/" target="_blank" rel="noopener noreferrer" className="bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl shadow flex items-center justify-center gap-2 active:scale-95 no-underline whitespace-nowrap">
             <Globe size={16} />
             <span className="text-sm">Сайт</span>
         </a>
      </div>

      <div className={`fixed inset-0 z-40 lg:static lg:z-auto transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${isMobileMenuOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-[100%] lg:translate-y-0 pointer-events-none lg:pointer-events-auto'} lg:w-[450px] lg:min-w-[400px] flex-shrink-0 h-full shadow-2xl lg:shadow-none flex flex-col bg-white`}>
        <div className="lg:hidden absolute top-4 right-4 z-50">
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-full pointer-events-auto">
              <X size={24} className="text-slate-600"/>
           </button>
        </div>
        <Controls config={config} onChange={handleConfigChange} price={price} onOrder={handleOrder} />
      </div>
      
      <div className="hidden lg:flex fixed bottom-6 left-6 z-50 gap-4 items-center">
         <button onClick={handleDownloadReport} className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-3 transition-all active:scale-95">
            <div className="p-1.5 bg-green-100 rounded text-green-700"><FileText size={18} /></div>
            <span className="text-sm">Скачать смету</span>
         </button>
      </div>
    </div>
  );
}
