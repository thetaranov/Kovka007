/**
 * Расчет снеговых и ветровых нагрузок по СП 20.13330.2016
 * "Нагрузки и воздействия" (актуализированная редакция СНиП 2.01.07-85*)
 */

// Снеговые районы РФ (кг/м²) - нормативное значение Sg
export const SNOW_REGIONS: Record<string, { name: string; Sg: number }> = {
  I: { name: 'I район (юг)', Sg: 80 },
  II: { name: 'II район', Sg: 120 },
  III: { name: 'III район', Sg: 180 },
  IV: { name: 'IV район (Москва)', Sg: 240 },
  V: { name: 'V район', Sg: 320 },
  VI: { name: 'VI район', Sg: 400 },
  VII: { name: 'VII район (север)', Sg: 480 },
  VIII: { name: 'VIII район (крайний север)', Sg: 560 },
};

// Ветровые районы РФ (Па) - нормативное значение w0
export const WIND_REGIONS: Record<string, { name: string; w0: number }> = {
  Ia: { name: 'Ia район', w0: 170 },
  I: { name: 'I район', w0: 230 },
  II: { name: 'II район', w0: 300 },
  III: { name: 'III район (Москва)', w0: 380 },
  IV: { name: 'IV район', w0: 480 },
  V: { name: 'V район', w0: 600 },
  VI: { name: 'VI район', w0: 730 },
  VII: { name: 'VII район (юг)', w0: 850 },
};

// Типы местности
export type TerrainType = 'A' | 'B' | 'C';

export const TERRAIN_TYPES: Record<TerrainType, string> = {
  A: 'Открытая местность (степи, пустыни, побережья)',
  B: 'Города, леса, местность с препятствиями до 10м',
  C: 'Городские районы с застройкой выше 25м',
};

// Коэффициенты k для разных высот и типов местности (табл. 11.2 СП 20)
const TERRAIN_K: Record<TerrainType, Record<number, number>> = {
  A: { 5: 0.75, 10: 1.0, 20: 1.25, 40: 1.5, 60: 1.7, 80: 1.85, 100: 1.95, 150: 2.1, 200: 2.2, 250: 2.3, 300: 2.35 },
  B: { 5: 0.5, 10: 0.65, 20: 0.85, 40: 1.1, 60: 1.3, 80: 1.45, 100: 1.55, 150: 1.75, 200: 1.9, 250: 2.0, 300: 2.1 },
  C: { 5: 0.4, 10: 0.4, 20: 0.55, 40: 0.8, 60: 1.0, 80: 1.15, 100: 1.25, 150: 1.5, 200: 1.7, 250: 1.85, 300: 1.95 },
};

export interface LoadCalculationInput {
  snowRegion: string;
  windRegion: string;
  terrain: TerrainType;
  buildingHeight: number; // высота до карниза, м
  roofAngle: number; // угол наклона кровли, градусы
  roofType: 'single' | 'gable' | 'arched' | 'triangular' | 'semiarched';
  roofWidth: number; // ширина пролета, м
  roofLength: number; // длина навеса, м
}

export interface LoadCalculationResult {
  // Снеговая нагрузка
  snowNormative: number; // кг/м² - нормативная
  snowCalculated: number; // кг/м² - расчетная (с коэф. надежности)
  snowTotal: number; // кг - общая на кровлю
  snowCoefficient: number; // µ - коэффициент перехода

  // Ветровая нагрузка
  windNormative: number; // Па - нормативное давление
  windCalculated: number; // Па - расчетное давление
  windLift: number; // кг/м² - отрыв кровли
  windPressure: number; // кг/м² - давление на стенки

  // Итоговые нагрузки для расчета конструкций
  totalVerticalLoad: number; // кг/м² - вертикальная (снег + собственный вес)
  totalHorizontalLoad: number; // кг/м² - горизонтальная (ветер)
  
  // Рекомендации по конструктиву
  recommendedPillarSize: string;
  recommendedTrussHeight: number;
  recommendedPurlinStep: number;
  safetyMargin: number; // запас прочности, %
  
  // Описание для пользователя
  description: string;
  warnings: string[];
}

/**
 * Интерполяция коэффициента k по высоте
 */
