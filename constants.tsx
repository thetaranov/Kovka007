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

// === ЦЕНЫ ПОД РЫНОК (Target: Gable 4.5x6 ~165k) ===
export const PRICING = {
  minPricePerSqm: 4500,

  baseTrussStructure: {
    base: 1900,
    widthFactor: 250,
  },

  pillarMultiplier: {
    [PillarSize.Size60]: 950,
    [PillarSize.Size80]: 1500,
    [PillarSize.Size100]: 2200,
  },

  roofMaterialPricePerSqm: {
    [RoofMaterial.Polycarbonate]: 1100,
    [RoofMaterial.Decking]: 900,
    [RoofMaterial.MetalTile]: 1300,
  },

  roofTypeMultiplier: {
    [RoofType.SingleSlope]: 1.0,
    [RoofType.Triangular]: 1.05,
    [RoofType.Gable]: 1.2,
    [RoofType.Arched]: 1.25,
    [RoofType.SemiArched]: 1.3,
  },

  paintMultiplier: {
    [PaintType.None]: 0,
    [PaintType.Ral]: 400,
    [PaintType.Polymer]: 1200,
  },

  extras: {
    trusses: 600,
    gutters: 1300,
    sideWalls: 3200,
    foundation: 5000,
    installation: 0.25,
    highWork: 0.1,
  },
};
