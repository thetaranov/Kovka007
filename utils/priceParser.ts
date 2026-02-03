/**
 * Сервис для парсинга цен из Google Sheets
 * Поддерживает динамическое обновление цен на материалы
 */

export interface PriceData {
  // Кровельные материалы (за м²)
  polycarbonate: number;
  metaltile: number;
  decking: number;
  roofingFilm: number;
  roofingScrews: number;
  
  // Металлопрокат (за м.п. или кг)
  pipe60x60: number;
  pipe80x80: number;
  pipe100x100: number;
  pipe40x20: number; // профлист обрешетки
  pipe20x20: number; // прогоны
  sheetMetal2mm: number;
  
  // Прочие материалы
  concrete: number; // за м³
  rebar12: number; // за м.п.
  sand: number; // за м³
  gravel: number; // за м³
  paint: number; // за кг
  paintPolymer: number; // полимерная за кг
  primer: number; // грунт за кг
  fasteners: number; // метизы за комплект
  
  // Работы (за м² или шт)
  installation: number; // монтаж за м²
  welding: number; // сварка за м.п.
  foundation: number; // фундамент за шт
  concreting: number; // бетонирование за м³
  painting: number; // покраска за м²
  design: number; // проектирование
  
  // Ворота
  gateSliding: number; // откатные за м²
  gateSwing: number; // распашные за м²
  gateHinged: number; // навесные за м²
  gateWicketBuiltIn: number;
  gateWicketSeparate: number;
  fillingLattice: number;
  fillingForged: number;
  fillingCombined: number;
  automation: number; // автоматика за комплект
  motorSliding: number;
  motorReducer: number;
  rack: number;
  controlUnit: number;
  photocells: number;
  signalLamp: number;
  remote: number;
  keySwitch: number;
  intercom: number;
  backupBattery: number;
  fittingsSliding: number;
  rollerSet: number;
  guideRoller: number;
  catcherUpper: number;
  catcherLower: number;
  carriage: number;
  hinge: number;
  lock: number;
  handle: number;
  
  // Доставка
  deliveryBase: number; // базовая
  deliveryPerKm: number; // за км
  measurerVisit: number;
  
  lastUpdated: string;
  source: string;
}

// Значения по умолчанию (если нет подключения)
export const DEFAULT_PRICES: PriceData = {
  polycarbonate: 1100,
  metaltile: 1300,
  decking: 900,
  roofingFilm: 120,
  roofingScrews: 6,
  
  pipe60x60: 180,
  pipe80x80: 280,
  pipe100x100: 420,
  pipe40x20: 85,
  pipe20x20: 55,
  sheetMetal2mm: 2500,
  
  concrete: 4500,
  rebar12: 95,
  sand: 900,
  gravel: 1200,
  paint: 450,
  paintPolymer: 1200,
  primer: 180,
  fasteners: 150,
  
  installation: 2500,
  welding: 350,
  foundation: 4000,
  concreting: 1200,
  painting: 450,
  design: 15000,
  
  gateSliding: 8500,
  gateSwing: 6500,
  gateHinged: 7500,
  gateWicketBuiltIn: 12000,
  gateWicketSeparate: 18000,
  fillingLattice: 800,
  fillingForged: 2500,
  fillingCombined: 1500,
  automation: 35000,
  motorSliding: 28000,
  motorReducer: 6500,
  rack: 900,
  controlUnit: 8500,
  photocells: 3500,
  signalLamp: 2200,
  remote: 900,
  keySwitch: 1800,
  intercom: 18000,
  backupBattery: 9000,
  fittingsSliding: 18000,
  rollerSet: 2500,
  guideRoller: 1200,
  catcherUpper: 800,
  catcherLower: 800,
  carriage: 3200,
  hinge: 750,
  lock: 2500,
  handle: 600,
  
  deliveryBase: 5000,
  deliveryPerKm: 50,
  measurerVisit: 2000,
  
  lastUpdated: new Date().toISOString(),
  source: 'default',
};

// Кэш цен
let priceCache: PriceData | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

/**
 * Парсит данные из публичной Google Таблицы
 * Формат URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/gviz/tq?tqx=out:json
 */
