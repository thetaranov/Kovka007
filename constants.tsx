import {
  ColorOption,
  RoofType,
  RoofMaterial,
  PillarSize,
  PaintType,
} from "./types";

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

// === НОВАЯ ЭКОНОМИКА (КОНКУРЕНТНАЯ) ===
export const PRICING = {
  // Минимальная цена за квадрат (чтобы не уходить в минус на мелких заказах)
  minPricePerSqm: 4500,

  // Базовая стоимость металла ферм и лаг за м2
  // Зависит от ширины: чем шире, тем дороже ферма
  baseTrussStructure: {
    base: 1900, // Базовая цена металла на крышу за м2
    widthFactor: 300, // +300р к базе за каждый метр ширины свыше 4.5м
  },

  // Стоимость 1 п.м. столба (Труба + резка + сварка пятки)
  pillarMultiplier: {
    [PillarSize.Size60]: 850, // 60x60
    [PillarSize.Size80]: 1400, // 80x80
    [PillarSize.Size100]: 2100, // 100x100
  },

  // Кровля (Материал + саморезы + работа)
  roofMaterialPricePerSqm: {
    [RoofMaterial.Polycarbonate]: 1100, // Поликарбонат
    [RoofMaterial.Decking]: 850, // Профлист (самый дешевый)
    [RoofMaterial.MetalTile]: 1250, // Металлочерепица
  },

  // Коэффициенты сложности монтажа крыши
  roofTypeMultiplier: {
    [RoofType.SingleSlope]: 1.0,
    [RoofType.Triangular]: 1.05,
    [RoofType.Gable]: 1.15, // Двускатка
    [RoofType.Arched]: 1.25, // Арка
    [RoofType.SemiArched]: 1.3,
  },

  // Покраска (Материал + Работа)
  paintMultiplier: {
    [PaintType.None]: 0,
    [PaintType.Ral]: 400, // Эмаль
    [PaintType.Polymer]: 1200, // Порошок (дорого)
  },

  extras: {
    trusses: 600, // Доп. усиление ферм
    gutters: 1300, // Водосток
    sideWalls: 3000, // Зашивка стен
    foundation: 5000, // Бетонирование
    installation: 0.25, // Монтаж 25% (рынок)
    highWork: 0.1, // Наценка 10% за высоту > 3.0м
  },
};
