import { ColorOption, RoofType, RoofMaterial, PillarSize, PaintType } from './types';

export const ROOF_COLORS: ColorOption[] = [
  { name: 'Шоколад', hex: '#3B2F2F', ral: 'RAL 8017' },
  { name: 'Зеленый мох', hex: '#004D40', ral: 'RAL 6005' },
  { name: 'Красное вино', hex: '#7f1e2c', ral: 'RAL 3005' },
  { name: 'Графит', hex: '#374151', ral: 'RAL 7024' },
  { name: 'Сигнальный синий', hex: '#1e3a8a', ral: 'RAL 5005' },
  { name: 'Бронза (PC)', hex: '#634832', ral: 'Bronze' }, 
];

export const FRAME_COLORS: ColorOption[] = [
  { name: 'Черный', hex: '#1a1a1a', ral: 'RAL 9005' },
  { name: 'Серый', hex: '#4b5563', ral: 'RAL 7004' },
  { name: 'Белый', hex: '#f3f4f6', ral: 'RAL 9003' },
  { name: 'Шоколад', hex: '#3E2723', ral: 'RAL 8017' },
];

export const SPECS = {
  trussThickness: 0.04, 
  trussHeightGable: 0.25, 
  trussHeightArch: 0.15, 
  trussHeightSingle: 0.15, 
  purlinSize: 0.04, 
  mauerlatHeight: 0.1, 
  postSpacing: 2.5, 
};

// === НОВАЯ ЭКОНОМИКА (2025) ===
export const PRICING = {
  // Минимальная рентабельная цена за м2 "под ключ"
  minPricePerSqm: 7000, 

  // Стоимость ферм и прогонов зависит от ширины пролета
  baseTrussStructure: {
    base: 3200,        // База за м2 при ширине <= 4м
    widthFactor: 450,  // +450р за каждый метр ширины свыше 4м (усложнение фермы)
  },
  
  // Стоимость столба (Материал + Работа) за 1 п.м.
  pillarMultiplier: {
    [PillarSize.Size60]: 1100,
    [PillarSize.Size80]: 1900,
    [PillarSize.Size100]: 2800,
  },

  // Кровля (Материал + Работа)
  roofMaterialPricePerSqm: {
    [RoofMaterial.Polycarbonate]: 1950, // Поликарбонат (дорогой)
    [RoofMaterial.Decking]: 1200,       // Профлист (дешевле)
    [RoofMaterial.MetalTile]: 1700,     // Черепица
  },

  // Сложность геометрии крыши
  roofTypeMultiplier: {
    [RoofType.SingleSlope]: 1.0,
    [RoofType.Triangular]: 1.1,
    [RoofType.Gable]: 1.25,
    [RoofType.Arched]: 1.35,
    [RoofType.SemiArched]: 1.45,
  },

  paintMultiplier: {
    [PaintType.None]: 0,
    [PaintType.Ral]: 700, 
    [PaintType.Polymer]: 1600,
  },

  extras: {
    trusses: 900,        // Усиление (р/м2)
    gutters: 2000,       // Водосток (р/п.м с двух сторон)
    sideWalls: 4500,     // Зашивка стен (р/м2)
    foundation: 8500,    // Бетон (р/м2)
    installation: 0.35,  // Монтаж: 35% от материалов
    highWork: 0.15,      // Наценка за высоту > 3.2м (+15% к монтажу)
  }
};
