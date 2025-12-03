
import {
  ColorOption,
  RoofType,
  RoofMaterial,
  PillarSize,
  PaintType,
  Profile
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
  steelGrade: 245, // MPa (C245)
  gammaC: 1.0, // Operating condition factor
};

// Профильные трубы ГОСТ 30245-2003 / ГОСТ 8639-82
export const PROFILES: Profile[] = [
  // Square
  { name: "40x40x2", h: 40, b: 40, t: 2, A: 2.92, Ix: 6.74, Iy: 6.74, Wx: 3.37, Wy: 3.37, i_x: 1.52, i_y: 1.52, weight: 2.29 },
  { name: "40x40x3", h: 40, b: 40, t: 3, A: 4.21, Ix: 9.17, Iy: 9.17, Wx: 4.59, Wy: 4.59, i_x: 1.48, i_y: 1.48, weight: 3.30 },
  { name: "50x50x2", h: 50, b: 50, t: 2, A: 3.72, Ix: 14.07, Iy: 14.07, Wx: 5.63, Wy: 5.63, i_x: 1.95, i_y: 1.95, weight: 2.92 },
  { name: "50x50x3", h: 50, b: 50, t: 3, A: 5.41, Ix: 19.53, Iy: 19.53, Wx: 7.81, Wy: 7.81, i_x: 1.90, i_y: 1.90, weight: 4.25 },
  { name: "60x60x2", h: 60, b: 60, t: 2, A: 4.52, Ix: 25.15, Iy: 25.15, Wx: 8.38, Wy: 8.38, i_x: 2.36, i_y: 2.36, weight: 3.55 },
  { name: "60x60x3", h: 60, b: 60, t: 3, A: 6.61, Ix: 35.61, Iy: 35.61, Wx: 11.87, Wy: 11.87, i_x: 2.32, i_y: 2.32, weight: 5.19 },
  { name: "80x80x3", h: 80, b: 80, t: 3, A: 9.01, Ix: 88.34, Iy: 88.34, Wx: 22.09, Wy: 22.09, i_x: 3.13, i_y: 3.13, weight: 7.07 },
  { name: "80x80x4", h: 80, b: 80, t: 4, A: 11.75, Ix: 112.5, Iy: 112.5, Wx: 28.1, Wy: 28.1, i_x: 3.09, i_y: 3.09, weight: 9.22 },
  { name: "100x100x3", h: 100, b: 100, t: 3, A: 11.41, Ix: 177.3, Iy: 177.3, Wx: 35.4, Wy: 35.4, i_x: 3.94, i_y: 3.94, weight: 8.96 },
  { name: "100x100x4", h: 100, b: 100, t: 4, A: 14.95, Ix: 228.6, Iy: 228.6, Wx: 45.7, Wy: 45.7, i_x: 3.91, i_y: 3.91, weight: 11.73 },
  { name: "100x100x5", h: 100, b: 100, t: 5, A: 18.36, Ix: 275.9, Iy: 275.9, Wx: 55.2, Wy: 55.2, i_x: 3.88, i_y: 3.88, weight: 14.41 },
  // Rectangular
  { name: "40x20x2", h: 40, b: 20, t: 2, A: 2.12, Ix: 4.31, Iy: 1.25, Wx: 2.15, Wy: 1.25, i_x: 1.42, i_y: 0.77, weight: 1.66 },
  { name: "60x40x2", h: 60, b: 40, t: 2, A: 3.72, Ix: 18.27, Iy: 9.38, Wx: 6.09, Wy: 4.69, i_x: 2.22, i_y: 1.59, weight: 2.92 },
  { name: "60x40x3", h: 60, b: 40, t: 3, A: 5.41, Ix: 25.59, Iy: 13.06, Wx: 8.53, Wy: 6.53, i_x: 2.17, i_y: 1.55, weight: 4.25 },
  { name: "80x40x3", h: 80, b: 40, t: 3, A: 6.61, Ix: 53.68, Iy: 16.59, Wx: 13.42, Wy: 8.30, i_x: 2.85, i_y: 1.58, weight: 5.19 },
  { name: "80x60x3", h: 80, b: 60, t: 3, A: 7.81, Ix: 72.07, Iy: 43.87, Wx: 18.02, Wy: 14.62, i_x: 3.04, i_y: 2.37, weight: 6.13 },
  { name: "80x60x4", h: 80, b: 60, t: 4, A: 10.15, Ix: 91.2, Iy: 55.4, Wx: 22.8, Wy: 18.5, i_x: 3.00, i_y: 2.34, weight: 7.97 },
];

export const SNOW_REGIONS = [
  { id: 1, val: 0.5, name: "I (0.5 кПа)" },
  { id: 2, val: 1.0, name: "II (1.0 кПа)" },
  { id: 3, val: 1.5, name: "III (1.5 кПа)" }, // Moscow
  { id: 4, val: 2.0, name: "IV (2.0 кПа)" },
  { id: 5, val: 2.5, name: "V (2.5 кПа)" },
];

export const WIND_REGIONS = [
  { id: 1, val: 0.23, name: "I (0.23 кПа)" }, // Moscow
  { id: 2, val: 0.30, name: "II (0.30 кПа)" },
  { id: 3, val: 0.38, name: "III (0.38 кПа)" },
  { id: 4, val: 0.48, name: "IV (0.48 кПа)" },
];

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
