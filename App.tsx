import React, { useState, useEffect } from 'react';
import { Scene } from './components/Scene';
import { Controls } from './components/Controls';
import { CarportConfig, RoofType, PillarSize, RoofMaterial, PaintType } from './types';
import { PRICING, FRAME_COLORS, ROOF_COLORS, SPECS } from './constants';
import { Menu, X, FileText, Globe } from 'lucide-react';
import { OrderModal } from './components/OrderModal';

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
  // Heavy duty
  if (width > 6.5 || height > 3.0 || area > 45) {
    return PillarSize.Size100;
  }
  // Standard duty
  if (width > 4.5 || height > 2.3 || area > 20) {
    return PillarSize.Size80;
  }
  // Light duty
  return PillarSize.Size60;
};

export default function App() {
  const [config, setConfig] = useState<CarportConfig>(INITIAL_CONFIG);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [price, setPrice] = useState(0);

  const handleConfigChange = (newConfig: CarportConfig) => {
    // Check if dimensions triggered a recommended pillar size update
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
    
    // --- 1. Dynamic Base Structure Cost (Economy of Scale) ---
    // Calculate base rate per sqm based on total area
    let baseRate = PRICING.baseStructure.priceLarge;
    const { smallArea, largeArea, priceSmall, priceLarge } = PRICING.baseStructure;

    if (floorArea <= smallArea) {
        baseRate = priceSmall;
    } else if (floorArea < largeArea) {
        // Linear interpolation
        const t = (floorArea - smallArea) / (largeArea - smallArea);
        baseRate = priceSmall - t * (priceSmall - priceLarge);
    }
    // Apply Roof Type Complexity to base structure
    const baseStructureCost = floorArea * baseRate * PRICING.roofTypeMultiplier[config.roofType];
    total += baseStructureCost;


    // --- 2. Dynamic Pillar Cost (Based on Height) ---
    const maxSpan = 6.0;
    const numCols = Math.ceil(config.width / maxSpan) + 1;
    const numRows = Math.ceil(config.length / SPECS.postSpacing) + 1;
    const pillarCount = numCols * numRows;
    
    // Price = Count * Height (m) * PricePerLinearMeter
    const pillarCost = pillarCount * config.height * PRICING.pillarMultiplier[config.pillarSize];
    total += pillarCost;


    // --- 3. Roof Material Cost (Based on Surface Area) ---
    let roofAreaMultiplier = 1.0;
    if (config.roofType === RoofType.Gable) roofAreaMultiplier = 1.25;
    if (config.roofType === RoofType.Arched) roofAreaMultiplier = 1.35;
    if (config.roofType === RoofType.SemiArched) roofAreaMultiplier = 1.45;
    if (config.roofType === RoofType.SingleSlope || config.roofType === RoofType.Triangular) roofAreaMultiplier = 1.1;
    
    const roofArea = floorArea * roofAreaMultiplier;
    total += roofArea * PRICING.roofMaterialPricePerSqm[config.roofMaterial];

    // --- 4. Painting ---
    total += floorArea * PRICING.paintMultiplier[config.paintType];

    // --- 5. Extras ---
    if (config.hasTrusses) total += floorArea * PRICING.extras.trusses; 
    if (config.hasGutters) total += config.length * 2 * PRICING.extras.gutters;
    if (config.hasSideWalls) {
        const wallArea = (config.length * config.height) + (config.width * config.height * 0.5);
        total += wallArea * PRICING.extras.sideWalls;
    }
    if (config.hasFoundation) {
        total += floorArea * PRICING.extras.foundation;
    }

    // --- 6. Installation ---
    if (config.hasInstallation) {
      total = total * (1 + PRICING.extras.installation); // installation percentage
    }

    setPrice(Math.round(total / 100) * 100); 
  }, [config]);

  const calculateBOM = () => {
    // 1. Pillars
    const maxSpan = 6.0;
    const numCols = Math.ceil(config.width / maxSpan) + 1;
    const numRows = Math.ceil(config.length / SPECS.postSpacing) + 1;
    const pillarCount = numCols * numRows;
    const pillarTotalLen = pillarCount * config.height;

    // 2. Beams (Longitudinal) - Usually same profile as pillars or slightly less, 
    // but for simplicity in this BOM we assume main frame profile (80x80 or 100x100)
    // Beams run along the length on each column line.
    const beamCount = numCols;
    const beamTotalLen = beamCount * config.length;

    // 3. Trusses (40x40 or 40x20 usually)
    const trussCount = Math.ceil(config.length / 1.5) + 1;
    
    // Estimate steel per truss based on geometry
    let steelPerTruss = 0;
    const w = config.width;
    const angleRad = (config.roofSlope * Math.PI) / 180;
    
    // Approximate webbing factor (length of internal zig-zags relative to width)
    const webFactor = 1.6; 

    if (config.roofType === RoofType.Gable) {
       const slopeLen = (w / 2) / Math.cos(angleRad);
       // Top chords + Bottom chord + Webbing
       steelPerTruss = (slopeLen * 2) + w + (w * webFactor);
    } else if (config.roofType === RoofType.Arched) {
       // Arc length approximation. Rise ~ width * 0.15
       const rise = w * SPECS.trussHeightArch;
       // Ramanujan approximation for ellipse perimeter (simplified for circular segment)
       // Or simple circle math:
       const R = (w*w/4 + rise*rise) / (2*rise);
       const theta = 2 * Math.asin(w / (2*R));
       const arcLen = R * theta;
       // Top Arc + Bottom Arc + Webbing
       steelPerTruss = (arcLen * 2) + (w * webFactor);
    } else if (config.roofType === RoofType.SemiArched) {
        // Asymmetric
        const rise = w * Math.tan(angleRad);
        const hyp = Math.sqrt(w*w + rise*rise); // Approx chord
        // Top Arc (approx longer than hyp) + Bottom + Webbing
        steelPerTruss = (hyp * 1.1) + w + (w * webFactor);
    } else {
        // Single slope / Triangular
        const slopeLen = w / Math.cos(angleRad);
        // Top + Bottom + Webbing + Verticals
        steelPerTruss = slopeLen + w + (w * webFactor) + (w * Math.tan(angleRad)); 
    }
    
    const trussTotalLen = trussCount * steelPerTruss;

    // 4. Purlins (Lathing) - Usually 40x20 or 20x20
    const purlinCount = Math.ceil(config.width / 0.6) + 1;
    // Purlin length = carport length + overhangs (0.2m)
    const onePurlinLen = config.length + 0.2; 
    const purlinTotalLen = purlinCount * onePurlinLen;

    // 5. Roof Area
    let roofAreaMultiplier = 1.0;
    if (config.roofType === RoofType.Gable) roofAreaMultiplier = 1.25;
    if (config.roofType === RoofType.Arched) roofAreaMultiplier = 1.35;
    if (config.roofType === RoofType.SemiArched) roofAreaMultiplier = 1.45;
    if (config.roofType === RoofType.SingleSlope || config.roofType === RoofType.Triangular) roofAreaMultiplier = 1.1;
    const roofArea = (config.width * config.length * roofAreaMultiplier).toFixed(2);

    return {
        pillars: { count: pillarCount, len: config.height, total: pillarTotalLen.toFixed(1) },
        beams: { count: beamCount, len: config.length, total: beamTotalLen.toFixed(1) },
        trusses: { count: trussCount, lenApprox: steelPerTruss.toFixed(1), total: trussTotalLen.toFixed(1) },
        purlins: { count: purlinCount, len: onePurlinLen.toFixed(2), total: purlinTotalLen.toFixed(1) },
        roofArea: roofArea
    };
  };

  const handleDownloadReport = () => {
      const bom = calculateBOM();
      const date = new Date().toLocaleDateString('ru-RU');
      
      const typeMap: Record<string, string> = {
         [RoofType.SingleSlope]: 'Односкатный',
         [RoofType.Triangular]: 'Односкатный (Треугольный)',
         [RoofType.Gable]: 'Двускатный',
         [RoofType.Arched]: 'Арочный',
         [RoofType.SemiArched]: 'Полуарочный',
      };

      const matMap: Record<string, string> = {
         [RoofMaterial.Polycarbonate]: 'Сотовый поликарбонат',
         [RoofMaterial.MetalTile]: 'Металлочерепица',
         [RoofMaterial.Decking]: 'Профнастил',
     };

      // CSV Content with BOM for Excel UTF-8 support
      let csvContent = "\uFEFF"; 
      csvContent += `Смета на материалы для навеса;${date}\n`;
      csvContent += `Тип;${typeMap[config.roofType]}\n`;
      csvContent += `Размеры;${config.width}x${config.length}м, Высота ${config.height}м\n`;
      
      // Calculate additional geometry details
      const totalH = (config.height + (config.roofType === RoofType.Arched ? config.width * SPECS.trussHeightArch : 0)).toFixed(2);
      let roofWidth = config.width.toFixed(2);
      let note = "";
      
      if (config.roofType === RoofType.Arched) {
          const rise = config.width * SPECS.trussHeightArch;
          const R = (Math.pow(config.width/2, 2) + Math.pow(rise, 2)) / (2 * rise);
          const theta = 2 * Math.asin(config.width / (2*R));
          roofWidth = (R * theta).toFixed(2);
          note = ` (Хорда ${config.width}м)`;
      } else if (config.roofType === RoofType.Gable) {
          const rad = (config.roofSlope * Math.PI) / 180;
          roofWidth = (config.width / Math.cos(rad)).toFixed(2);
      } else if (config.roofType === RoofType.SemiArched) {
           const rad = (config.roofSlope * Math.PI) / 180;
           const rise = config.width * Math.tan(rad);
           const hyp = Math.sqrt(config.width**2 + rise**2);
           roofWidth = (hyp * 1.05).toFixed(2); // Approx arc
           note = ` (Проекция ${config.width}м)`;
      } else {
          const rad = (config.roofSlope * Math.PI) / 180;
          roofWidth = (config.width / Math.cos(rad)).toFixed(2);
      }
      
      csvContent += `Габариты;Общая высота ~${totalH}м (по пику)\n`;
      csvContent += `Крыша;Длина ската/дуги: ${roofWidth}м${note}, Длина по коньку: ${config.length}м\n`;
      
      const colSpacing = (config.width / (Math.ceil(config.width / 6.0))).toFixed(2);
      const rowSpacing = (config.length / (Math.ceil(config.length / SPECS.postSpacing))).toFixed(2);
      csvContent += `Сетка столбов;${rowSpacing}м (вдоль) x ${colSpacing}м (поперек)\n`;
      
      // Options List
      const opts = [];
      if (config.hasTrusses) opts.push("Усиленные фермы");
      if (config.hasGutters) opts.push("Водостоки");
      if (config.hasSideWalls) opts.push("Боковая зашивка");
      if (config.hasFoundation) opts.push("Фундамент");
      if (config.hasInstallation) opts.push("Монтаж");
      csvContent += `Опции;${opts.length > 0 ? opts.join(", ") : "Базовая комплектация"}\n`;
      
      csvContent += `\nИТОГО СТОИМОСТЬ;${price.toLocaleString()} руб.\n\n`;

      csvContent += "Наименование;Профиль/Материал;Кол-во (шт);Длина 1 шт (м);Всего (м/м2);Примечание\n";
      
      if (config.hasFoundation) {
        csvContent += `Фундамент;Бетонная плита;-;-;${(config.width * config.length).toFixed(1)};5000р/м2\n`;
      }

      // Pillars
      csvContent += `Столбы опорные;Труба ${config.pillarSize};${bom.pillars.count};${bom.pillars.len};${bom.pillars.total};\n`;
      
      // Beams
      csvContent += `Балки продольные;Труба ${config.pillarSize};${bom.beams.count};${bom.beams.len};${bom.beams.total};Несущие балки\n`;
      
      // Trusses
      csvContent += `Фермы (каркас);Труба 40x40/40x20;${bom.trusses.count};~${bom.trusses.lenApprox};${bom.trusses.total};Расчетный метраж трубы\n`;
      
      // Purlins
      csvContent += `Обрешетка (прогоны);Труба 40x20;${bom.purlins.count};${bom.purlins.len};${bom.purlins.total};Шаг ~600мм\n`;
      
      // Roof
      csvContent += `Кровельное покрытие;${matMap[config.roofMaterial]};-;-;${bom.roofArea};Площадь с учетом уклона/изгиба\n`;

      // Extras
      if (config.hasGutters) {
          csvContent += `Водосточная система;Пластик/Металл;-;-;${(config.length * 2).toFixed(1)};Две стороны по длине\n`;
      }
      if (config.hasSideWalls) {
           const wallArea = (config.length * config.height) + (config.width * config.height * 0.5);
           csvContent += `Боковая зашивка;${matMap[config.roofMaterial]};-;-;${wallArea.toFixed(1)};Площадь стен\n`;
      }

      const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Смета_Навес_${config.width}x${config.length}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleOrder = () => {
    // 1. Generate ID and Prepare Data
    const configId = `CFG-${Date.now().toString(36).toUpperCase()}`;
    const frameColorName = FRAME_COLORS.find(c => c.hex === config.frameColor)?.name || config.frameColor;
    const roofColorName = ROOF_COLORS.find(c => c.hex === config.roofColor)?.name || config.roofColor;

    // Compressed payload to fit in URL
    // Keys are shortened to reduce length: 
    // id, t(type), w, l, h, s(slope), m(materials), c(colors), o(options), p(price)
    const payload = {
        id: configId,
        t: config.roofType,
        dims: {
            w: config.width,
            l: config.length,
            h: config.height,
            sl: config.roofSlope
        },
        area: (config.width * config.length).toFixed(1),
        mat: {
            r: config.roofMaterial,
            p: config.pillarSize,
            pt: config.paintType
        },
        col: {
            f: frameColorName,
            r: roofColorName
        },
        opt: {
            tr: config.hasTrusses ? 1 : 0,
            gu: config.hasGutters ? 1 : 0,
            sw: config.hasSideWalls ? 1 : 0,
            fd: config.hasFoundation ? 1 : 0,
            in: config.hasInstallation ? 1 : 0
        },
        pr: price
    };

    // 2. Encode to JSON -> Base64 -> URL Safe
    const jsonString = JSON.stringify(payload);
    
    // Fix for Unicode strings (Cyrillic names in frameColorName/roofColorName)
    // btoa fails on Unicode, so we must encodeURIComponent first, then unescape to get Latin1 chars
    const binaryString = unescape(encodeURIComponent(jsonString));
    const base64 = btoa(binaryString);
    
    // Make URL safe: + -> -, / -> _, remove = padding
    const urlSafeBase64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // 3. Open Telegram Deep Link with 'order_' prefix
    const botUsername = 'Kovka007bot';
    window.open(`https://t.me/${botUsername}?start=order_${urlSafeBase64}`, '_blank');
  };

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-screen overflow-hidden bg-slate-100 font-sans">
      
      <div className="lg:hidden absolute top-0 left-0 right-0 z-50 p-4 pointer-events-none">
        <div className="flex justify-between items-center pointer-events-auto">
          {/* Logo removed for mobile version as requested */}
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
         
         {/* Floating Area Display - High Z-Index */}
         <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-slate-200 text-slate-700 flex flex-col items-center">
               <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Площадь</span>
               <span className="text-xl font-bold">{(config.width * config.length).toFixed(1)} м²</span>
            </div>
         </div>
      </div>

      {/* Mobile-only Action Buttons (under scene) */}
      <div className="lg:hidden grid grid-cols-2 gap-3 p-4 bg-slate-100 border-t border-slate-200 relative z-30 flex-shrink-0">
         <button 
            onClick={handleDownloadReport}
            className="bg-white text-slate-700 font-semibold py-3 px-4 rounded-xl shadow border border-slate-200 flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
         >
             <FileText size={16} className="text-green-600" />
             <span className="text-sm">Скачать смету</span>
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

        <Controls 
          config={config} 
          onChange={handleConfigChange} 
          price={price} 
          onOrder={handleOrder}
        />
      </div>
      
      <div className="hidden lg:flex fixed bottom-6 left-6 z-50 gap-4 items-center">
         <button 
            onClick={handleDownloadReport}
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-3 transition-all active:scale-95"
            title="Скачать смету (Excel)"
         >
            <div className="p-1.5 bg-green-100 rounded text-green-700">
                <FileText size={18} />
            </div>
            <span className="text-sm">Скачать смету</span>
         </button>
         
         <a 
            href="https://kovka007.ru/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-5 rounded-xl shadow-lg flex items-center gap-3 transition-all active:scale-95 no-underline"
            title="Перейти на сайт производителя"
         >
            <div className="opacity-90">
                <Globe size={18} />
            </div>
            <span className="text-sm">Сайт производителя</span>
         </a>
      </div>

    </div>
  );
}