export async function fetchPricesFromGoogleSheets(spreadsheetId: string): Promise<PriceData> {
  try {
    // Проверяем кэш
    const now = Date.now();
    if (priceCache && now - lastFetchTime < CACHE_DURATION) {
      return priceCache;
    }
    
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    
    // Google Sheets возвращает JSON обернутый в callback
    // Формат: google.visualization.Query.setResponse({...})
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!jsonMatch) {
      throw new Error('Invalid Google Sheets response format');
    }
    
    const data = JSON.parse(jsonMatch[1]);
    const rows = data.table.rows;
    
    // Парсим таблицу (ожидаем формат: Наименование | Цена | Единица)
    const prices: Partial<PriceData> = {};
    
    const fieldMapping: Record<string, keyof PriceData> = {
      'поликарбонат': 'polycarbonate',
      'металлочерепица': 'metaltile',
      'профнастил': 'decking',
      'кровельная пленка': 'roofingFilm',
      'саморезы кровельные': 'roofingScrews',
      'труба 60x60': 'pipe60x60',
      'труба 80x80': 'pipe80x80',
      'труба 100x100': 'pipe100x100',
      'труба 40x20': 'pipe40x20',
      'труба 20x20': 'pipe20x20',
      'листовой металл 2мм': 'sheetMetal2mm',
      'бетон': 'concrete',
      'арматура 12мм': 'rebar12',
      'песок': 'sand',
      'щебень': 'gravel',
      'краска': 'paint',
      'полимерная краска': 'paintPolymer',
      'грунт': 'primer',
      'метизы': 'fasteners',
      'монтаж': 'installation',
      'сварка': 'welding',
      'фундамент': 'foundation',
      'бетонирование': 'concreting',
      'покраска': 'painting',
      'проектирование': 'design',
      'откатные ворота': 'gateSliding',
      'распашные ворота': 'gateSwing',
      'секционные ворота': 'gateHinged',
      'встроенная калитка': 'gateWicketBuiltIn',
      'калитка отдельная': 'gateWicketSeparate',
      'заполнение решетка': 'fillingLattice',
      'заполнение ковка': 'fillingForged',
      'заполнение комбинированное': 'fillingCombined',
      'автоматика': 'automation',
      'двигатель откатных ворот': 'motorSliding',
      'редуктор': 'motorReducer',
      'рейка зубчатая': 'rack',
      'блок управления': 'controlUnit',
      'фотоэлементы': 'photocells',
      'сигнальная лампа': 'signalLamp',
      'пульт ду': 'remote',
      'ключ-выключатель': 'keySwitch',
      'домофон': 'intercom',
      'акб резерв': 'backupBattery',
      'фурнитура откатных': 'fittingsSliding',
      'ролики опорные': 'rollerSet',
      'ролик направляющий': 'guideRoller',
      'ловитель верхний': 'catcherUpper',
      'ловитель нижний': 'catcherLower',
      'каретка роликовая': 'carriage',
      'петли распашные': 'hinge',
      'замок': 'lock',
      'ручка': 'handle',
      'доставка база': 'deliveryBase',
      'доставка км': 'deliveryPerKm',
      'выезд замерщика': 'measurerVisit',
    };
    
    for (const row of rows) {
      if (!row.c || !row.c[0] || !row.c[1]) continue;
      
      const name = String(row.c[0].v || '').toLowerCase().trim();
      const value = parseFloat(row.c[1].v);
      
      if (isNaN(value)) continue;
      
      for (const [key, field] of Object.entries(fieldMapping)) {
        if (name.includes(key)) {
          (prices as any)[field] = value;
          break;
        }
      }
    }
    
    const result: PriceData = {
      ...DEFAULT_PRICES,
      ...prices,
      lastUpdated: new Date().toISOString(),
      source: 'google_sheets',
    };
    
    // Сохраняем в кэш
    priceCache = result;
    lastFetchTime = now;
    
    return result;
  } catch (error) {
    console.error('Error fetching prices from Google Sheets:', error);
    
    // Возвращаем кэш или дефолтные значения
    return priceCache || DEFAULT_PRICES;
  }
}

/**
 * Получает цены (из кэша или загружает)
 */
export async function getPrices(spreadsheetId?: string): Promise<PriceData> {
  if (spreadsheetId) {
    return fetchPricesFromGoogleSheets(spreadsheetId);
  }
  
  return priceCache || DEFAULT_PRICES;
}

/**
 * Принудительно обновляет кэш цен
 */
export async function refreshPrices(spreadsheetId: string): Promise<PriceData> {
  priceCache = null;
  lastFetchTime = 0;
  return fetchPricesFromGoogleSheets(spreadsheetId);
}

/**
 * Форматирует цену для отображения
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Вычисляет стоимость материалов для навеса
 */
