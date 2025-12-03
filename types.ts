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

// Типы для расчета фермы
export interface TrussGeometry {
  span: number; // пролет, м
  height: number; // высота фермы, м
  panelCount: number; // количество панелей
  panelLength: number; // длина панели, м
  slopeAngle: number; // угол наклона, град
  nodes: Array<{x: number, y: number}>; // координаты узлов
  elements: Array<{from: number, to: number, type: 'chord' | 'web'}>; // элементы
}

export interface ElementSections {
  topChord: string; // сечение верхнего пояса
  bottomChord: string; // сечение нижнего пояса
  web: string; // сечение решетки
  thickness: number; // толщина, мм
}

export interface LoadAnalysis {
  deadLoad: number; // постоянная нагрузка, кН/м²
  snowLoad: number; // снеговая нагрузка, кН/м²
  windLoad: number; // ветровая нагрузка, кН/м²
  totalLoad: number; // суммарная нагрузка, кН/м²
  nodeForces: number[]; // усилия в узлах, кН
  maxCompression: number; // максимальное сжатие, кН
  maxTension: number; // максимальное растяжение, кН
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
  trussGeometry: TrussGeometry;
  sections: ElementSections;
  loads: LoadAnalysis;
  dxfContent: string;
  bom: BillOfMaterials;
  warnings: string[];
}

export interface TrussCalculation {
  geometry: TrussGeometry;
  sections: ElementSections;
  loads: LoadAnalysis;
  bom: BillOfMaterials;
}

// Telegram WebApp Types
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: any;
        version: string;
        isVersionAtLeast: (version: string) => boolean;
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        isVerticalSwipesEnabled?: boolean;
        disableVerticalSwipes?: () => void;
        enableVerticalSwipes?: () => void;
        MainButton: {
            text: string;
            color: string;
            textColor: string;
            isVisible: boolean;
            isActive: boolean;
            show: () => void;
            hide: () => void;
        };
        showAlert?: (message: string, callback?: () => void) => void;
      }
    }
  }
}