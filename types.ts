export interface ColorOption {
  name: string;
  hex: string;
  ral: string;
}

export enum RoofType {
  SingleSlope = 'single',
  Gable = 'gable',
  Arched = 'arched',
  Triangular = 'triangular',
  SemiArched = 'semiarched',
}

export enum PillarSize {
  Size60 = '60x60',
  Size80 = '80x80',
  Size100 = '100x100',
  Size120 = '120x120',
}

export enum RoofMaterial {
  Polycarbonate = 'polycarbonate',
  MetalTile = 'metaltile',
  Decking = 'decking', // Profnastil
}

export enum PaintType {
  None = 'none',
  Ral = 'ral',
  Polymer = 'polymer',
}

export enum InstallationType {
  FoundationPour = 'foundation_pour',
  OnPosts = 'on_posts',
  OnEmbedded = 'on_embedded',
  None = 'none',
}

// Типы ворот
export enum GateType {
  None = 'none',
  Sliding = 'sliding',       // Откатные
  Swing = 'swing',           // Распашные  
  Hinged = 'hinged',         // Навесные
}

// Типы заполнения ворот
export enum GateFilling {
  Solid = 'solid',           // Сплошное (профлист)
  Lattice = 'lattice',       // Решетка
  Forged = 'forged',         // Кованое
  Combined = 'combined',     // Комбинированные
  VerticalBars = 'vertical', // Вертикальные планки
}

export interface CarportConfig {
  width: number; // meters
  length: number; // meters
  height: number; // meters (Clearance height at lowest point)
  pillarSize: PillarSize;
  
  roofType: RoofType;
  roofSlope: number; // degrees
  roofMaterial: RoofMaterial;
  
  frameColor: string;
  roofColor: string;
  paintType: PaintType;

  hasTrusses: boolean;
  hasSideWalls: boolean;
  hasGutters: boolean;
  hasFoundation: boolean;
  hasInstallation: boolean;
  foundationThickness: number;
  installationType: InstallationType;
  
  // Для расчета нагрузок
  region?: string;
  snowRegion?: string;
  windRegion?: string;
  terrain?: 'A' | 'B' | 'C';
}

export const MIN_WIDTH = 3;
export const MAX_WIDTH = 12;
export const MIN_LENGTH = 3;
export const MAX_LENGTH = 20;
export const MIN_HEIGHT = 2;
export const MAX_HEIGHT = 4.5;

// Конфигурация ворот
export interface GateConfig {
  type: GateType;
  width: number;
  height: number;
  filling: GateFilling;
  frameColor: string;
  panelColor: string;
  hasWicket: boolean;
  hasAutomation: boolean;
  frameSize: string;
  distanceFromCarport: number;
  openDirection: 'left' | 'right';
}

// Информация о нагрузках
export interface LoadsInfo {
  snowLoad: number;
  windLoad: number;
  totalLoad: number;
  recommended: {
    pillarSize: string;
    trussHeight: number;
    purlinStep: number;
  };
  warnings: string[];
}

// Разбивка цены
export interface PriceBreakdown {
  materials: number;
  metalwork: number;
  roofing: number;
  painting: number;
  options: number;
  installation: number;
  delivery: number;
  gate: number;
  total: number;
  pricePerSqm: number;
}

// Telegram WebApp Types - определение в types/index.ts