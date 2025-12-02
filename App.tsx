import React, { useState, useEffect, useCallback } from 'react';
import { Scene } from './components/Scene';
import { Controls } from './components/Controls';
import { CarportConfig, RoofType, PillarSize, RoofMaterial, PaintType } from './types';
import { PRICING, FRAME_COLORS, ROOF_COLORS, SPECS } from './constants';
import { Menu, X, FileText, Globe, TrendingDown, Settings2, Copy, Download, Mail, Send } from 'lucide-react';

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

// --- Modal Component ---
const BrowserOrderModal = ({ 
    isOpen, 
    onClose, 
    onCopy, 
    onEmail 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onCopy: () => void; 
    onEmail: () => void; 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 animate-fade-in-up">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-slate-900">Как оформить заказ?</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>
                
                <p className="text-sm text-slate-500 mb-6">
                    Вы находитесь в браузере. Выберите удобный способ отправки заявки:
                </p>

                <div className="space-y-3">
                    {/* Вариант 1: Telegram */}
                    <button 
                        onClick={onCopy}
                        className="w-full bg-[#2AABEE] hover:bg-[#229ED9] text-white p-4 rounded-xl flex items-center justify-between group transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Send size={20} />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-sm">Через Telegram Бот</div>
                                <div className="text-xs text-blue-100 opacity-90">Скопировать код и открыть бот</div>
                            </div>
                        </div>
                        <Copy size={18} className="opacity-70 group-hover:opacity-100" />
                    </button>

                    {/* Вариант 2: Почта / Смета */}
                    <button 
                        onClick={onEmail}
                        className="w-full bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700 p-4 rounded-xl flex items-center justify-between group transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <Mail size={20} />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-sm">Скачать смету и отправить</div>
                                <div className="text-xs text-slate-400">Excel файл на почту</div>
                            </div>
                        </div>
                        <Download size={18} className="text-slate-400 group-hover:text-slate-600" />
                    </button>
                </div>
                
                <div className="mt-6 text-center">
                    <a href="tel:+79990000000" className="text-xs text-slate-400 hover:text-indigo-600 transition-colors">
                        Или позвоните нам: +7 (999) 000-00-00
                    </a>
                </div>
            </div>
        </div>
    );
};

