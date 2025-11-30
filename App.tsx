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

  // --- Логика формирования сметы (BOM) ---
  const calculateBOM = useCallback(() => {
    const { width, length, height, roofType, roofSlope, pillarSize } = config;

    // 1. Столбы
    const maxSpan = 6.0;
    const numCols = Math.ceil(width / maxSpan) + 1;
    const numRows = Math.ceil(length / SPECS.postSpacing) + 1;
    const pillarCount = numCols * numRows;
    
    // 2. Балки (Mauerlat/Beams) - идут вдоль длины по каждому ряду столбов
    const beamLength = length;
    const beamCount = numCols;
    const totalBeamLength = beamCount * beamLength;

    // 3. Фермы
    const trussCount = Math.ceil(length / 1.5) + 1;
    let approxSteelPerTruss = 0;
    
    // Приблизительный расчет длины трубы на одну ферму
    if (roofType === RoofType.Gable) {
        const rad = (roofSlope * Math.PI) / 180;
        const slopeLen = (width / 2) / Math.cos(rad);
        approxSteelPerTruss = width + (slopeLen * 2) + (width * 0.8); // Нижний пояс + верхний пояс + раскосы
    } else if (roofType === RoofType.Arched) {
        const arcLen = width * 1.2; // Примерно
        approxSteelPerTruss = (arcLen * 2) + (width * 1.0); // 2 дуги + раскосы
    } else {
        approxSteelPerTruss = width * 2.5; // Усредненно для других типов
    }

    // 4. Обрешетка (Purlins)
    // Шаг 0.6м, покрытие ширины + свесы
    const overhang = 0.4;
    const totalRoofWidth = width + overhang * 2;
    const purlinCount = Math.ceil(totalRoofWidth / 0.6) + 1;
    const purlinLength = length + overhang * 2;
    const totalPurlinLength = purlinCount * purlinLength;

    // 5. Площадь кровли (для поликарбоната/черепицы)
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
      const beamProfile = config.pillarSize === PillarSize.Size100 ? '100x100x4' : '80x80x3'; // Балки обычно чуть меньше или такие же
      
      // Расчет геометрии для шапки
      let roofInfo = '';
      if (config.roofType === RoofType.Arched || config.roofType === RoofType.SemiArched) {
          roofInfo = `Хорда (ширина): ${config.width}м`;
      } else {
          roofInfo = `Ширина: ${config.width}м, Длина ската: ~${(config.width * 1.1 / (config.roofType === RoofType.Gable ? 2 : 1)).toFixed(2)}м`;
      }

      // Расчет высоты в коньке
      let peakHeight = config.height;
      if (config.roofType === RoofType.Gable) {
          peakHeight += (config.width / 2) * Math.tan(config.roofSlope * Math.PI / 180);
      } else if (config.roofType === RoofType.Arched) {
          peakHeight += config.width * SPECS.trussHeightArch;
      }

      const rows = [
          ['Смета на материалы для навеса', date],
          ['Тип', config.roofType],
          ['Размеры (по столбам)', `${config.width}x${config.length}м, Высота проезда: ${config.height}м`],
          ['Габариты кровли', `~${(config.width + 0.8).toFixed(1)}x${(config.length + 0.8).toFixed(1)}м (с учетом свесов)`],
          ['Высота в пике (примерно)', `~${peakHeight.toFixed(2)}м`],
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
          ['Бетонирование столбов', 'Бетон М300 + Арматура', bom.pillarCount, '-', '-', config.hasFoundation ? 'Включено в смету' : 'Не включено'],
          
          ['МЕТАЛЛОКАРКАС', '', '', '', '', ''],
          ['Столбы опорные', `Труба ${pillarProfile}`, bom.pillarCount, config.height, bom.pillarTotalHeight.toFixed(1), 'Опоры'],
          ['Балки несущие (мауэрлат)', `Труба ${beamProfile}`, bom.beamCount, bom.totalBeamLength / bom.beamCount, bom.totalBeamLength.toFixed(1), 'Продольные балки'],
          ['Фермы (пояса + раскосы)', 'Труба 40x40x2 / 40x20x2', bom.trussCount, '~' + (bom.totalTrussSteel / bom.trussCount).toFixed(1), bom.totalTrussSteel.toFixed(1), `Шаг ~1.5м`],
          ['Обрешетка (прогоны)', 'Труба 40x20x2', bom.purlinCount, (bom.totalPurlinLength / bom.purlinCount).toFixed(2), bom.totalPurlinLength.toFixed(1), 'Шаг ~0.6м'],
          
          ['КРОВЛЯ', '', '', '', '', ''],
          ['Покрытие', config.roofMaterial, '-', '-', bom.roofArea, 'Площадь с учетом запаса']
      ];

      const csvContent = "\uFEFF" + rows.map(e => e.join(";")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `smete_kovka007_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- ГЛАВНАЯ ФУНКЦИЯ ЗАКАЗА ---
  const handleOrder = () => {
    // 1. Формируем компактный JSON для бота
    const payload = {
        id: `CFG-${Date.now().toString(36).toUpperCase().slice(-5)}`, // Короткий уникальный ID
        t: config.roofType,
        w: config.width,
        l: config.length,
        h: config.height,
        s: config.roofSlope,
        pr: price
    };
    
    const dataToSend = JSON.stringify(payload);

    // 2. Проверка WebApp
    if (window.Telegram?.WebApp) {
        try {
            window.Telegram.WebApp.sendData(dataToSend);
            
            // Если версия поддерживает алерты (6.2+)
            if (window.Telegram.WebApp.version && parseFloat(window.Telegram.WebApp.version) >= 6.2) {
                 if (window.Telegram.WebApp.showAlert) {
                     window.Telegram.WebApp.showAlert("Заказ отправлен! Менеджер свяжется с вами.");
                 }
            }
            
            // Закрываем приложение
            setTimeout(() => {
                window.Telegram.WebApp.close();
            }, 1000);
            
        } catch (error) {
            alert("Ошибка отправки заказа: " + error);
        }
    } else {
        alert("⚠️ Вы не в Telegram!\n\nЭто демо-режим. В реальном боте этот заказ был бы отправлен.\n\nJSON:\n" + dataToSend);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-screen overflow-hidden bg-slate-100 font-sans">
      
      {/* Мобильная шапка */}
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

      {/* 3D Сцена */}
      <div className="relative w-full h-[50dvh] lg:h-full lg:flex-grow transition-all duration-300">
         <Scene config={config} />
         
         <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-slate-200 text-slate-700 flex flex-col items-center">
               <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Площадь</span>
               <span className="text-xl font-bold">{(config.width * config.length).toFixed(1)} м²</span>
            </div>
         </div>
      </div>

      {/* Мобильные кнопки под сценой */}
      <div className="lg:hidden grid grid-cols-2 gap-3 p-4 bg-slate-100 border-t border-slate-200 relative z-30 flex-shrink-0">
         <button 
            onClick={handleDownloadReport}
            className="bg-white text-slate-700 font-semibold py-3 px-4 rounded-xl shadow border border-slate-200 flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
         >
             <FileText size={16} className="text-green-600" />
             <span className="text-sm">Смета (CSV)</span>
         </button>
         <a 
            href="https://kovka007.ru/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl shadow flex items-center justify-center gap-2 active:scale-95 no-underline whitespace-nowrap"
         >
             <Globe size={16} />
             <span className="text-sm">Сайт</span>
         </a>
      </div>

      {/* Панель управления (Sidebar) */}
      <div className={`
        fixed inset-0 z-40 lg:static lg:z-auto
        transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1)
        ${isMobileMenuOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-[100%] lg:translate-y-0 pointer-events-none lg:pointer-events-auto'}
        lg:w-[450px] lg:min-w-[400px] flex-shrink-0 h-full
        shadow-2xl lg:shadow-none flex flex-col bg-white
      `}>
        <div className="lg:hidden absolute top-4 right-4 z-50">
           <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-full pointer-events-auto">
              <X size={24} className="text-slate-600"/>
           </button>
        </div>

        {/* Контролы и кнопка заказа передаются сюда */}
        <Controls 
          config={config} 
          onChange={handleConfigChange} 
          price={price} 
          onOrder={handleOrder} 
        />
      </div>
      
      {/* Десктопные кнопки */}
      <div className="hidden lg:flex fixed bottom-6 left-6 z-50 gap-4 items-center">
         <button 
            onClick={handleDownloadReport}
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-3 transition-all active:scale-95"
         >
            <div className="p-1.5 bg-green-100 rounded text-green-700">
                <FileText size={18} />
            </div>
            <span className="text-sm">Скачать смету</span>
         </button>
      </div>

    </div>
  );
}
