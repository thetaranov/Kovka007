/**
 * Генератор CAD-моделей в форматах DXF и STEP
 * Создает точные чертежи для производства
 */

import { CarportConfig, RoofType, PillarSize } from '../types';
import { SPECS } from '../constants';
import { LoadCalculationResult } from './snowWindLoad';

// Типы для CAD геометрии
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Line3D {
  start: Point3D;
  end: Point3D;
  layer: string;
  color?: number;
}

export interface Beam {
  id: string;
  type: 'pillar' | 'truss_top' | 'truss_bottom' | 'truss_web' | 'purlin' | 'bracing' | 'mauerlat';
  section: string; // '80x80x3', '40x20x2' и т.д.
  start: Point3D;
  end: Point3D;
  length: number;
  angle: number; // угол наклона
  rotation: number; // поворот вокруг оси
  color: number; // DXF color index
}

export interface Joint {
  id: string;
  position: Point3D;
  type: 'welded' | 'bolted';
  beams: string[]; // ID соединяемых элементов
}

export interface CADModel {
  beams: Beam[];
  joints: Joint[];
  boundingBox: {
    min: Point3D;
    max: Point3D;
  };
  metadata: {
    width: number;
    length: number;
    height: number;
    roofType: string;
    totalWeight: number;
    beamCount: number;
    jointCount: number;
  };
}

/**
 * Получает размеры профиля в миллиметрах
 */
function getSectionSize(pillarSize: PillarSize): { width: number; height: number; thickness: number } {
  switch (pillarSize) {
    case PillarSize.Size60:
      return { width: 60, height: 60, thickness: 3 };
    case PillarSize.Size80:
      return { width: 80, height: 80, thickness: 3 };
    case PillarSize.Size100:
      return { width: 100, height: 100, thickness: 4 };
    case PillarSize.Size120:
      return { width: 120, height: 120, thickness: 4 };
    default:
      return { width: 80, height: 80, thickness: 3 };
  }
}

/**
 * Вычисляет расстояние между точками
 */
function distance(p1: Point3D, p2: Point3D): number {
  return Math.sqrt(
    Math.pow(p2.x - p1.x, 2) +
    Math.pow(p2.y - p1.y, 2) +
    Math.pow(p2.z - p1.z, 2)
  );
}

/**
 * Вычисляет угол наклона элемента
 */
function calculateAngle(start: Point3D, end: Point3D): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const horizontal = Math.sqrt(dx * dx + dz * dz);
  return Math.atan2(dy, horizontal) * (180 / Math.PI);
}

/**
 * Генерирует уникальный ID
 */
let beamCounter = 0;
let jointCounter = 0;

function generateBeamId(type: string): string {
  return `${type}_${++beamCounter}`;
}

function generateJointId(): string {
  return `J_${++jointCounter}`;
}

/**
 * Основная функция генерации CAD модели
 */
