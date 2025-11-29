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
}

export const MIN_WIDTH = 3;
export const MAX_WIDTH = 10;
export const MIN_LENGTH = 3;
export const MAX_LENGTH = 12;
export const MIN_HEIGHT = 2;
export const MAX_HEIGHT = 4;