/**
 * Утилиты для экспорта и скачивания файлов
 */

import { CarportConfig, RoofType, GateConfig, GateType } from '../types';
import { generateCADModel, generateBOM, generateReport } from './cadGenerator';

/**
 * Скачивает файл на устройство пользователя
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Конвертирует строку в Base64
 */
export function stringToBase64(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => 
    String.fromCharCode(parseInt(p1, 16))
  ));
}

/**
 * Генерирует и скачивает 3D модель в OBJ формате (только внешние грани)
 */
export function downloadOBJ(config: CarportConfig): void {
  const model = generateCADModel(config);
  const objContent = exportToOBJ(model, config);
  
  const filename = `navyes_3d_${config.width}x${config.length}_${Date.now()}.obj`;
  downloadFile(objContent, filename, 'model/obj');
}

// Экспорт DXF (все проекции)
export function downloadDXF(config: CarportConfig, gateConfig?: GateConfig): void {
  const model = generateCADModel(config);
  const dxfContent = exportToDXFProjections(model, config, 'all', gateConfig);

  const filename = `navyes_dxf_${config.width}x${config.length}_${Date.now()}.dxf`;
  downloadFile(dxfContent, filename, 'application/dxf');
}

/**
 * Экспорт в OBJ - чистая 3D модель без лишних граней
 */
