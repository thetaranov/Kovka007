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
  
  // Structural parameters
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
  name: string;
  h: number; // mm
  b: number; // mm
  t: number; // mm
  A: number; // cm2 area
  Ix: number; // cm4 moment of inertia
  Iy: number; // cm4
  Wx: number; // cm3 section modulus
  Wy: number; // cm3
  i_x: number; // cm radius of gyration
  i_y: number; // cm
  weight: number; // kg/m
}

export interface TrussGeometry {
  span: number; // m
  height: number; // m
  panelCount: number;
  panelLength: number; // m
  nodes: Array<{x: number, y: number, z?: number}>;
  elements: Array<{
    from: number;
    to: number;
    type: 'topChord' | 'bottomChord' | 'web' | 'pillar';
    length: number;
  }>;
}

export interface ElementSections {
  topChord: Profile;
  bottomChord: Profile;
  web: Profile;
  pillar: Profile;
  purlin: Profile;
}

export interface LoadAnalysis {
  snowLoad: number; // kPa
  windLoad: number; // kPa
  deadLoad: number; // kPa
  totalLinearLoad: number; // kN/m on truss
  maxMoment: number; // kNm
  maxShear: number; // kN
  maxAxialTop: number; // kN (Compression)
  maxAxialBottom: number; // kN (Tension)
  maxAxialWeb: number; // kN
  utilization: {
    top: number; // %
    bottom: number;
    web: number;
    pillar: number;
  }
}

export interface BillOfMaterials {
  items: Array<{
    name: string;
    profile: string;
    length: number;
    quantity: number;
    weight: number;
  }>;
  totalWeight: number;
  totalCost: number;
}

export interface CalculationResult {
  success: boolean;
  geometry: TrussGeometry;
  sections: ElementSections;
  loads: LoadAnalysis;
  dxfContent: string;
  bom: BillOfMaterials;
  warnings: string[];
}

export interface TrussCalculation extends CalculationResult {}

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

  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