export default function App() {
  const [config, setConfig] = useState<CarportConfig>(INITIAL_CONFIG);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBrowserOrderModal, setShowBrowserOrderModal] = useState(false);
  const [price, setPrice] = useState(0);

  // --- Динамический SEO Заголовок ---
  useEffect(() => {
    const typeNameMap: Record<RoofType, string> = {
      [RoofType.SingleSlope]: 'Односкатный',
      [RoofType.Gable]: 'Двускатный',
      [RoofType.Arched]: 'Арочный',
      [RoofType.Triangular]: 'Треугольный',
      [RoofType.SemiArched]: 'Полуарочный'
    };
    const title = `${typeNameMap[config.roofType]} навес ${config.width}x${config.length}м | Kovka007`;
    document.title = title;
  }, [config.roofType, config.width, config.length]);

  // --- Инициализация Telegram WebApp ---
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

  // --- Расчет стоимости ---
  useEffect(() => {
    let total = 0;
    const floorArea = config.width * config.length; 
    
    // 1. Каркас
    let baseRate = PRICING.baseStructure.priceLarge;
    const { smallArea, largeArea, priceSmall, priceLarge } = PRICING.baseStructure;

    if (floorArea <= smallArea) {
        baseRate = priceSmall;
    } else if (floorArea < largeArea) {
        const t = (floorArea - smallArea) / (largeArea - smallArea);
        baseRate = priceSmall - t * (priceSmall - priceLarge);
    }
    total += floorArea * baseRate * PRICING.roofTypeMultiplier[config.roofType];

    // 2. Столбы
    const maxSpan = 6.0;
    const numCols = Math.ceil(config.width / maxSpan) + 1;
    const numRows = Math.ceil(config.length / SPECS.postSpacing) + 1;
    const pillarCount = numCols * numRows;
    total += pillarCount * config.height * PRICING.pillarMultiplier[config.pillarSize];

    // 3. Материал кровли
    let roofAreaMultiplier = 1.0;
    if (config.roofType === RoofType.Gable) roofAreaMultiplier = 1.25;
    if (config.roofType === RoofType.Arched) roofAreaMultiplier = 1.35;
    if (config.roofType === RoofType.SemiArched) roofAreaMultiplier = 1.45;
    if (config.roofType === RoofType.SingleSlope || config.roofType === RoofType.Triangular) roofAreaMultiplier = 1.1;
    
    const roofArea = floorArea * roofAreaMultiplier;
    total += roofArea * PRICING.roofMaterialPricePerSqm[config.roofMaterial];

    // 4. Покраска и допы
    total += floorArea * PRICING.paintMultiplier[config.paintType];
    if (config.hasTrusses) total += floorArea * PRICING.extras.trusses; 
    if (config.hasGutters) total += config.length * 2 * PRICING.extras.gutters;
    if (config.hasSideWalls) {
        const wallArea = (config.length * config.height) + (config.width * config.height * 0.5);
        total += wallArea * PRICING.extras.sideWalls;
    }
    if (config.hasFoundation) {
        total += floorArea * PRICING.extras.foundation;
    }

    // 5. Монтаж
    if (config.hasInstallation) {
      total = total * (1 + PRICING.extras.installation); 
    }

    setPrice(Math.round(total / 100) * 100); 
  }, [config]);

  const oldPrice = Math.round(price * 1.2);
  const savings = oldPrice - price;

  // --- CSV (BOM) Calculation ---
  const calculateBOM = useCallback(() => {
    const { width, length, height, roofType, roofSlope, pillarSize } = config;

    // 1. Столбы
    const maxSpan = 6.0;
    const numCols = Math.ceil(width / maxSpan) + 1;
    const numRows = Math.ceil(length / SPECS.postSpacing) + 1;
    const pillarCount = numCols * numRows;
    
    // 2. Балки (Mauerlat/Beams)
    const beamLength = length;
    const beamCount = numCols;
    const totalBeamLength = beamCount * beamLength;

    // 3. Фермы
    const trussCount = Math.ceil(length / 1.5) + 1;
    let approxSteelPerTruss = 0;
    
    if (roofType === RoofType.Gable) {
        const rad = (roofSlope * Math.PI) / 180;
        const slopeLen = (width / 2) / Math.cos(rad);
        approxSteelPerTruss = width + (slopeLen * 2) + (width * 0.8);
    } else if (roofType === RoofType.Arched) {
        const arcLen = width * 1.2;
        approxSteelPerTruss = (arcLen * 2) + (width * 1.0);
    } else {
        approxSteelPerTruss = width * 2.5;
    }

    // 4. Обрешетка (Purlins)
    const overhang = 0.4;
    const totalRoofWidth = width + overhang * 2;
    const purlinCount = Math.ceil(totalRoofWidth / 0.6) + 1;
    const purlinLength = length + overhang * 2;
    const totalPurlinLength = purlinCount * purlinLength;

    // 5. Площадь кровли
    let roofAreaMultiplier = 1.0;
    if (roofType === RoofType.Gable) roofAreaMultiplier = 1.25;
    else if (roofType === RoofType.Arched) roofAreaMultiplier = 1.25;
    else if (roofType === RoofType.SemiArched) roofAreaMultiplier = 1.35;
    else roofAreaMultiplier = 1.1;

    const roofArea = (width * length * roofAreaMultiplier).toFixed(2);

    return {
        pillarCount,
        pillarTotalHeight: pillarCount * height,
        beamCount,
        totalBeamLength,
        trussCount,
        totalTrussSteel: trussCount * approxSteelPerTruss,
        purlinCount,
        totalPurlinLength,
        roofArea
    };
  }, [config]);

  const handleDownloadReport = () => {
      const bom = calculateBOM();
      const date = new Date().toLocaleDateString('ru-RU');
      
      const pillarProfile = config.pillarSize === PillarSize.Size60 ? '60x60x3' : config.pillarSize === PillarSize.Size80 ? '80x80x3' : '100x100x4';
      const beamProfile = config.pillarSize === PillarSize.Size100 ? '100x100x4' : '80x80x3';
      
      let peakHeight = config.height;
      if (config.roofType === RoofType.Gable) {
          peakHeight += (config.width / 2) * Math.tan(config.roofSlope * Math.PI / 180);
      } else if (config.roofType === RoofType.SingleSlope || config.roofType === RoofType.Triangular) {
          peakHeight += config.width * Math.tan(config.roofSlope * Math.PI / 180);
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
          ['Столбы', `Труба ${pillarProfile}`, bom.pillarCount, config.height, bom.pillarTotalHeight.toFixed(1), ''],
          ['Балки (Мауэрлат)', `Труба ${beamProfile}`, bom.beamCount, bom.totalBeamLength / bom.beamCount, bom.totalBeamLength.toFixed(1), ''],
          ['Фермы', 'Труба 40x40x2 / 40x20x2', bom.trussCount, '~' + (bom.totalTrussSteel / bom.trussCount).toFixed(1), bom.totalTrussSteel.toFixed(1), ''],
          ['Обрешетка', 'Труба 40x20x2', bom.purlinCount, (bom.totalPurlinLength / bom.purlinCount).toFixed(2), bom.totalPurlinLength.toFixed(1), ''],
          ['КРОВЛЯ', '', '', '', '', ''],
          ['Покрытие', config.roofMaterial, '-', '-', bom.roofArea, '']
      ];

      const csvContent = "\uFEFF" + rows.map(e => e.join(";")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `smeta_kovka007_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const getOrderPayload = () => {
    const frameColorObj = FRAME_COLORS.find(c => c.hex === config.frameColor);
    const roofColorObj = ROOF_COLORS.find(c => c.hex === config.roofColor);

    const areaFloor = (config.width * config.length).toFixed(2);
    let roofAreaMultiplier = 1.0;
    if (config.roofType === RoofType.Gable) roofAreaMultiplier = 1.25;
    else if (config.roofType === RoofType.Arched) roofAreaMultiplier = 1.35;
    else if (config.roofType === RoofType.SemiArched) roofAreaMultiplier = 1.45;
    else roofAreaMultiplier = 1.1;
    const areaRoof = (config.width * config.length * roofAreaMultiplier).toFixed(2);

    let peakHeight = config.height;
    if (config.roofType === RoofType.Gable) {
        peakHeight += (config.width / 2) * Math.tan(config.roofSlope * Math.PI / 180);
    } else if (config.roofType === RoofType.SingleSlope || config.roofType === RoofType.Triangular) {
        peakHeight += config.width * Math.tan(config.roofSlope * Math.PI / 180);
    } else if (config.roofType === RoofType.Arched) {
        peakHeight += config.width * SPECS.trussHeightArch;
    }

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

    // 1. Приоритет: Telegram WebApp
    if (window.Telegram?.WebApp?.initData) {
        try {
            window.Telegram.WebApp.sendData(dataToSend);
            setTimeout(() => {
                window.Telegram.WebApp.close();
            }, 500); 
        } catch (error) {
            console.error(error);
            // Если ошибка в WebApp, fallback к буферу обмена
            fallbackCopy(dataToSend);
        }
    } else {
        // 2. Fallback: Браузерная версия -> Открываем модалку выбора
        setShowBrowserOrderModal(true);
    }
  };

  const fallbackCopy = (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
          alert("📋 Данные заказа скопированы!\n\n1. Перейдите в бот @Kovka007bot\n2. Вставьте текст и отправьте.");
          window.open('https://t.me/Kovka007bot', '_blank');
      }).catch(() => {
          alert("⚠️ Не удалось скопировать данные.");
      });
  };

  // --- Handlers for Browser Modal ---
  const handleTelegramCopy = () => {
      const payload = getOrderPayload();
      fallbackCopy(JSON.stringify(payload));
      setShowBrowserOrderModal(false);
  };

  const handleEmailSmeta = () => {
      handleDownloadReport();
      const subject = encodeURIComponent("Заказ на навес Kovka007");
      const body = encodeURIComponent(`Здравствуйте! \n\nЯ рассчитал навес в конструкторе (${config.width}x${config.length}м). \nФайл сметы прилагаю (нужно прикрепить скачанный файл). \n\nМой телефон: `);
      window.location.href = `mailto:info@kovka007.ru?subject=${subject}&body=${body}`;
      setShowBrowserOrderModal(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-screen overflow-hidden bg-slate-100 font-sans">
      
      {/* HEADER / LOGO SECTION - DESKTOP TOP LEFT, MOBILE CENTER */}
      {/* Z-40 to be covered by Z-50 sidebar */}
      <div className="absolute top-0 left-0 right-0 z-40 p-4 pointer-events-none flex justify-center lg:justify-start lg:p-6">
        <div className="bg-white/90 backdrop-blur-md px-6 py-2 rounded-xl shadow-sm border border-slate-200/50 text-center lg:text-left pointer-events-auto">
           <h1 className="font-bold text-slate-900 leading-tight">
             Kovka007
             <br className="lg:hidden"/>
             <span className="lg:hidden text-xs font-normal text-slate-500 uppercase tracking-wider">конструктор навесов</span>
             <span className="hidden lg:inline text-slate-400 font-normal mx-2">|</span>
             <span className="hidden lg:inline text-xs font-normal text-slate-500 uppercase tracking-wider">конструктор навесов</span>
           </h1>
        </div>
      </div>

      <div className="relative w-full flex-grow min-h-0 lg:h-full transition-all duration-300">
         <Scene config={config} />
         
         {/* Площадь (Overlay) */}
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

      {/* MOBILE BOTTOM CONTROL PANEL */}
      <div className="lg:hidden flex flex-col z-30 flex-shrink-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
         
         {/* Top Row: Estimate + Site buttons */}
         <div className="grid grid-cols-2 gap-3 p-3 border-b border-slate-100">
             <button onClick={handleDownloadReport} className="bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl border border-slate-200 flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap">
                 <FileText size={16} className="text-green-600" />
                 <span className="text-xs">Смета (CSV)</span>
             </button>
             <a href="https://kovka007.ru/" target="_blank" rel="noopener noreferrer" className="bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl border border-slate-200 flex items-center justify-center gap-2 active:scale-95 no-underline whitespace-nowrap">
                 <Globe size={16} className="text-indigo-600" />
                 <span className="text-xs">Сайт</span>
             </a>
         </div>

         {/* Middle Row: Edit Button */}
         <div className="px-4 pt-3">
            <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
            >
                <Settings2 size={18} />
                <span>Редактировать параметры</span>
            </button>
         </div>

         {/* Bottom Row: Price & Order */}
         <div className="p-4 pb-8 safe-area-bottom">
            <div className="flex items-end justify-between mb-4">
                 <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 line-through text-xs font-medium decoration-slate-400/50">
                            {oldPrice.toLocaleString()} ₽
                        </span>
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                            -20%
                        </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 leading-none tracking-tight mt-0.5">
                        {price.toLocaleString()} ₽
                    </div>
                 </div>
                 
                 <div className="flex flex-col items-end gap-1">
                    {config.hasInstallation && (
                        <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold w-fit">
                            с монтажом
                        </span>
                    )}
                    <div className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded h-fit">
                        <TrendingDown size={14} />
                        <span>Выгода {savings.toLocaleString()} ₽</span>
                    </div>
                 </div>
            </div>
            
            <button type="button" onClick={handleOrder} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
              <span>Оформить заявку</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="opacity-80">
                <path d="M21.9287 2.52309C22.2575 2.15556 21.9904 1.58309 21.5173 1.76459L2.09459 9.30809C1.72484 9.45034 1.72259 9.97734 2.09109 10.1236L6.59109 11.9026C6.88359 12.0181 7.21584 11.9446 7.43934 11.7143L17.7983 1.05609C17.9251 0.925587 18.0661 1.09434 17.9543 1.23534L8.71059 12.9098C8.52684 13.1416 8.52834 13.4678 8.71359 13.6981L14.7353 21.1688C15.0346 21.5398 15.6368 21.4111 15.7681 20.9491L21.9287 2.52309Z" fill="currentColor"/>
              </svg>
            </button>
         </div>
      </div>

      {/* DESKTOP SIDEBAR - Z-50 to cover Header */}
      <div className={`fixed inset-0 z-50 lg:static lg:z-auto transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${isMobileMenuOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-[100%] lg:translate-y-0 pointer-events-none lg:pointer-events-auto'} lg:w-[450px] lg:min-w-[400px] flex-shrink-0 h-full shadow-2xl lg:shadow-none flex flex-col bg-white`}>
        <div className="lg:hidden absolute top-4 right-4 z-50">
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-full pointer-events-auto">
              <X size={24} className="text-slate-600"/>
           </button>
        </div>
        <Controls config={config} onChange={handleConfigChange} price={price} onOrder={handleOrder} />
      </div>
      
      {/* DESKTOP BUTTONS */}
      <div className="hidden lg:flex fixed bottom-6 left-6 z-50 gap-4 items-center">
         <button 
            onClick={handleDownloadReport}
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-3 transition-all active:scale-95"
         >
            <div className="p-1.5 bg-green-100 rounded text-green-700"><FileText size={18} /></div>
            <span className="text-sm">Скачать смету</span>
         </button>
         <a 
            href="https://kovka007.ru/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-3 transition-all active:scale-95 no-underline"
         >
             <div className="p-1.5 bg-indigo-100 rounded text-indigo-700"><Globe size={18} /></div>
             <span className="text-sm">Сайт</span>
         </a>
      </div>

      {/* MODAL FOR BROWSER USERS */}
      <BrowserOrderModal 
          isOpen={showBrowserOrderModal} 
          onClose={() => setShowBrowserOrderModal(false)}
          onCopy={handleTelegramCopy}
          onEmail={handleEmailSmeta}
      />
    </div>
  );
}