function exportToOBJ(model: any, config: CarportConfig): string {
  const lines: string[] = [];
  let vertexIndex = 1;
  
  lines.push('# Kovka007 Carport 3D Model');
  lines.push(`# Size: ${config.width}x${config.length}x${config.height}m`);
  lines.push(`# Date: ${new Date().toISOString()}`);
  lines.push('# Units: meters');
  lines.push('');
  
  // Группируем элементы по типу
  const groups: { [key: string]: any[] } = {};
  for (const beam of model.beams) {
    const group = beam.type || 'other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(beam);
  }
  
  for (const [groupName, beams] of Object.entries(groups)) {
    lines.push(`g ${groupName}`);
    lines.push(`o ${groupName}`);
    
    for (const beam of beams) {
      const start = beam.start;
      const end = beam.end;
      const w = beam.section?.width || 0.06;
      const d = beam.section?.depth || 0.04;
      
      // Вектор направления
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dz = end.z - start.z;
      const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (len < 0.001) continue;
      
      // Нормализованное направление
      const dirX = dx/len, dirY = dy/len, dirZ = dz/len;
      
      // Вычисляем перпендикулярные оси для сечения
      let upX = 0, upY = 1, upZ = 0;
      if (Math.abs(dirY) > 0.99) {
        upX = 1; upY = 0; upZ = 0;
      }
      
      // Правый вектор (cross product)
      let rightX = upY * dirZ - upZ * dirY;
      let rightY = upZ * dirX - upX * dirZ;
      let rightZ = upX * dirY - upY * dirX;
      const rightLen = Math.sqrt(rightX*rightX + rightY*rightY + rightZ*rightZ);
      rightX /= rightLen; rightY /= rightLen; rightZ /= rightLen;
      
      // Вверх вектор (cross product)
      upX = dirY * rightZ - dirZ * rightY;
      upY = dirZ * rightX - dirX * rightZ;
      upZ = dirX * rightY - dirY * rightX;
      
      const hw = w / 2, hd = d / 2;
      
      // 8 вершин прямоугольной трубы
      const verts: number[][] = [];
      for (const [px, py, pz] of [[start.x, start.y, start.z], [end.x, end.y, end.z]]) {
        for (const [cw, cd] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]) {
          const vx = px + rightX * cw + upX * cd;
          const vy = py + rightY * cw + upY * cd;
          const vz = pz + rightZ * cw + upZ * cd;
          verts.push([vx, vy, vz]);
          lines.push(`v ${vx.toFixed(6)} ${vy.toFixed(6)} ${vz.toFixed(6)}`);
        }
      }
      
      // Грани (только внешние, 6 сторон коробки)
      const v = vertexIndex;
      // Торец 1 (начало)
      lines.push(`f ${v} ${v+3} ${v+2} ${v+1}`);
      // Торец 2 (конец)
      lines.push(`f ${v+4} ${v+5} ${v+6} ${v+7}`);
      // Боковые грани
      lines.push(`f ${v} ${v+1} ${v+5} ${v+4}`);
      lines.push(`f ${v+1} ${v+2} ${v+6} ${v+5}`);
      lines.push(`f ${v+2} ${v+3} ${v+7} ${v+6}`);
      lines.push(`f ${v+3} ${v} ${v+4} ${v+7}`);
      
      vertexIndex += 8;
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Генерирует DXF чертеж с проекциями
 */
export function downloadDXFProjection(config: CarportConfig, view: 'top' | 'front' | 'side' | 'all', gateConfig?: GateConfig): void {
  const model = generateCADModel(config);
  const dxfContent = exportToDXFProjections(model, config, view, gateConfig);
  
  const viewName = view === 'all' ? 'все_виды' : view === 'top' ? 'сверху' : view === 'front' ? 'спереди' : 'сбоку';
  const filename = `navyes_${viewName}_${config.width}x${config.length}_${Date.now()}.dxf`;
  downloadFile(dxfContent, filename, 'application/dxf');
}

/**
 * Экспорт 2D проекций в DXF
 */
function exportToDXFProjections(model: any, config: CarportConfig, view: 'top' | 'front' | 'side' | 'all', gateConfig?: GateConfig): string {
  const lines: string[] = [];
  
  // DXF Header (R12 for compatibility)
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1009');
  lines.push('0', 'ENDSEC');
  
  const layers = [
    { name: 'Pillars', color: 7 },
    { name: 'Beams', color: 3 },
    { name: 'Trusses', color: 4 },
    { name: 'Purlins', color: 5 },
    { name: 'Gate', color: 6 },
    { name: 'Dimensions', color: 1 },
    { name: 'Text', color: 2 },
  ];

  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LTYPE', '70', '1');
  lines.push('0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0');
  lines.push('0', 'ENDTAB');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', String(layers.length));
  for (const layer of layers) {
    lines.push('0', 'LAYER', '2', layer.name, '70', '0', '62', String(layer.color), '6', 'CONTINUOUS');
  }
  lines.push('0', 'ENDTAB');
  lines.push('0', 'TABLE', '2', 'STYLE', '70', '1');
  lines.push('0', 'STYLE', '2', 'STANDARD', '70', '0', '40', '0.0', '41', '1.0', '50', '0.0', '71', '0', '42', '0.2', '3', 'txt', '4', '');
  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');

  lines.push('0', 'SECTION', '2', 'ENTITIES');

  const addLine = (x1: number, y1: number, x2: number, y2: number, layer: string) => {
    lines.push('0', 'LINE', '8', layer);
    lines.push('10', x1.toFixed(4), '20', y1.toFixed(4), '30', '0');
    lines.push('11', x2.toFixed(4), '21', y2.toFixed(4), '31', '0');
  };

  const addText = (x: number, y: number, text: string, height: number = 0.1) => {
    lines.push('0', 'TEXT', '8', 'Text');
    lines.push('10', x.toFixed(4), '20', y.toFixed(4), '30', '0');
    lines.push('40', height.toFixed(3), '1', text);
  };

  const addRect = (x1: number, y1: number, x2: number, y2: number, layer: string) => {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    addLine(minX, minY, maxX, minY, layer);
    addLine(maxX, minY, maxX, maxY, layer);
    addLine(maxX, maxY, minX, maxY, layer);
    addLine(minX, maxY, minX, minY, layer);
  };
  const getSectionThickness = (section?: string) => {
    if (!section) return 0.06;
    const match = section.match(/(\d+)\s*x\s*(\d+)/i);
    if (!match) return 0.06;
    const w = parseFloat(match[1]) / 1000;
    const h = parseFloat(match[2]) / 1000;
    return Math.max(w, h);
  };

  const addBeamOutline = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    layer: string
  ) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      addRect(x1 - thickness / 2, y1 - thickness / 2, x1 + thickness / 2, y1 + thickness / 2, layer);
      return;
    }
    const nx = -dy / len;
    const ny = dx / len;
    const ox = (thickness / 2) * nx;
    const oy = (thickness / 2) * ny;
    const p1x = x1 + ox, p1y = y1 + oy;
    const p2x = x2 + ox, p2y = y2 + oy;
    const p3x = x2 - ox, p3y = y2 - oy;
    const p4x = x1 - ox, p4y = y1 - oy;
    addLine(p1x, p1y, p2x, p2y, layer);
    addLine(p2x, p2y, p3x, p3y, layer);
    addLine(p3x, p3y, p4x, p4y, layer);
    addLine(p4x, p4y, p1x, p1y, layer);
  };
  
  // Смещения для размещения видов
  let offsetX = 0, offsetY = 0;
  
  const hasGate = gateConfig && gateConfig.type && gateConfig.type !== GateType.None;
  const gateZ = hasGate ? (-config.length / 2 - (gateConfig!.distanceFromCarport ?? 2.0)) : 0;
  const gateW = hasGate ? (gateConfig!.width ?? 4) : 0;
  const gateH = hasGate ? (gateConfig!.height ?? 2) : 0;
  const gateFrame = hasGate ? (gateConfig!.frameSize === '80x40' ? 0.08 : 0.06) : 0;
  const gateDepth = 0.08;

  // Вид сверху (XZ плоскость)
  if (view === 'top' || view === 'all') {
    addText(offsetX, offsetY + config.length + 0.5, 'TOP VIEW', 0.15);
    
    for (const beam of model.beams) {
      const layer = beam.type?.includes('pillar') ? 'Pillars' : 
                    beam.type?.includes('truss') ? 'Trusses' : 
                    beam.type?.includes('purlin') ? 'Purlins' : 'Beams';
      
      // Проекция на XZ
      const thickness = getSectionThickness(beam.section);
      addBeamOutline(
        offsetX + beam.start.x + config.width / 2,
        offsetY + beam.start.z + config.length / 2,
        offsetX + beam.end.x + config.width / 2,
        offsetY + beam.end.z + config.length / 2,
        thickness,
        layer
      );
    }

    if (hasGate) {
      const xMin = -gateW / 2;
      const xMax = gateW / 2;
      const zMin = gateZ - gateDepth / 2;
      const zMax = gateZ + gateDepth / 2;
      const gateOffsetX = offsetX + config.width + 0.6;
      addRect(
        gateOffsetX + xMin + config.width / 2,
        offsetY + zMin + config.length / 2,
        gateOffsetX + xMax + config.width / 2,
        offsetY + zMax + config.length / 2,
        'Gate'
      );
    }
    
    // Размеры
    addLine(offsetX, offsetY - 0.3, offsetX + config.width, offsetY - 0.3, 'Dimensions');
    addText(offsetX + config.width/2 - 0.2, offsetY - 0.5, `${config.width}m`);
    addLine(offsetX - 0.3, offsetY, offsetX - 0.3, offsetY + config.length, 'Dimensions');
    addText(offsetX - 0.7, offsetY + config.length/2, `${config.length}m`);
    
    offsetX += config.width + 2;
  }
  
  // Вид спереди (XY плоскость)
  if (view === 'front' || view === 'all') {
    addText(offsetX, offsetY + config.height + 1.5, 'FRONT VIEW', 0.15);
    
    for (const beam of model.beams) {
      const layer = beam.type?.includes('pillar') ? 'Pillars' : 
                    beam.type?.includes('truss') ? 'Trusses' : 'Beams';
      
      // Проекция на XY (только передний ряд, z ≈ -length/2)
      if (Math.abs(beam.start.z + config.length/2) < 0.5 || Math.abs(beam.end.z + config.length/2) < 0.5 ||
          beam.type?.includes('truss')) {
        const thickness = getSectionThickness(beam.section);
        addBeamOutline(
          offsetX + beam.start.x + config.width / 2,
          offsetY + beam.start.y,
          offsetX + beam.end.x + config.width / 2,
          offsetY + beam.end.y,
          thickness,
          layer
        );
      }
    }
    
    if (hasGate) {
      const xMin = -gateW / 2;
      const xMax = gateW / 2;
      const gateOffsetX = offsetX + config.width + 0.6;
      addRect(
        gateOffsetX + xMin + config.width / 2,
        offsetY + 0,
        gateOffsetX + xMax + config.width / 2,
        offsetY + gateH,
        'Gate'
      );
      addRect(
        gateOffsetX + xMin + config.width / 2 + gateFrame,
        offsetY + gateFrame,
        gateOffsetX + xMax + config.width / 2 - gateFrame,
        offsetY + gateH - gateFrame,
        'Gate'
      );
    }

    // Размеры
    addLine(offsetX, offsetY - 0.3, offsetX + config.width, offsetY - 0.3, 'Dimensions');
    addText(offsetX + config.width/2 - 0.2, offsetY - 0.5, `${config.width}m`);
    addLine(offsetX + config.width + 0.3, offsetY, offsetX + config.width + 0.3, offsetY + config.height, 'Dimensions');
    addText(offsetX + config.width + 0.5, offsetY + config.height/2, `${config.height}m`);
    
    offsetX += config.width + 2;
  }
  
  // Вид сбоку (ZY плоскость)
  if (view === 'side' || view === 'all') {
    addText(offsetX, offsetY + config.height + 1.5, 'SIDE VIEW', 0.15);
    
    for (const beam of model.beams) {
      const layer = beam.type?.includes('pillar') ? 'Pillars' : 
                    beam.type?.includes('truss') ? 'Trusses' : 'Beams';
      
      // Проекция на ZY (только крайний ряд, x ≈ -width/2)
      if (Math.abs(beam.start.x + config.width/2) < 0.5 || Math.abs(beam.end.x + config.width/2) < 0.5 ||
          beam.type?.includes('mauerlat')) {
        const thickness = getSectionThickness(beam.section);
        addBeamOutline(
          offsetX + beam.start.z + config.length / 2,
          offsetY + beam.start.y,
          offsetX + beam.end.z + config.length / 2,
          offsetY + beam.end.y,
          thickness,
          layer
        );
      }
    }
    
    if (hasGate) {
      const zMin = gateZ - gateDepth / 2;
      const zMax = gateZ + gateDepth / 2;
      const gateOffsetX = offsetX + config.length + 0.6;
      addRect(
        gateOffsetX + zMin + config.length / 2,
        offsetY + 0,
        gateOffsetX + zMax + config.length / 2,
        offsetY + gateH,
        'Gate'
      );
    }

    // Размеры
    addLine(offsetX, offsetY - 0.3, offsetX + config.length, offsetY - 0.3, 'Dimensions');
    addText(offsetX + config.length/2 - 0.2, offsetY - 0.5, `${config.length}m`);
  }
  
  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');
  
  return lines.join('\r\n');
}

