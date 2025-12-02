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

// Модальное окно для браузера (когда нельзя отправить данные автоматически)
const BrowserOrderModal = ({ isOpen, onClose, onCopy }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">Оформить заявку</h3><button onClick={onClose}><X/></button></div>
                <div className="space-y-3">
                    <button onClick={onCopy} className="w-full bg-[#2AABEE] text-white p-4 rounded-xl flex items-center gap-3 justify-center font-bold shadow-lg shadow-blue-200">
                        <Send size={20}/> <span>Скопировать код заказа</span>
                    </button>
                    <p className="text-xs text-slate-400 text-center mt-2 px-4">
                        Нажмите кнопку выше, код скопируется. Затем вернитесь в бота и отправьте этот код сообщением.
                    </p>
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

  // --- Инициализация Telegram WebApp ---
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      try { 
          window.Telegram.WebApp.expand(); 
          // Фикс высоты для iOS (убирает скачки интерфейса)
          document.body.style.height = window.Telegram.WebApp.viewportHeight + 'px';
      } catch (e) { console.warn("WebApp expand error:", e); }
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

  // --- СКАЧИВАНИЕ СМЕТЫ (С Share API для мобилок) ---
  const handleDownloadReport = async () => {
      const bom = calculateBOM();
      const date = new Date().toLocaleDateString('ru-RU');

      const pillarProfile = config.pillarSize === PillarSize.Size60 ? '60x60x3' : config.pillarSize === PillarSize.Size80 ? '80x80x3' : '100x100x4';
      const beamProfile = config.pillarSize === PillarSize.Size100 ? '100x100x4' : '80x80x3';

      let peakHeight = config.height;
      if (config.roofType === RoofType.Gable) {
          peakHeight += (config.width / 2) * Math.tan(config.roofSlope * Math.PI / 180);
      } else if (config.roofType === RoofType.Arched) {
          peakHeight += config.width * SPECS.trussHeightArch;
      }

      const rows = [
          ['Смета на материалы для навеса', date],
          ['Тип', config.roofType],
          ['Размеры (по столбам)', `${config.width}x${config.length}м`],
          ['Высота столбов', `${config.height}м`],
          ['Высота в пике (примерно)', `~${peakHeight.toFixed(2)}м`],
          ['Площадь кровли', `${bom.roofArea} м2`],
          ['Опции', [
              config.hasTrusses ? 'Усиленные фермы' : '', 
              config.hasGutters ? 'Водостоки' : '',
              config.hasSideWalls ? 'Зашивка' : '',
              config.hasFoundation ? 'Фундамент' : '',
              config.hasInstallation ? 'Монтаж' : ''
          ].filter(Boolean).join(', ')],
          ['ИТОГОВАЯ СТОИМОСТЬ', `${price.toLocaleString()} RUB`],
          [],
          ['Наименование', 'Профиль/Материал', 'Кол-во (шт)', 'Длина 1 шт (м)', 'Всего (м/м2)', 'Примечание'],
          ['ФУНДАМЕНТ', '', '', '', '', ''],
          ['Бетонирование', 'Бетон М300', bom.pillarCount, '-', '-', config.hasFoundation ? 'Включено' : 'Не включено'],
          ['МЕТАЛЛОКАРКАС', '', '', '', '', ''],
          ['Столбы', `Труба ${pillarProfile}`, bom.pillarCount, config.height, '-', ''],
          ['Балки', `Труба ${beamProfile}`, '-', '-', '-', ''],
          ['Фермы', 'Труба 40x40 / 40x20', '-', '-', '-', ''],
          ['Обрешетка', 'Труба 40x20', '-', '-', '-', ''],
          ['КРОВЛЯ', '', '', '', '', ''],
          ['Покрытие', config.roofMaterial, '-', '-', bom.roofArea, '']
      ];

      const csvContent = "\uFEFF" + rows.map(e => e.join(";")).join("\n");
      const fileName = `smeta_kovka007_${date.replace(/\./g, '-')}.csv`;

      if (navigator.canShare) {
        try {
            const file = new File([csvContent], fileName, { type: 'text/csv' });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Смета Kovka007',
                    text: `Расчет стоимости навеса ${config.width}x${config.length}м`
                });
                return;
            }
        } catch (err) {
            console.warn('Sharing failed, falling back to download', err);
        }
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- СБОР ДАННЫХ ЗАКАЗА ---
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

  // --- ОТПРАВКА ЗАКАЗА ---
  const handleOrder = () => {
    const payload = getOrderPayload();
    const dataToSend = JSON.stringify(payload);

    // Проверяем наличие WebApp
    if (window.Telegram && window.Telegram.WebApp) {
        // Проверяем поддержку метода sendData
        if (typeof window.Telegram.WebApp.sendData === 'function') {
            try {
                window.Telegram.WebApp.sendData(dataToSend);
                // Окно должно закрыться само после отправки.
                // Если не закрылось - значит запущено не через кнопку клавиатуры.
            } catch (e) {
                console.error("sendData failed:", e);
                fallbackCopy(dataToSend);
            }
        } else {
            // Если метод недоступен (старая версия или не тот контекст)
            fallbackCopy(dataToSend);
        }
    } else {
        // Если открыто в браузере
        setShowBrowserOrderModal(true);
    }
  };

  const fallbackCopy = (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
          alert("📋 Данные заказа скопированы!\n\n1. Вернитесь в чат с ботом @Kovka007bot\n2. Вставьте текст и отправьте.");
          // Пробуем открыть бота (может не сработать в WebView, но полезно для браузера)
          window.location.href = "https://t.me/Kovka007bot";
      }).catch(() => {
          alert("⚠️ Не удалось скопировать данные. Пожалуйста, скопируйте их вручную из консоли (если умеете) или откройте сайт через Telegram.");
      });
  };

  return (
    // Классы touch-none и overscroll-none предотвращают "резинку" на iOS
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
         <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-slate-200 text-slate-700 flex flex-col items-center">
               <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Площадь</span>
               <div className="flex items-center gap-2">
                   <span className="text-xl font-bold">{(config.width * config.length).toFixed(1)} м²</span>
                   <span className="text-xs text-slate-500 font-medium border-l border-slate-300 pl-2">
                       ~{Math.round(price / (config.width * config.length)).toLocaleString()} ₽/м²
                   </span>
               </div>
            </div>
         </div>
      </div>

      {/* MOBILE PANEL */}
      <div className="lg:hidden flex flex-col z-30 flex-shrink-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">

         <div className="grid grid-cols-2 gap-3 p-3 border-b border-slate-100">
             <button onClick={handleDownloadReport} className="bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl border flex justify-center items-center gap-2 active:scale-95"><FileText size={16} className="text-green-600"/><span className="text-xs">Смета</span></button>
             <a href="https://kovka007.ru/" target="_blank" rel="noopener noreferrer" className="bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl border flex justify-center items-center gap-2 active:scale-95"><Globe size={16} className="text-indigo-600"/><span className="text-xs">Сайт</span></a>
         </div>

         {/* КНОПКА НАСТРОЕК (ВОЗВРАЩЕНА) */}
         <div className="px-4 pt-3">
            <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
            >
                <Settings2 size={18} />
                <span>Настроить параметры</span>
            </button>
         </div>

         <div className="p-4">
            <div className="flex items-end justify-between mb-4">
                 <div>
                    <span className="text-slate-400 line-through text-xs font-medium">{oldPrice.toLocaleString()} ₽</span>
                    <div className="text-2xl font-black text-slate-900">{price.toLocaleString()} ₽</div>
                 </div>
                 <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex gap-1"><TrendingDown size={14}/> -20%</div>
            </div>
            <button onClick={handleOrder} className="w-full bg-slate-900 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg flex justify-center gap-3 active:scale-[0.98]">
              <span>Оформить заявку</span>
            </button>
         </div>
      </div>

      {/* DESKTOP SIDEBAR */}
      <div className={`fixed inset-0 z-50 lg:static lg:z-auto transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${isMobileMenuOpen ? 'translate-y-0' : 'translate-y-[100%] lg:translate-y-0'} lg:w-[450px] lg:min-w-[400px] flex-shrink-0 h-full shadow-2xl lg:shadow-none flex flex-col bg-white`}>
        <div className="lg:hidden absolute top-4 right-4 z-50"><button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-full"><X size={24}/></button></div>
        <Controls config={config} onChange={handleConfigChange} price={price} onOrder={handleOrder} />
      </div>

      <div className="hidden lg:flex fixed bottom-6 left-6 z-50 gap-4 items-center">
         <button onClick={handleDownloadReport} className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-3 transition-all active:scale-95">
            <div className="p-1.5 bg-green-100 rounded text-green-700"><FileText size={18} /></div>
            <span className="text-sm">Скачать смету</span>
         </button>
      </div>

      <BrowserOrderModal 
          isOpen={showBrowserOrderModal} 
          onClose={() => setShowBrowserOrderModal(false)}
          onCopy={() => { fallbackCopy(JSON.stringify(getOrderPayload())); setShowBrowserOrderModal(false); }}
      />
    </div>
  );
}