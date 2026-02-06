/**
 * Основные типы приложения Kovka007 Конструктор
 */

// ========================
// ЦВЕТА
// ========================

export interface ColorOption {
  name: string;
  hex: string;
  ral: string;
}

// ========================
// ТИПЫ КОНСТРУКЦИЙ
// ========================

export enum RoofType {
  SingleSlope = 'single',      // Односкатный
  Gable = 'gable',             // Двускатный
  Arched = 'arched',           // Арочный
  Triangular = 'triangular',   // Треугольный (односкатный с фермой)
  SemiArched = 'semiarched',   // Полуарочный
}

export enum PillarSize {
  Size60 = '60x60',
  Size80 = '80x80',
  Size100 = '100x100',
  Size120 = '120x120', // для особо больших пролетов
}

export enum RoofMaterial {
  Polycarbonate = 'polycarbonate',
  MetalTile = 'metaltile',
  Decking = 'decking',
}

export enum PaintType {
  None = 'none',         // Грунт-эмаль
  Ral = 'ral',           // Эмаль RAL
  Polymer = 'polymer',   // Полимерно-порошковая
}

export enum InstallationType {
  FoundationPour = 'foundation_pour',  // Заливка фундамента
  OnPosts = 'on_posts',                // Установка на залитые столбы
  OnEmbedded = 'on_embedded',          // Установка на закладные
  None = 'none',                       // Без монтажа
}

// ========================
// КОНФИГУРАЦИЯ НАВЕСА
// ========================

export interface CarportConfig {
  // Габариты
  width: number;         // ширина (м)
  length: number;        // длина (м)
  height: number;        // высота столбов (м)
  
  // Конструктив
  pillarSize: PillarSize;
  roofType: RoofType;
  roofSlope: number;     // угол наклона (градусы)
  roofMaterial: RoofMaterial;
  
  // Отделка
  frameColor: string;
  roofColor: string;
  paintType: PaintType;

  // Опции
  hasTrusses: boolean;       // усиленные фермы
  hasSideWalls: boolean;     // боковая зашивка
  hasGutters: boolean;       // водостоки
  hasFoundation: boolean;    // бетонный фундамент
  hasInstallation: boolean;  // монтаж под ключ
  foundationThickness: number; // толщина фундамента (м)
  installationType: InstallationType; // тип монтажа
  
  // Расположение (для расчета нагрузок)
  region?: string;           // город/регион
  snowRegion?: string;       // снеговой район
  windRegion?: string;       // ветровой район
  terrain?: 'A' | 'B' | 'C'; // тип местности
}

// ========================
// ВОРОТА
// ========================

export enum GateType {
  None = 'none',
  Sliding = 'sliding',     // Откатные
  Swing = 'swing',         // Распашные  
  Hinged = 'hinged',       // Секционные
}

export enum GateFilling {
  Solid = 'solid',         // Профлист
  Lattice = 'lattice',     // Решетка
  Forged = 'forged',       // Ковка
  Combined = 'combined',   // Комбинированные
}

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
}

// ========================
// ПОЛНАЯ КОНФИГУРАЦИЯ ПРОЕКТА
// ========================

export interface ProjectConfig {
  carport: CarportConfig;
  gate: GateConfig;
  deliveryDistance: number;  // км
  comment: string;           // пожелания
}

// ========================
// ОГРАНИЧЕНИЯ
// ========================

export const MIN_WIDTH = 3;
export const MAX_WIDTH = 12;
export const MIN_LENGTH = 3;
export const MAX_LENGTH = 20;
export const MIN_HEIGHT = 2;
export const MAX_HEIGHT = 4.5;

// ========================
// TELEGRAM WEBAPP
// ========================

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        isVersionAtLeast: (version: string) => boolean;
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
        openLink: (url: string) => void;
        openTelegramLink: (url: string) => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
        showPopup: (params: {
          title?: string;
          message: string;
          buttons?: Array<{ id?: string; type?: string; text: string }>;
        }, callback?: (buttonId: string) => void) => void;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        isVerticalSwipesEnabled?: boolean;
        disableVerticalSwipes?: () => void;
        enableVerticalSwipes?: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        enableClosingConfirmation: () => void;
        disableClosingConfirmation: () => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
        BackButton: {
          isVisible: boolean;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

// ========================
// РАСЧЕТЫ
// ========================

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

export interface LoadsInfo {
  snowLoad: number;      // кг/м²
  windLoad: number;      // Па
  totalLoad: number;     // кг/м²
  recommended: {
    pillarSize: PillarSize;
    trussHeight: number;
    purlinStep: number;
  };
  warnings: string[];
}

// ========================
// ЗАКАЗ
// ========================

export interface OrderPayload {
  id: string;
  timestamp: string;
  
  // Навес
  type: RoofType;
  width: number;
  length: number;
  height: number;
  height_peak: number;
  slope: number;
  pillar: PillarSize;
  area_floor: string;
  area_roof: string;
  material: RoofMaterial;
  paint: PaintType;
  color_frame: string;
  color_roof: string;
  
  opts: {
    trusses: boolean;
    gutters: boolean;
    walls: boolean;
    found: boolean;
    install: boolean;
  };
  
  // Ворота
  gate?: {
    type: GateType;
    width: number;
    height: number;
    filling: GateFilling;
    color: string;
    wicket: boolean;
    automation: boolean;
  };
  
  // Расположение
  region?: string;
  snow_region?: string;
  wind_region?: string;
  
  // Нагрузки (для чертежа)
  loads?: {
    snow: number;
    wind: number;
    total: number;
  };
  
  // Цены
  price: number;
  price_gate: number;
  price_total: number;
  
  // Дополнительно
  delivery_km: number;
  comment: string;
  
  // CAD данные (base64 DXF)
  cad_dxf?: string;
}