function getTerrainK(terrain: TerrainType, height: number): number {
  const table = TERRAIN_K[terrain];
  const heights = Object.keys(table).map(Number).sort((a, b) => a - b);
  
  if (height <= heights[0]) return table[heights[0]];
  if (height >= heights[heights.length - 1]) return table[heights[heights.length - 1]];
  
  // Линейная интерполяция
  for (let i = 0; i < heights.length - 1; i++) {
    if (height >= heights[i] && height <= heights[i + 1]) {
      const h1 = heights[i];
      const h2 = heights[i + 1];
      const k1 = table[h1];
      const k2 = table[h2];
      return k1 + (k2 - k1) * (height - h1) / (h2 - h1);
    }
  }
  
  return table[heights[0]];
}

/**
 * Коэффициент µ для перехода от веса снега на земле к нагрузке на покрытие
 */
function getSnowCoefficient(roofAngle: number, roofType: string): number {
  // По СП 20.13330.2016, табл. 10.1
  const alpha = roofAngle;
  
  if (roofType === 'arched') {
    // Для арочных крыш µ меньше из-за скатывания снега
    if (alpha <= 20) return 0.8;
    if (alpha <= 30) return 0.6;
    return 0.4;
  }
  
  // Для односкатных и двускатных
  if (alpha <= 25) return 1.0;
  if (alpha <= 60) return 1.0 - (alpha - 25) / 35 * 0.75; // линейная интерполяция до 0.25
  return 0; // при уклоне > 60° снег не задерживается
}

/**
 * Аэродинамический коэффициент для кровли
 */
function getAeroCoefficient(roofAngle: number, roofType: string): { pressure: number; suction: number } {
  // Упрощенные коэффициенты по СП 20
  const alpha = roofAngle;
  
  if (roofType === 'single' || roofType === 'triangular' || roofType === 'semiarched') {
    // Односкатная - с наветренной стороны давление, с подветренной - отсос
    return {
      pressure: alpha < 15 ? -0.6 : alpha < 30 ? 0.2 : 0.6,
      suction: -0.4 - 0.3 * Math.min(alpha / 45, 1),
    };
  }
  
  if (roofType === 'gable') {
    // Двускатная
    return {
      pressure: alpha < 20 ? -0.4 : 0.4,
      suction: -0.5,
    };
  }
  
  // Арочная
  return {
    pressure: -0.4,
    suction: -0.8,
  };
}

/**
 * Главная функция расчета нагрузок
 */