export function generateCADModel(config: CarportConfig, loads?: LoadCalculationResult): CADModel {
  // Сброс счетчиков
  beamCounter = 0;
  jointCounter = 0;
  
  const beams: Beam[] = [];
  const joints: Joint[] = [];
  
  const { width, length, height, roofType, pillarSize, roofSlope } = config;
  
  // Конвертация в миллиметры для точности (внутренний расчет), но храним в метрах для совместимости
  const W = width;
  const L = length;
  const H = height;
  
  const section = getSectionSize(pillarSize);
  const pillarSection = `${section.width}x${section.height}x${section.thickness}`;
  const trussSection = '40x40x3';
  const purlinSection = '40x20x2';
  const bracingSection = '40x20x2';
  
  // Параметры сетки столбов
  const maxSpan = 6.0; // максимальный пролет без промежуточных столбов
  const numBays = Math.max(1, Math.ceil(W / maxSpan));
  const numCols = numBays + 1;
  const colSpacing = W / numBays;
  
  const postSpacing = 3.5; // шаг столбов по длине
  const numRows = Math.ceil(L / postSpacing) + 1;
  const rowSpacing = L / (numRows - 1);
  
  // Расчет высот в зависимости от типа крыши
  const slopeRad = (roofSlope * Math.PI) / 180;
  
  function getHeightAtX(x: number): number {
    const xRel = x + W / 2; // смещение от 0
    
    switch (roofType) {
      case RoofType.SingleSlope:
      case RoofType.Triangular:
      case RoofType.SemiArched:
        return H + xRel * Math.tan(slopeRad);
      
      case RoofType.Gable:
        const distFromCenter = Math.abs(x);
        return H + (W / 2 - distFromCenter) * Math.tan(slopeRad);
      
      case RoofType.Arched:
        const rise = W * SPECS.trussHeightArch;
        const R = (Math.pow(W / 2, 2) + Math.pow(rise, 2)) / (2 * rise);
        const Cy = -(R - rise);
        const term = R * R - x * x;
        if (term > 0) {
          return H + Cy + Math.sqrt(term);
        }
        return H;
      
      default:
        return H;
    }
  }
  
  // === ГЕНЕРАЦИЯ СТОЛБОВ ===
  const pillarPositions: Point3D[][] = [];
  
  for (let c = 0; c < numCols; c++) {
    pillarPositions[c] = [];
    const x = -W / 2 + c * colSpacing;
    const hTop = getHeightAtX(x);
    
    for (let r = 0; r < numRows; r++) {
      const z = -L / 2 + r * rowSpacing;
      
      const start: Point3D = { x, y: 0, z };
      const end: Point3D = { x, y: hTop, z };
      
      pillarPositions[c][r] = end; // сохраняем верхнюю точку
      
      beams.push({
        id: generateBeamId('COL'),
        type: 'pillar',
        section: pillarSection,
        start,
        end,
        length: hTop,
        angle: 90,
        rotation: 0,
        color: 1, // красный в DXF
      });
      
      // Узел в основании
      joints.push({
        id: generateJointId(),
        position: start,
        type: 'bolted', // крепление к фундаменту
        beams: [beams[beams.length - 1].id],
      });
    }
  }
  
  // === ГЕНЕРАЦИЯ МАУЭРЛАТОВ (продольные балки по верху столбов) ===
  for (let c = 0; c < numCols; c++) {
    const x = -W / 2 + c * colSpacing;
    const hTop = getHeightAtX(x);
    
    const start: Point3D = { x, y: hTop, z: -L / 2 };
    const end: Point3D = { x, y: hTop, z: L / 2 };
    
    beams.push({
      id: generateBeamId('MAU'),
      type: 'mauerlat',
      section: pillarSection,
      start,
      end,
      length: L,
      angle: 0,
      rotation: 0,
      color: 2, // желтый
    });
  }
  
  // === ГЕНЕРАЦИЯ ФЕРМ ===
  const trussCount = Math.ceil(L / 1.5) + 1;
  const trussSpacing = L / (trussCount - 1);
  
  for (let t = 0; t < trussCount; t++) {
    const z = -L / 2 + t * trussSpacing;
    
    generateTruss(beams, joints, {
      width: W,
      z,
      baseHeight: H,
      roofType,
      slopeRad,
      trussSection,
    });
  }
  
  // === ГЕНЕРАЦИЯ ПРОГОНОВ (обрешетка) ===
  const purlinCount = Math.ceil(W / 0.8);
  const purlinSpacing = W / purlinCount;
  
  for (let p = 0; p <= purlinCount; p++) {
    const x = -W / 2 + p * purlinSpacing;
    const y = getHeightAtX(x) + SPECS.trussThickness / 2 + 0.02; // над фермой
    
    // Угол прогона повторяет угол кровли
    let angle = 0;
    if (roofType === RoofType.Gable) {
      angle = x < 0 ? -roofSlope : roofSlope;
    } else if (roofType === RoofType.SingleSlope || roofType === RoofType.Triangular) {
      angle = roofSlope;
    }
    
    const start: Point3D = { x, y, z: -L / 2 - 0.2 }; // свес
    const end: Point3D = { x, y, z: L / 2 + 0.2 }; // свес
    
    beams.push({
      id: generateBeamId('PUR'),
      type: 'purlin',
      section: purlinSection,
      start,
      end,
      length: L + 0.4,
      angle,
      rotation: 0,
      color: 3, // зеленый
    });
  }
  
  // === ГЕНЕРАЦИЯ СВЯЗЕЙ ===
  // Вертикальные связи между столбами
  for (let c = 0; c < numCols; c++) {
    for (let r = 0; r < numRows - 1; r++) {
      const x = -W / 2 + c * colSpacing;
      const z1 = -L / 2 + r * rowSpacing;
      const z2 = -L / 2 + (r + 1) * rowSpacing;
      const y = H * 0.5; // на середине высоты
      
      // Диагональная связь
      const start: Point3D = { x, y: y - 0.3, z: z1 };
      const end: Point3D = { x, y: y + 0.3, z: z2 };
      
      beams.push({
        id: generateBeamId('BRC'),
        type: 'bracing',
        section: bracingSection,
        start,
        end,
        length: distance(start, end),
        angle: calculateAngle(start, end),
        rotation: 0,
        color: 6, // magenta
      });
    }
  }
  
  // Горизонтальные связи между рядами столбов
  if (numCols > 1) {
    for (let r = 0; r < numRows; r++) {
      const z = -L / 2 + r * rowSpacing;
      const y = H * 0.7;
      
      for (let c = 0; c < numCols - 1; c++) {
        const x1 = -W / 2 + c * colSpacing;
        const x2 = -W / 2 + (c + 1) * colSpacing;
        
        const start: Point3D = { x: x1, y, z };
        const end: Point3D = { x: x2, y, z };
        
        beams.push({
          id: generateBeamId('TIE'),
          type: 'bracing',
          section: bracingSection,
          start,
          end,
          length: colSpacing,
          angle: 0,
          rotation: 0,
          color: 6,
        });
      }
    }
  }
  
  // Вычисление bounding box
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (const beam of beams) {
    minX = Math.min(minX, beam.start.x, beam.end.x);
    minY = Math.min(minY, beam.start.y, beam.end.y);
    minZ = Math.min(minZ, beam.start.z, beam.end.z);
    maxX = Math.max(maxX, beam.start.x, beam.end.x);
    maxY = Math.max(maxY, beam.start.y, beam.end.y);
    maxZ = Math.max(maxZ, beam.start.z, beam.end.z);
  }
  
  // Расчет веса конструкции
  // Плотность стали ~7850 кг/м³, площадь сечения трубы ≈ 4*a*t где a-сторона, t-толщина
  let totalWeight = 0;
  for (const beam of beams) {
    const [w, h, t] = beam.section.split('x').map(Number);
    const perimeter = 2 * (w + h);
    const areaM2 = (perimeter * t) / 1000000; // м²
    const volumeM3 = areaM2 * beam.length;
    totalWeight += volumeM3 * 7850;
  }
  
  return {
    beams,
    joints,
    boundingBox: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    },
    metadata: {
      width: W,
      length: L,
      height: H,
      roofType,
      totalWeight: Math.round(totalWeight),
      beamCount: beams.length,
      jointCount: joints.length,
    },
  };
}