/**
 * Генерирует и скачивает спецификацию (BOM) в CSV
 */
export function downloadBOM(config: CarportConfig): void {
  const model = generateCADModel(config);
  const bom = generateBOM(model);
  
  const headers = ['№', 'Наименование', 'Сечение', 'Кол-во', 'Длина (м)', 'Общ. длина (м)', 'Вес (кг)', 'Примечание'];
  const rows = bom.map(item => [
    item.position,
    item.name,
    item.section,
    item.quantity,
    item.length.toFixed(3),
    item.totalLength.toFixed(2),
    item.weight.toFixed(1),
    item.note,
  ]);
  
  const csv = [
    headers.join(';'),
    ...rows.map(row => row.join(';')),
    '',
    `Итого элементов;${bom.reduce((s, i) => s + i.quantity, 0)}`,
    `Итого длина (м);${bom.reduce((s, i) => s + i.totalLength, 0).toFixed(2)}`,
    `Итого вес (кг);${bom.reduce((s, i) => s + i.weight, 0).toFixed(1)}`,
  ].join('\n');
  
  const csvWithBom = '\ufeff' + csv;
  const filename = `specifikaciya_${config.width}x${config.length}_${Date.now()}.csv`;
  downloadFile(csvWithBom, filename, 'text/csv;charset=utf-8');
}

