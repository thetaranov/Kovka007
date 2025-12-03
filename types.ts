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
  Decking = 'decking',
}

export enum PaintType {
  None = 'none',
  Ral = 'ral',
  Polymer = 'polymer',
}

export type AppMode = 'visualizer' | 'calculator';

export interface CarportConfig {
  width: number;
  length: number;
  height: number;
  pillarSize: PillarSize;
  roofType: RoofType;
  roofSlope: number;
  roofMaterial: RoofMaterial;
  frameColor: string;
  roofColor: string;
  paintType: PaintType;
  hasTrusses: boolean;
  hasSideWalls: boolean;
  hasGutters: boolean;
  hasFoundation: boolean;
  hasInstallation: boolean;
  constructionRegionId: number;
  snowRegion: number;
  windRegion: number;
}

export const MIN_WIDTH = 3;
export const MAX_WIDTH = 10;
export const MIN_LENGTH = 3;
export const MAX_LENGTH = 12;
export const MIN_HEIGHT = 2;
export const MAX_HEIGHT = 4;

// Structural Types
export interface Profile {
  name: string; h: number; b: number; t: number; A: number; Ix: number; Iy: number; Wx: number; Wy: number; i_x: number; i_y: number; weight: number;
}

export interface TrussGeometry {
  span: number; height: number; panelCount: number; panelLength: number;
  nodes: Array<{x: number, y: number, z?: number}>;
  elements: Array<{ from: number; to: number; type: 'topChord' | 'bottomChord' | 'web' | 'pillar'; length: number; }>;
}

export interface ElementSections {
  topChord: Profile; bottomChord: Profile; web: Profile; pillar: Profile; purlin: Profile;
}

export interface LoadAnalysis {
  snowLoad: number; windLoad: number; deadLoad: number; totalLinearLoad: number; maxMoment: number; maxShear: number; maxAxialTop: number; maxAxialBottom: number; maxAxialWeb: number;
  utilization: { top: number; bottom: number; web: number; pillar: number; }
}

export interface BillOfMaterials {
  items: Array<{ name: string; profile: string; length: number; quantity: number; weight: number; }>;
  totalWeight: number; totalCost: number;
}

export interface CalculationResult {
  success: boolean; geometry: TrussGeometry; sections: ElementSections; loads: LoadAnalysis; dxfContent: string; bom: BillOfMaterials; warnings: string[];
}

export interface TrussCalculation extends CalculationResult {}

// Telegram WebApp Types
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        viewportHeight: number;
        sendData: (data: string) => void;
      };
    };
  }
}