import {
  ColorOption,
  RoofType,
  RoofMaterial,
  PillarSize,
  PaintType,
} from "./types";

// Цвета оставляем без изменений
export const ROOF_COLORS: ColorOption[] = [
  { name: "Шоколад", hex: "#3B2F2F", ral: "RAL 8017" },
  { name: "Зеленый мох", hex: "#004D40", ral: "RAL 6005" },
  { name: "Красное вино", hex: "#7f1e2c", ral: "RAL 3005" },
  { name: "Графит", hex: "#374151", ral: "RAL 7024" },
  { name: "Сигнальный синий", hex: "#1e3a8a", ral: "RAL 5005" },
  { name: "Бронза (PC)", hex: "#634832", ral: "Bronze" },
];

export const FRAME_COLORS: ColorOption[] = [
  { name: "Черный", hex: "#1a1a1a", ral: "RAL 9005" },
  { name: "Серый", hex: "#4b5563", ral: "RAL 7004" },
  { name: "Белый", hex: "#f3f4f6", ral: "RAL 9003" },
  { name: "Шоколад", hex: "#3E2723", ral: "RAL 8017" },
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

// === ОПТИМИЗИРОВАННЫЕ ЦЕНЫ (Под конкурентов 10х12м) ===
export const PRICING = {
  // Минимальная цена за м2 (чтобы не прогореть на малышах)
  minPricePerSqm: 4200,

  // Металлокаркас ферм и прогонов
  baseTrussStructure: {
    base: 1750, // Снизили базу (было 1900)
    widthFactor: 180, // Сильно снизили наценку за ширину (было 300)
  },

  // Столбы (Материал + Работа)
  pillarMultiplier: {
    [PillarSize.Size60]: 800,
    [PillarSize.Size80]: 1400, // Чуть дешевле
    [PillarSize.Size100]: 2100,
  },

  // Кровля (Материал + Работа)
  roofMaterialPricePerSqm: {
    [RoofMaterial.Polycarbonate]: 1050, // Оптимизировали закупку
    [RoofMaterial.Decking]: 850,
    [RoofMaterial.MetalTile]: 1250,
  },

  // Сложность крыши
  roofTypeMultiplier: {
    [RoofType.SingleSlope]: 1.0,
    [RoofType.Triangular]: 1.05,
    [RoofType.Gable]: 1.15, // Двускатка
    [RoofType.Arched]: 1.25,
    [RoofType.SemiArched]: 1.3,
  },

  // Покраска
  paintMultiplier: {
    [PaintType.None]: 0,
    [PaintType.Ral]: 350,
    [PaintType.Polymer]: 1100,
  },

  extras: {
    trusses: 550,
    gutters: 1200,
    sideWalls: 2800,
    foundation: 4500,
    installation: 0.25, // Базовый монтаж 25%
    highWork: 0.05, // Снизили наценку за высоту до 5% (было 10%)
  },
};