/**
 * Генерирует ферму в заданной позиции
 */
function generateTruss(
  beams: Beam[],
  joints: Joint[],
  params: {
    width: number;
    z: number;
    baseHeight: number;
    roofType: RoofType;
    slopeRad: number;
    trussSection: string;
  }
) {
  const { width, z, baseHeight, roofType, slopeRad, trussSection } = params;
  const W = width;
  const H = baseHeight;
  const t = SPECS.trussThickness;
  
  // Глубина фермы (высота профиля)
  const trussDepth = 0.35;
  
  if (roofType === RoofType.Gable) {
    const rise = (W / 2) * Math.tan(slopeRad);
    const halfW = W / 2;
    
    // Нижний пояс
    const botLeft: Point3D = { x: -halfW, y: H, z };
    const botRight: Point3D = { x: halfW, y: H, z };
    
    beams.push({
      id: generateBeamId('TRB'),
      type: 'truss_bottom',
      section: trussSection,
      start: botLeft,
      end: botRight,
      length: W,
      angle: 0,
      rotation: 0,
      color: 4, // cyan
    });
    
    // Верхние пояса (скаты)
    const peak: Point3D = { x: 0, y: H + rise, z };
    
    beams.push({
      id: generateBeamId('TRT'),
      type: 'truss_top',
      section: trussSection,
      start: botLeft,
      end: peak,
      length: distance(botLeft, peak),
      angle: slopeRad * (180 / Math.PI),
      rotation: 0,
      color: 4,
    });
    
    beams.push({
      id: generateBeamId('TRT'),
      type: 'truss_top',
      section: trussSection,
      start: peak,
      end: botRight,
      length: distance(peak, botRight),
      angle: -slopeRad * (180 / Math.PI),
      rotation: 0,
      color: 4,
    });
    
    // Центральная стойка
    beams.push({
      id: generateBeamId('TRW'),
      type: 'truss_web',
      section: trussSection,
      start: { x: 0, y: H, z },
      end: peak,
      length: rise,
      angle: 90,
      rotation: 0,
      color: 5, // blue
    });
    
    // Раскосы
    const segments = Math.max(2, Math.ceil(halfW / 0.9));
    const segW = halfW / segments;
    
    for (let i = 1; i <= segments; i++) {
      const x = i * segW;
      const yTop = (halfW - x) * Math.tan(slopeRad);
      
      // Левая сторона
      const stL: Point3D = { x: -x, y: H, z };
      const enL: Point3D = { x: -x, y: H + yTop, z };
      
      beams.push({
        id: generateBeamId('TRW'),
        type: 'truss_web',
        section: trussSection,
        start: stL,
        end: enL,
        length: yTop,
        angle: 90,
        rotation: 0,
        color: 5,
      });
      
      // Правая сторона
      const stR: Point3D = { x: x, y: H, z };
      const enR: Point3D = { x: x, y: H + yTop, z };
      
      beams.push({
        id: generateBeamId('TRW'),
        type: 'truss_web',
        section: trussSection,
        start: stR,
        end: enR,
        length: yTop,
        angle: 90,
        rotation: 0,
        color: 5,
      });
      
      // Диагонали
      if (i < segments) {
        const nextX = (i + 1) * segW;
        const nextYTop = (halfW - nextX) * Math.tan(slopeRad);
        
        beams.push({
          id: generateBeamId('TRW'),
          type: 'truss_web',
          section: trussSection,
          start: { x: -x, y: H, z },
          end: { x: -nextX, y: H + nextYTop, z },
          length: distance({ x: -x, y: H, z }, { x: -nextX, y: H + nextYTop, z }),
          angle: calculateAngle({ x: -x, y: H, z }, { x: -nextX, y: H + nextYTop, z }),
          rotation: 0,
          color: 5,
        });
        
        beams.push({
          id: generateBeamId('TRW'),
          type: 'truss_web',
          section: trussSection,
          start: { x: x, y: H, z },
          end: { x: nextX, y: H + nextYTop, z },
          length: distance({ x: x, y: H, z }, { x: nextX, y: H + nextYTop, z }),
          angle: calculateAngle({ x: x, y: H, z }, { x: nextX, y: H + nextYTop, z }),
          rotation: 0,
          color: 5,
        });
      }
    }
    
  } else if (roofType === RoofType.SingleSlope || roofType === RoofType.Triangular) {
    const rise = W * Math.tan(slopeRad);
    const halfW = W / 2;
    
    // Нижний пояс
    const botLeft: Point3D = { x: -halfW, y: H, z };
    const botRight: Point3D = { x: halfW, y: H + rise, z };
    
    // Верхний пояс (параллельно нижнему, с отступом)
    const topLeft: Point3D = { x: -halfW, y: H + trussDepth, z };
    const topRight: Point3D = { x: halfW, y: H + rise + trussDepth, z };
    
    beams.push({
      id: generateBeamId('TRB'),
      type: 'truss_bottom',
      section: trussSection,
      start: botLeft,
      end: botRight,
      length: distance(botLeft, botRight),
      angle: slopeRad * (180 / Math.PI),
      rotation: 0,
      color: 4,
    });
    
    beams.push({
      id: generateBeamId('TRT'),
      type: 'truss_top',
      section: trussSection,
      start: topLeft,
      end: topRight,
      length: distance(topLeft, topRight),
      angle: slopeRad * (180 / Math.PI),
      rotation: 0,
      color: 4,
    });
    
    // Вертикальные стойки
    beams.push({
      id: generateBeamId('TRW'),
      type: 'truss_web',
      section: trussSection,
      start: botLeft,
      end: topLeft,
      length: trussDepth,
      angle: 90,
      rotation: 0,
      color: 5,
    });
    
    beams.push({
      id: generateBeamId('TRW'),
      type: 'truss_web',
      section: trussSection,
      start: botRight,
      end: topRight,
      length: trussDepth,
      angle: 90,
      rotation: 0,
      color: 5,
    });
    
    // Раскосы внутри фермы
    const segments = Math.max(4, Math.ceil(W / 0.9));
    for (let i = 1; i < segments; i++) {
      const ratio = i / segments;
      const pBot = lerpPoint(botLeft, botRight, ratio);
      const pTop = lerpPoint(topLeft, topRight, ratio);
      
      beams.push({
        id: generateBeamId('TRW'),
        type: 'truss_web',
        section: trussSection,
        start: pBot,
        end: pTop,
        length: trussDepth,
        angle: 90,
        rotation: 0,
        color: 5,
      });
      
      // Диагональ
      if (i < segments - 1) {
        const pBotPrev = lerpPoint(botLeft, botRight, (i - 1) / segments);
        beams.push({
          id: generateBeamId('TRW'),
          type: 'truss_web',
          section: trussSection,
          start: pBotPrev,
          end: pTop,
          length: distance(pBotPrev, pTop),
          angle: calculateAngle(pBotPrev, pTop),
          rotation: 0,
          color: 5,
        });
      }
    }
  }
  // TODO: добавить другие типы крыш (arched, semiarched)
}