export interface MaterialCalculation {
  items: {
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  workCost: number;
  deliveryCost: number;
  total: number;
}

export function calculateMaterialCost(
  width: number,
  length: number,
  height: number,
  pillarSize: string,
  roofMaterial: string,
  options: {
    hasTrusses?: boolean;
    hasGutters?: boolean;
    hasSideWalls?: boolean;
    hasFoundation?: boolean;
    hasInstallation?: boolean;
  },
  prices: PriceData,
  deliveryDistance: number = 0,
): MaterialCalculation {
  const items: MaterialCalculation['items'] = [];
  
  // Площадь кровли (с запасом на свесы)
  const roofArea = (width + 0.8) * (length + 0.4);
  
  // Количество столбов
  const colSpacing = 3.0;
  const rowSpacing = 2.5;
  const numCols = Math.ceil(width / colSpacing) + 1;
  const numRows = Math.ceil(length / rowSpacing) + 1;
  const pillarCount = numCols * numRows;
  
  // Длина столбов
  const pillarLength = height + 0.6; // +60см на заглубление
  const totalPillarLength = pillarCount * pillarLength;
  
  // Цена трубы для столбов
  let pillarPrice = prices.pipe80x80;
  if (pillarSize === '60x60') pillarPrice = prices.pipe60x60;
  if (pillarSize === '100x100') pillarPrice = prices.pipe100x100;
  
  items.push({
    name: `Труба ${pillarSize} (столбы)`,
    quantity: Math.ceil(totalPillarLength),
    unit: 'м.п.',
    unitPrice: pillarPrice,
    total: Math.ceil(totalPillarLength) * pillarPrice,
  });
  
  // Фермы и прогоны
  const trussCount = Math.ceil(length / 1.5) + 1;
  const trussLength = width * 2.5; // примерная длина трубы на одну ферму
  const totalTrussLength = trussCount * trussLength;
  
  items.push({
    name: 'Труба 40x20 (фермы)',
    quantity: Math.ceil(totalTrussLength),
    unit: 'м.п.',
    unitPrice: prices.pipe40x20,
    total: Math.ceil(totalTrussLength) * prices.pipe40x20,
  });
  
  // Прогоны (обрешетка)
  const purlinCount = Math.ceil(width / 0.8);
  const totalPurlinLength = purlinCount * (length + 0.4);
  
  items.push({
    name: 'Труба 20x20 (прогоны)',
    quantity: Math.ceil(totalPurlinLength),
    unit: 'м.п.',
    unitPrice: prices.pipe20x20,
    total: Math.ceil(totalPurlinLength) * prices.pipe20x20,
  });
  
  // Связи и мауэрлаты
  const bracingLength = numCols * (length + height * 0.5);
  items.push({
    name: 'Труба 40x20 (связи)',
    quantity: Math.ceil(bracingLength),
    unit: 'м.п.',
    unitPrice: prices.pipe40x20,
    total: Math.ceil(bracingLength) * prices.pipe40x20,
  });
  
  // Кровельный материал
  let roofPrice = prices.polycarbonate;
  let roofName = 'Поликарбонат';
  if (roofMaterial === 'metaltile') {
    roofPrice = prices.metaltile;
    roofName = 'Металлочерепица';
  } else if (roofMaterial === 'decking') {
    roofPrice = prices.decking;
    roofName = 'Профнастил';
  }
  
  items.push({
    name: roofName,
    quantity: Math.ceil(roofArea * 1.1), // +10% на раскрой
    unit: 'м²',
    unitPrice: roofPrice,
    total: Math.ceil(roofArea * 1.1) * roofPrice,
  });
  
  // Краска
  const metalArea = totalPillarLength * 0.3 + totalTrussLength * 0.15 + totalPurlinLength * 0.08;
  const paintKg = metalArea * 0.15; // ~150г/м²
  
  items.push({
    name: 'Краска (грунт-эмаль)',
    quantity: Math.ceil(paintKg),
    unit: 'кг',
    unitPrice: prices.paint,
    total: Math.ceil(paintKg) * prices.paint,
  });
  
  // Метизы
  items.push({
    name: 'Метизы (комплект)',
    quantity: Math.ceil(roofArea / 5), // 1 комплект на 5 м²
    unit: 'комп.',
    unitPrice: prices.fasteners,
    total: Math.ceil(roofArea / 5) * prices.fasteners,
  });
  
  // Опции
  if (options.hasFoundation) {
    items.push({
      name: 'Бетонный фундамент',
      quantity: pillarCount,
      unit: 'шт',
      unitPrice: prices.foundation,
      total: pillarCount * prices.foundation,
    });
  }
  
  if (options.hasGutters) {
    const gutterLength = length * 2 + width;
    items.push({
      name: 'Водосточная система',
      quantity: Math.ceil(gutterLength),
      unit: 'м.п.',
      unitPrice: 850,
      total: Math.ceil(gutterLength) * 850,
    });
  }
  
  if (options.hasSideWalls) {
    const wallArea = length * height + width * height;
    items.push({
      name: 'Зашивка боковая',
      quantity: Math.ceil(wallArea),
      unit: 'м²',
      unitPrice: prices.decking,
      total: Math.ceil(wallArea) * prices.decking,
    });
  }
  
  // Подсчет итогов
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  
  // Работы
  let workCost = 0;
  if (options.hasInstallation) {
    workCost = roofArea * prices.installation;
  }
  
  // Доставка
  let deliveryCost = prices.deliveryBase;
  if (deliveryDistance > 30) {
    deliveryCost += (deliveryDistance - 30) * prices.deliveryPerKm;
  }
  
  const total = subtotal + workCost + deliveryCost;
  
  return {
    items,
    subtotal,
    workCost,
    deliveryCost,
    total: Math.round(total),
  };
}