/**
 * Генерирует и скачивает полный отчет
 */
export function downloadReport(config: CarportConfig, price: number): void {
  const model = generateCADModel(config);
  const bom = generateBOM(model);
  const reportText = generateReport(model, bom);
  
  const fullReport = `
KOVKA007 - Конструктор навесов
Дата: ${new Date().toLocaleString('ru-RU')}
══════════════════════════════════════════════════════════════════

КОНФИГУРАЦИЯ ЗАКАЗА:
────────────────────────────────────────────────────────────────
Размеры: ${config.length} × ${config.width} × ${config.height} м (Д×Ш×В)
Площадь: ${(config.width * config.length).toFixed(1)} м²
Тип кровли: ${config.roofType}
Угол наклона: ${config.roofSlope}°
Сечение столбов: ${config.pillarSize}
Материал кровли: ${config.roofMaterial}
Покраска: ${config.paintType}

Опции:
${config.hasTrusses ? '✓' : '✗'} Усиленные фермы
${config.hasGutters ? '✓' : '✗'} Водостоки
${config.hasSideWalls ? '✓' : '✗'} Боковая зашивка
${config.hasFoundation || config.installationType === 'foundation_pour' ? '✓' : '✗'} Заливка фундамента
${config.installationType !== 'none' ? '✓' : '✗'} Монтаж: ${config.installationType}

${reportText}

ИТОГОВАЯ СТОИМОСТЬ: ${price.toLocaleString('ru-RU')} ₽
══════════════════════════════════════════════════════════════════

Контакты:
Телефон: +7 (927) 799-11-55
Сайт: https://kovka007.ru
Telegram: @Kovka007bot
`.trim();

  const filename = `smeta_${config.width}x${config.length}_${Date.now()}.txt`;
  downloadFile(fullReport, filename, 'text/plain;charset=utf-8');
}