/**
 * Линейная интерполяция между точками
 */
function lerpPoint(p1: Point3D, p2: Point3D, t: number): Point3D {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
    z: p1.z + (p2.z - p1.z) * t,
  };
}

/**
 * Экспорт модели в DXF формат
 */
export function exportToDXF(model: CADModel): string {
  const lines: string[] = [];
  
  // Заголовок DXF
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1015'); // AutoCAD 2000
  lines.push('9', '$INSUNITS', '70', '4'); // метры
  lines.push('0', 'ENDSEC');
  
  // Таблицы (слои)
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', '10');
  
  const layers = [
    { name: 'PILLARS', color: 1 },
    { name: 'MAUERLAT', color: 2 },
    { name: 'PURLINS', color: 3 },
    { name: 'TRUSS_TOP', color: 4 },
    { name: 'TRUSS_WEB', color: 5 },
    { name: 'BRACING', color: 6 },
  ];
  
  for (const layer of layers) {
    lines.push('0', 'LAYER');
    lines.push('2', layer.name);
    lines.push('70', '0');
    lines.push('62', String(layer.color));
    lines.push('6', 'CONTINUOUS');
  }
  
  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');
  
  // Сущности (геометрия)
  lines.push('0', 'SECTION', '2', 'ENTITIES');
  
  for (const beam of model.beams) {
    // Определяем слой по типу элемента
    let layer = 'BRACING';
    if (beam.type === 'pillar') layer = 'PILLARS';
    else if (beam.type === 'mauerlat') layer = 'MAUERLAT';
    else if (beam.type === 'purlin') layer = 'PURLINS';
    else if (beam.type === 'truss_top' || beam.type === 'truss_bottom') layer = 'TRUSS_TOP';
    else if (beam.type === 'truss_web') layer = 'TRUSS_WEB';
    
    // LINE entity
    lines.push('0', 'LINE');
    lines.push('8', layer); // слой
    lines.push('62', String(beam.color)); // цвет
    lines.push('10', beam.start.x.toFixed(4)); // X1
    lines.push('20', beam.start.y.toFixed(4)); // Y1
    lines.push('30', beam.start.z.toFixed(4)); // Z1
    lines.push('11', beam.end.x.toFixed(4)); // X2
    lines.push('21', beam.end.y.toFixed(4)); // Y2
    lines.push('31', beam.end.z.toFixed(4)); // Z2
  }
  
  lines.push('0', 'ENDSEC');
  
  // Конец файла
  lines.push('0', 'EOF');
  
  return lines.join('\n');
}

