/**
 * Типы ворот и их конфигурация
 */

export enum GateType {
  None = 'none',
  Sliding = 'sliding',     // Откатные
  Swing = 'swing',         // Распашные  
  Hinged = 'hinged',       // Навесные (секционные)
}

export enum GateFilling {
  Solid = 'solid',         // Глухие (профлист)
  Lattice = 'lattice',     // Решетчатые
  Forged = 'forged',       // Кованые элементы
  Combined = 'combined',   // Комбинированные
  VerticalBars = 'vertical', // Вертикальные планки
}

export interface GateConfig {
  type: GateType;
  width: number;           // ширина проема, м
  height: number;          // высота ворот, м
  filling: GateFilling;
  frameColor: string;      // цвет рамы (RAL или hex)
  panelColor: string;      // цвет заполнения (RAL или hex)
  hasWicket: boolean;      // встроенная калитка
  hasAutomation: boolean;  // автоматический привод
  frameSize: string;       // сечение рамы '60x40' или '80x40'
  distanceFromCarport: number; // расстояние от ворот до выезда навеса, м
  openDirection: 'left' | 'right'; // направление открытия ворот
}

export interface WicketConfig {
  enabled: boolean;
  width: number;           // обычно 0.9-1.2 м
  height: number;          // обычно как ворота
  position: 'left' | 'right' | 'separate';
}

// Значения по умолчанию
export const DEFAULT_GATE_CONFIG: GateConfig = {
  type: GateType.None,
  width: 4.0,
  height: 2.0,
  filling: GateFilling.Solid,
  frameColor: '#1a1a1a',
  panelColor: '#3E2723',
  hasWicket: false,
  hasAutomation: false,
  frameSize: '60x40',
  distanceFromCarport: 2.0,
  openDirection: 'left', // по умолчанию влево
};

// Ограничения размеров
export const GATE_LIMITS = {
  sliding: {
    minWidth: 3.0,
    maxWidth: 6.0,
    minHeight: 1.8,
    maxHeight: 2.5,
  },
  swing: {
    minWidth: 2.5,
    maxWidth: 5.0,
    minHeight: 1.8,
    maxHeight: 2.5,
  },
  hinged: {
    minWidth: 2.5,
    maxWidth: 5.5,
    minHeight: 2.0,
    maxHeight: 3.0,
  },
};

// Цены на ворота (базовые)
export const GATE_PRICES = {
  sliding: {
    base: 45000,           // базовая стоимость
    perSqm: 8500,          // за м²
    automation: 35000,     // привод CAME/NICE
    wicket: 15000,         // калитка
  },
  swing: {
    base: 35000,
    perSqm: 6500,
    automation: 45000,     // два привода
    wicket: 12000,
  },
  hinged: {
    base: 55000,
    perSqm: 9500,
    automation: 40000,
    wicket: 0,             // не применимо
  },
};

export const FILLING_MULTIPLIERS: Record<GateFilling, number> = {
  [GateFilling.Solid]: 1.0,
  [GateFilling.Lattice]: 0.9,
  [GateFilling.Forged]: 1.8,
  [GateFilling.Combined]: 1.4,
  [GateFilling.VerticalBars]: 0.95,
};

/**
 * Расчет стоимости ворот
 */
export function calculateGatePrice(config: GateConfig): number {
  if (config.type === GateType.None) return 0;
  
  const prices = GATE_PRICES[config.type as keyof typeof GATE_PRICES];
  if (!prices) return 0;
  
  const area = config.width * config.height;
  const fillingMult = FILLING_MULTIPLIERS[config.filling];
  
  let total = prices.base;
  total += area * prices.perSqm * fillingMult;
  
  if (config.hasAutomation) {
    total += prices.automation;
  }
  
  if (config.hasWicket && prices.wicket > 0) {
    total += prices.wicket;
  }
  
  // Наценка за нестандартную высоту
  if (config.height > 2.2) {
    total *= 1.15;
  }
  
  // Наценка за широкие ворота
  if (config.width > 4.5) {
    total *= 1.1;
  }
  
  return Math.round(total);
}

/**
 * Генерация описания ворот для заказа
 */
export function getGateDescription(config: GateConfig): string {
  if (config.type === GateType.None) return 'Без ворот';
  
  const typeNames: Record<GateType, string> = {
    [GateType.None]: 'Без ворот',
    [GateType.Sliding]: 'Откатные ворота',
    [GateType.Swing]: 'Распашные ворота',
    [GateType.Hinged]: 'Секционные ворота',
  };
  
  const fillingNames: Record<GateFilling, string> = {
    [GateFilling.Solid]: 'профлист',
    [GateFilling.Lattice]: 'решетка',
    [GateFilling.Forged]: 'ковка',
    [GateFilling.Combined]: 'комбинированные',
    [GateFilling.VerticalBars]: 'вертикальные планки',
  };
  
  let desc = `${typeNames[config.type]} ${config.width}×${config.height}м`;
  desc += `, заполнение: ${fillingNames[config.filling]}`;
  
  if (config.hasWicket) desc += ', с калиткой';
  if (config.hasAutomation) desc += ', автоматика';
  
  return desc;
}
