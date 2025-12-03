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

export const PROFILES: Profile[] = [
  { name: "40x40x2", h: 40, b: 40, t: 2, A: 2.92, Ix: 6.74, Iy: 6.74, Wx: 3.37, Wy: 3.37, i_x: 1.52, i_y: 1.52, weight: 2.29 },
  { name: "50x50x3", h: 50, b: 50, t: 3, A: 5.41, Ix: 19.53, Iy: 19.53, Wx: 7.81, Wy: 7.81, i_x: 1.90, i_y: 1.90, weight: 4.25 },
  { name: "60x60x3", h: 60, b: 60, t: 3, A: 6.61, Ix: 35.61, Iy: 35.61, Wx: 11.87, Wy: 11.87, i_x: 2.32, i_y: 2.32, weight: 5.19 },
  { name: "80x80x4", h: 80, b: 80, t: 4, A: 11.75, Ix: 112.5, Iy: 112.5, Wx: 28.1, Wy: 28.1, i_x: 3.09, i_y: 3.09, weight: 9.22 },
  { name: "100x100x5", h: 100, b: 100, t: 5, A: 18.36, Ix: 275.9, Iy: 275.9, Wx: 55.2, Wy: 55.2, i_x: 3.88, i_y: 3.88, weight: 14.41 },
  { name: "60x40x2", h: 60, b: 40, t: 2, A: 3.72, Ix: 18.27, Iy: 9.38, Wx: 6.09, Wy: 4.69, i_x: 2.22, i_y: 1.59, weight: 2.92 },
  { name: "80x40x3", h: 80, b: 40, t: 3, A: 6.61, Ix: 53.68, Iy: 16.59, Wx: 13.42, Wy: 8.30, i_x: 2.85, i_y: 1.58, weight: 5.19 },
];

export const SNOW_REGIONS = [
  { id: 1, val: 0.5, name: "I (0.5 кПа)" },
  { id: 2, val: 1.0, name: "II (1.0 кПа)" },
  { id: 3, val: 1.5, name: "III (1.5 кПа)" },
  { id: 4, val: 2.0, name: "IV (2.0 кПа)" },
  { id: 5, val: 2.5, name: "V (2.5 кПа)" },
];

export const WIND_REGIONS = [
  { id: 1, val: 0.23, name: "I (0.23 кПа)" },
  { id: 2, val: 0.30, name: "II (0.30 кПа)" },
  { id: 3, val: 0.38, name: "III (0.38 кПа)" },
  { id: 4, val: 0.48, name: "IV (0.48 кПа)" },
];

export const CONSTRUCTION_REGIONS = [
    { id: 1, name: "Москва и Московская обл.", snow: 3, wind: 1 },
    { id: 2, name: "Санкт-Петербург и Ленобласть", snow: 3, wind: 2 },
    { id: 3, name: "Краснодарский край", snow: 1, wind: 3 },
    { id: 4, name: "Новосибирская обл.", snow: 4, wind: 2 },
    { id: 5, name: "Свердловская обл. (Екатеринбург)", snow: 4, wind: 3 },
    { id: 6, name: "Республика Татарстан (Казань)", snow: 4, wind: 2 },
    { id: 7, name: "Ростовская обл.", snow: 2, wind: 3 },
];

export const PRICING = {
  minPricePerSqm: 4500,
  baseTrussStructure: { base: 1900, widthFactor: 250, },
  pillarMultiplier: { [PillarSize.Size60]: 950, [PillarSize.Size80]: 1500, [PillarSize.Size100]: 2200, },
  roofMaterialPricePerSqm: { [RoofMaterial.Polycarbonate]: 1100, [RoofMaterial.Decking]: 900, [RoofMaterial.MetalTile]: 1300, },
  roofTypeMultiplier: { [RoofType.SingleSlope]: 1.0, [RoofType.Triangular]: 1.05, [RoofType.Gable]: 1.2, [RoofType.Arched]: 1.25, [RoofType.SemiArched]: 1.3, },
  paintMultiplier: { [PaintType.None]: 0, [PaintType.Ral]: 400, [PaintType.Polymer]: 1200, },
  extras: { trusses: 600, gutters: 1300, sideWalls: 3200, foundation: 5000, installation: 0.25, highWork: 0.1, },
};