/**
 * Генерирует спецификацию материалов (BOM)
 */
export interface BOMItem {
  position: number;
  name: string;
  section: string;
  quantity: number;
  length: number;
  totalLength: number;
  weight: number;
  note: string;
}

export function generateBOM(model: CADModel): BOMItem[] {
  const groups: Record<string, { beams: Beam[]; totalLength: number }> = {};
  
  // Группируем по типу и сечению
  for (const beam of model.beams) {
    const key = `${beam.type}|${beam.section}`;
    if (!groups[key]) {
      groups[key] = { beams: [], totalLength: 0 };
    }
    groups[key].beams.push(beam);
    groups[key].totalLength += beam.length;
  }
  
  const typeNames: Record<string, string> = {
    pillar: 'Стойка (столб)',
    mauerlat: 'Мауэрлат (прогон)',
    truss_top: 'Ферма - верхний пояс',
    truss_bottom: 'Ферма - нижний пояс',
    truss_web: 'Ферма - раскос',
    purlin: 'Обрешетка',
    bracing: 'Связь',
  };
  
  const bom: BOMItem[] = [];
  let position = 1;
  
  for (const [key, data] of Object.entries(groups)) {
    const [type, section] = key.split('|');
    const [w, h, t] = section.split('x').map(Number);
    
    // Расчет веса
    const perimeter = 2 * (w + h);
    const areaM2 = (perimeter * t) / 1000000;
    const weight = areaM2 * data.totalLength * 7850;
    
    // Средняя длина элемента
    const avgLength = data.totalLength / data.beams.length;
    
    bom.push({
      position: position++,
      name: typeNames[type] || type,
      section: `Труба ${section}`,
      quantity: data.beams.length,
      length: Math.round(avgLength * 1000) / 1000, // округляем до мм
      totalLength: Math.round(data.totalLength * 100) / 100,
      weight: Math.round(weight * 10) / 10,
      note: '',
    });
  }
  
  // Сортировка по позиции
  bom.sort((a, b) => a.position - b.position);
  
  return bom;
}