export function calculateLoads(input: LoadCalculationInput): LoadCalculationResult {
  const warnings: string[] = [];
  
  // 1. Снеговая нагрузка
  const snowRegion = SNOW_REGIONS[input.snowRegion] || SNOW_REGIONS['IV'];
  const Sg = snowRegion.Sg; // кг/м²
  const mu = getSnowCoefficient(input.roofAngle, input.roofType);
  
  // Коэффициент надежности по снеговой нагрузке γf = 1.4
  const snowNormative = Sg * mu;
  const snowCalculated = snowNormative * 1.4;
  
  // Площадь кровли с учетом уклона
  const roofAngleRad = (input.roofAngle * Math.PI) / 180;
  let roofAreaMultiplier = 1.0;
  
  if (input.roofType === 'gable') {
    roofAreaMultiplier = 1 / Math.cos(roofAngleRad);
  } else if (input.roofType === 'arched') {
    // Для арки ~ π/2 от ширины
    roofAreaMultiplier = 1.2;
  } else {
    roofAreaMultiplier = 1 / Math.cos(roofAngleRad);
  }
  
  const roofArea = input.roofWidth * input.roofLength * roofAreaMultiplier;
  const snowTotal = snowCalculated * roofArea;
  
  // 2. Ветровая нагрузка
  const windRegion = WIND_REGIONS[input.windRegion] || WIND_REGIONS['III'];
  const w0 = windRegion.w0; // Па
  const k = getTerrainK(input.terrain, input.buildingHeight);
  const c = 0.8; // пульсационный коэффициент для низких зданий
  
  // Нормативное ветровое давление w = w0 * k * c
  const windNormative = w0 * k * c; // Па
  // Коэффициент надежности γf = 1.4
  const windCalculated = windNormative * 1.4;
  
  // Аэродинамические коэффициенты
  const aero = getAeroCoefficient(input.roofAngle, input.roofType);
  
  // Перевод Па в кг/м²: 1 Па = 0.102 кг/м²
  const paToKgM2 = 0.102;
  const windLift = Math.abs(aero.suction) * windCalculated * paToKgM2;
  const windPressure = Math.abs(aero.pressure) * windCalculated * paToKgM2;
  
  // 3. Итоговые нагрузки
  const selfWeight = 25; // кг/м² - собственный вес кровли (ориентировочно)
  const totalVerticalLoad = snowCalculated + selfWeight;
  const totalHorizontalLoad = windPressure;
  
  // 4. Рекомендации по конструктиву
  let recommendedPillarSize = '80x80';
  let recommendedTrussHeight = 0.3;
  let recommendedPurlinStep = 1.0;
  
  // Подбор сечения столбов по нагрузке и пролету
  const span = input.roofWidth;
  const loadPerMeter = totalVerticalLoad * input.roofLength;
  
  if (span > 8 || loadPerMeter > 5000) {
    recommendedPillarSize = '120x120';
    recommendedTrussHeight = 0.5;
    recommendedPurlinStep = 0.8;
  } else if (span > 6 || loadPerMeter > 3000) {
    recommendedPillarSize = '100x100';
    recommendedTrussHeight = 0.4;
    recommendedPurlinStep = 0.9;
  } else if (span > 4.5 || loadPerMeter > 2000) {
    recommendedPillarSize = '80x80';
    recommendedTrussHeight = 0.35;
    recommendedPurlinStep = 1.0;
  } else {
    recommendedPillarSize = '60x60';
    recommendedTrussHeight = 0.25;
    recommendedPurlinStep = 1.2;
  }
  
  // Проверка на критические условия
  if (snowCalculated > 400) {
    warnings.push('⚠️ Высокая снеговая нагрузка! Рекомендуется регулярная очистка кровли.');
  }
  
  if (windCalculated > 600) {
    warnings.push('⚠️ Высокая ветровая нагрузка! Требуется усиленное крепление кровли.');
  }
  
  if (span > 6 && input.roofAngle < 15) {
    warnings.push('⚠️ При большом пролете и малом уклоне возможно накопление снега.');
  }
  
  // Запас прочности
  const safetyMargin = 30; // 30% запас
  
  // Описание
  const description = `
Расчет выполнен по СП 20.13330.2016 для ${snowRegion.name} снегового и ${windRegion.name} ветрового районов.
Нормативная снеговая нагрузка: ${snowNormative.toFixed(0)} кг/м²
Расчетная снеговая нагрузка: ${snowCalculated.toFixed(0)} кг/м²
Общий вес снега на кровле: ${(snowTotal / 1000).toFixed(1)} т
Ветровое давление: ${(windPressure).toFixed(1)} кг/м²
Рекомендуемое сечение столбов: ${recommendedPillarSize} мм
`.trim();
  
  return {
    snowNormative: Math.round(snowNormative),
    snowCalculated: Math.round(snowCalculated),
    snowTotal: Math.round(snowTotal),
    snowCoefficient: mu,
    windNormative: Math.round(windNormative),
    windCalculated: Math.round(windCalculated),
    windLift: Math.round(windLift * 10) / 10,
    windPressure: Math.round(windPressure * 10) / 10,
    totalVerticalLoad: Math.round(totalVerticalLoad),
    totalHorizontalLoad: Math.round(totalHorizontalLoad * 10) / 10,
    recommendedPillarSize,
    recommendedTrussHeight,
    recommendedPurlinStep,
    safetyMargin,
    description,
    warnings,
  };
}

/**
 * Определение района по городу (упрощенная база)
 */