/**
 * Генерирует 3D модель и возвращает как Base64 (для отправки боту)
 */
export function generateDXFBase64(config: CarportConfig, gateConfig?: GateConfig): string {
  const model = generateCADModel(config);
  const dxfContent = exportToDXFProjections(model, config, 'all', gateConfig);
  return stringToBase64(dxfContent);
}

// Внутренняя функция для Base64 экспорта (алиас основной)
function exportToOBJInternal(model: any, config: CarportConfig): string {
  const lines: string[] = [];
  let vertexIndex = 1;
  
  lines.push('# Kovka007 Carport 3D Model');
  lines.push(`# Size: ${config.width}x${config.length}x${config.height}m`);
  lines.push('');
  
  for (const beam of model.beams) {
    const start = beam.start;
    const end = beam.end;
    const w = beam.section?.width || 0.06;
    const d = beam.section?.depth || 0.04;
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (len < 0.001) continue;
    
    const dirX = dx/len, dirY = dy/len, dirZ = dz/len;
    
    let upX = 0, upY = 1, upZ = 0;
    if (Math.abs(dirY) > 0.99) {
      upX = 1; upY = 0; upZ = 0;
    }
    
    let rightX = upY * dirZ - upZ * dirY;
    let rightY = upZ * dirX - upX * dirZ;
    let rightZ = upX * dirY - upY * dirX;
    const rightLen = Math.sqrt(rightX*rightX + rightY*rightY + rightZ*rightZ);
    if (rightLen < 0.001) continue;
    rightX /= rightLen; rightY /= rightLen; rightZ /= rightLen;
    
    upX = dirY * rightZ - dirZ * rightY;
    upY = dirZ * rightX - dirX * rightZ;
    upZ = dirX * rightY - dirY * rightX;
    
    const hw = w / 2, hd = d / 2;
    
    for (const [px, py, pz] of [[start.x, start.y, start.z], [end.x, end.y, end.z]]) {
      for (const [cw, cd] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]) {
        const vx = px + rightX * cw + upX * cd;
        const vy = py + rightY * cw + upY * cd;
        const vz = pz + rightZ * cw + upZ * cd;
        lines.push(`v ${vx.toFixed(6)} ${vy.toFixed(6)} ${vz.toFixed(6)}`);
      }
    }
    
    const v = vertexIndex;
    lines.push(`f ${v} ${v+3} ${v+2} ${v+1}`);
    lines.push(`f ${v+4} ${v+5} ${v+6} ${v+7}`);
    lines.push(`f ${v} ${v+1} ${v+5} ${v+4}`);
    lines.push(`f ${v+1} ${v+2} ${v+6} ${v+5}`);
    lines.push(`f ${v+2} ${v+3} ${v+7} ${v+6}`);
    lines.push(`f ${v+3} ${v} ${v+4} ${v+7}`);
    
    vertexIndex += 8;
  }
  
  return lines.join('\n');
}

/**
 * Форматирует цену
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
 * Генерирует ID заказа
 */
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `KV-${timestamp.slice(-4)}-${random}`;
}