/**
 * Генерирует текстовый отчет
 */
export function generateReport(model: CADModel, bom: BOMItem[]): string {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                     СПЕЦИФИКАЦИЯ НАВЕСА');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Габариты: ${model.metadata.width} x ${model.metadata.length} x ${model.metadata.height} м`);
  lines.push(`Тип кровли: ${model.metadata.roofType}`);
  lines.push(`Общий вес каркаса: ${model.metadata.totalWeight} кг`);
  lines.push(`Количество элементов: ${model.metadata.beamCount}`);
  lines.push(`Количество узлов: ${model.metadata.jointCount}`);
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(' №  │ Наименование           │ Сечение      │ Кол-во │ Длина, м │ Вес, кг');
  lines.push('───────────────────────────────────────────────────────────────');
  
  for (const item of bom) {
    const pos = String(item.position).padStart(2);
    const name = item.name.padEnd(22).slice(0, 22);
    const section = item.section.padEnd(12).slice(0, 12);
    const qty = String(item.quantity).padStart(6);
    const len = item.totalLength.toFixed(2).padStart(8);
    const weight = item.weight.toFixed(1).padStart(8);
    
    lines.push(` ${pos} │ ${name} │ ${section} │ ${qty} │ ${len} │ ${weight}`);
  }
  
  lines.push('───────────────────────────────────────────────────────────────');
  
  const totalWeight = bom.reduce((sum, item) => sum + item.weight, 0);
  const totalLength = bom.reduce((sum, item) => sum + item.totalLength, 0);
  
  lines.push(`ИТОГО:                                      │ ${totalLength.toFixed(2).padStart(8)} │ ${totalWeight.toFixed(1).padStart(8)}`);
  lines.push('═══════════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}