export const CITY_REGIONS: Record<string, { snow: string; wind: string }> = {
  'Москва': { snow: 'IV', wind: 'III' },
  'Санкт-Петербург': { snow: 'III', wind: 'II' },
  'Краснодар': { snow: 'II', wind: 'IV' },
  'Сочи': { snow: 'I', wind: 'V' },
  'Казань': { snow: 'IV', wind: 'III' },
  'Новосибирск': { snow: 'IV', wind: 'III' },
  'Екатеринбург': { snow: 'IV', wind: 'II' },
  'Нижний Новгород': { snow: 'IV', wind: 'II' },
  'Челябинск': { snow: 'III', wind: 'II' },
  'Самара': { snow: 'IV', wind: 'III' },
  'Ростов-на-Дону': { snow: 'II', wind: 'IV' },
  'Уфа': { snow: 'V', wind: 'II' },
  'Волгоград': { snow: 'II', wind: 'IV' },
  'Воронеж': { snow: 'III', wind: 'III' },
  'Пермь': { snow: 'V', wind: 'II' },
  'Красноярск': { snow: 'III', wind: 'III' },
  'Саратов': { snow: 'III', wind: 'III' },
  'Тольятти': { snow: 'IV', wind: 'III' },
  'Ижевск': { snow: 'V', wind: 'II' },
  'Барнаул': { snow: 'IV', wind: 'III' },
  'Тюмень': { snow: 'III', wind: 'II' },
  'Ульяновск': { snow: 'IV', wind: 'III' },
  'Иркутск': { snow: 'II', wind: 'III' },
  'Владивосток': { snow: 'III', wind: 'V' },
  'Хабаровск': { snow: 'III', wind: 'III' },
  'Ярославль': { snow: 'IV', wind: 'II' },
  'Махачкала': { snow: 'I', wind: 'V' },
  'Томск': { snow: 'IV', wind: 'III' },
  'Оренбург': { snow: 'IV', wind: 'III' },
  'Кемерово': { snow: 'IV', wind: 'III' },
  'Рязань': { snow: 'III', wind: 'II' },
  'Астрахань': { snow: 'I', wind: 'IV' },
  'Пенза': { snow: 'IV', wind: 'III' },
  'Липецк': { snow: 'III', wind: 'III' },
  'Тула': { snow: 'III', wind: 'II' },
  'Киров': { snow: 'V', wind: 'II' },
  'Чебоксары': { snow: 'IV', wind: 'II' },
  'Калининград': { snow: 'II', wind: 'II' },
  'Брянск': { snow: 'III', wind: 'II' },
  'Курск': { snow: 'III', wind: 'III' },
  'Иваново': { snow: 'IV', wind: 'II' },
  'Магнитогорск': { snow: 'III', wind: 'II' },
  'Улан-Удэ': { snow: 'II', wind: 'III' },
  'Тверь': { snow: 'IV', wind: 'II' },
  'Ставрополь': { snow: 'II', wind: 'IV' },
  'Белгород': { snow: 'III', wind: 'III' },
  'Сургут': { snow: 'IV', wind: 'II' },
  'Владимир': { snow: 'IV', wind: 'II' },
  'Архангельск': { snow: 'V', wind: 'III' },
  'Череповец': { snow: 'IV', wind: 'II' },
  'Саранск': { snow: 'IV', wind: 'III' },
  'Вологда': { snow: 'IV', wind: 'II' },
  'Орёл': { snow: 'III', wind: 'II' },
  'Смоленск': { snow: 'III', wind: 'II' },
  'Мурманск': { snow: 'V', wind: 'IV' },
  'Якутск': { snow: 'II', wind: 'II' },
  'Нижневартовск': { snow: 'IV', wind: 'II' },
  'Тамбов': { snow: 'III', wind: 'III' },
  'Грозный': { snow: 'II', wind: 'IV' },
  'Стерлитамак': { snow: 'IV', wind: 'II' },
  'Кострома': { snow: 'IV', wind: 'II' },
  'Петрозаводск': { snow: 'IV', wind: 'III' },
  'Нижнекамск': { snow: 'IV', wind: 'III' },
  'Йошкар-Ола': { snow: 'IV', wind: 'II' },
  'Новокузнецк': { snow: 'IV', wind: 'III' },
  'Таганрог': { snow: 'II', wind: 'IV' },
  'Комсомольск-на-Амуре': { snow: 'IV', wind: 'III' },
  'Нальчик': { snow: 'II', wind: 'IV' },
  'Сыктывкар': { snow: 'V', wind: 'II' },
  'Шахты': { snow: 'II', wind: 'IV' },
  'Дзержинск': { snow: 'IV', wind: 'II' },
  'Братск': { snow: 'III', wind: 'II' },
  'Орск': { snow: 'III', wind: 'III' },
  'Ангарск': { snow: 'II', wind: 'III' },
  'Энгельс': { snow: 'III', wind: 'III' },
  'Благовещенск': { snow: 'II', wind: 'III' },
  'Старый Оскол': { snow: 'III', wind: 'III' },
  'Великий Новгород': { snow: 'III', wind: 'II' },
  'Псков': { snow: 'III', wind: 'II' },
};
