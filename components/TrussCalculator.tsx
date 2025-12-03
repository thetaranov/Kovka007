import React, { useState } from 'react';
import { CarportConfig, RoofType } from '../types';
import { Calculator, Download, Loader2 } from 'lucide-react';

interface TrussCalculatorProps {
  config: CarportConfig;
  onCalculated: (result: CalculationResult) => void;
}

interface CalculationResult {
  success: boolean;
  trussGeometry: TrussGeometry;
  sections: ElementSections;
  loads: LoadAnalysis;
  dxfContent: string;
  bom: BillOfMaterials;
  warnings: string[];
}

interface TrussGeometry {
  span: number; // пролет, м
  height: number; // высота фермы, м
  panelCount: number; // количество панелей
  panelLength: number; // длина панели, м
  slopeAngle: number; // угол наклона, град
  nodes: Array<{x: number, y: number}>; // координаты узлов
  elements: Array<{from: number, to: number, type: 'chord' | 'web'}>; // элементы
}

interface ElementSections {
  topChord: string; // сечение верхнего пояса
  bottomChord: string; // сечение нижнего пояса
  web: string; // сечение решетки
  thickness: number; // толщина, мм
}

interface LoadAnalysis {
  deadLoad: number; // постоянная нагрузка, кН/м²
  snowLoad: number; // снеговая нагрузка, кН/м²
  windLoad: number; // ветровая нагрузка, кН/м²
  totalLoad: number; // суммарная нагрузка, кН/м²
  nodeForces: number[]; // усилия в узлах, кН
  maxCompression: number; // максимальное сжатие, кН
  maxTension: number; // максимальное растяжение, кН
}

interface BillOfMaterials {
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

export const TrussCalculator: React.FC<TrussCalculatorProps> = ({ config, onCalculated }) => {
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Основная функция расчета
  const calculateTruss = async () => {
    setCalculating(true);

    try {
      // Имитация расчета (в реальности здесь будет сложная математика)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const snowLoad = getSnowLoad(config.width, config.length, config.roofSlope);
      const deadLoad = getDeadLoad(config.roofMaterial);
      const totalLoad = snowLoad + deadLoad;

      // Определяем геометрию фермы на основе пролета
      const geometry = optimizeGeometry(config.width, config.height, config.roofType, config.roofSlope);

      // Подбираем сечения
      const sections = selectSections(totalLoad, geometry);

      // Анализ нагрузок
      const loads = analyzeLoads(totalLoad, geometry);

      // Спецификация
      const bom = generateBOM(geometry, sections);

      // Генерация DXF
      const dxfContent = generateDXF(geometry, sections);

      const calculationResult: CalculationResult = {
        success: true,
        trussGeometry: geometry,
        sections,
        loads,
        dxfContent,
        bom,
        warnings: []
      };

      setResult(calculationResult);
      onCalculated(calculationResult);

    } catch (error) {
      console.error('Calculation error:', error);
      setResult({
        success: false,
        trussGeometry: getDefaultGeometry(),
        sections: getDefaultSections(),
        loads: getDefaultLoads(),
        dxfContent: '',
        bom: { items: [], totalWeight: 0, totalCost: 0 },
        warnings: ['Ошибка расчета. Используются стандартные параметры.']
      });
    } finally {
      setCalculating(false);
    }
  };

  // Функции расчета (упрощенные)
  const getSnowLoad = (width: number, length: number, slope: number): number => {
    // Упрощенный расчет снеговой нагрузки по СП 20.13330
    const snowRegion = 3; // Типовой регион
    const ce = 1.0; // коэффициент экспозиции
    const ct = 1.0; // термический коэффициент
    const μ = Math.max(0.4, 1 - slope/60); // коэффициент перехода

    const sg = 2.4; // нормативная снеговая нагрузка для региона
    return sg * μ * ce * ct * 1.4; // с коэффициентом надежности
  };

  const getDeadLoad = (roofMaterial: string): number => {
    // Постоянные нагрузки в зависимости от материала
    const loads: Record<string, number> = {
      'polycarbonate': 0.15,
      'metaltile': 0.35,
      'decking': 0.30
    };
    return loads[roofMaterial] || 0.25;
  };

  const optimizeGeometry = (width: number, height: number, roofType: RoofType, slope: number): TrussGeometry => {
    // Оптимизация геометрии фермы
    const panelCount = Math.max(3, Math.ceil(width / 3)); // шаг панели ~3м
    const panelLength = width / panelCount;

    // Высота фермы: 1/8 - 1/12 пролета для оптимальной жесткости
    const optimalHeight = width / 8;
    const trussHeight = Math.max(optimalHeight, 0.5); // минимальная высота 0.5м

    // Генерация узлов и элементов
    const nodes: Array<{x: number, y: number}> = [];
    const elements: Array<{from: number, to: number, type: 'chord' | 'web'}> = [];

    // Верхний пояс
    for (let i = 0; i <= panelCount; i++) {
      const x = i * panelLength;
      const y = roofType === RoofType.Gable 
        ? Math.abs(x - width/2) * Math.tan(slope * Math.PI/180)
        : 0;
      nodes.push({ x, y: trussHeight + y });
    }

    // Нижний пояс
    for (let i = 0; i <= panelCount; i++) {
      nodes.push({ x: i * panelLength, y: 0 });
    }

    // Элементы верхнего пояса
    for (let i = 0; i < panelCount; i++) {
      elements.push({ from: i, to: i + 1, type: 'chord' });
    }

    // Элементы нижнего пояса
    for (let i = 0; i < panelCount; i++) {
      elements.push({ from: panelCount + 1 + i, to: panelCount + 1 + i + 1, type: 'chord' });
    }

    // Решетка (треугольная схема)
    for (let i = 0; i <= panelCount; i++) {
      elements.push({ from: i, to: panelCount + 1 + i, type: 'web' });
      if (i < panelCount) {
        elements.push({ from: i, to: panelCount + 1 + i + 1, type: 'web' });
        elements.push({ from: i + 1, to: panelCount + 1 + i, type: 'web' });
      }
    }

    return {
      span: width,
      height: trussHeight,
      panelCount,
      panelLength,
      slopeAngle: slope,
      nodes,
      elements
    };
  };

  const selectSections = (totalLoad: number, geometry: TrussGeometry): ElementSections => {
    // Подбор сечений на основе нагрузки и геометрии
    const axialForce = (totalLoad * geometry.span * geometry.panelLength) / (2 * geometry.height);

    let sectionSize = '60x60';
    let thickness = 3;

    if (axialForce > 500) {
      sectionSize = '100x100';
      thickness = 5;
    } else if (axialForce > 300) {
      sectionSize = '80x80';
      thickness = 4;
    } else if (axialForce > 150) {
      sectionSize = '60x60';
      thickness = 3;
    } else {
      sectionSize = '50x50';
      thickness = 2.5;
    }

    // Для решетки используем профиль на размер меньше
    const webSize = sectionSize === '100x100' ? '80x80' :
                   sectionSize === '80x80' ? '60x60' :
                   sectionSize === '60x60' ? '50x50' : '40x40';

    return {
      topChord: sectionSize,
      bottomChord: sectionSize,
      web: webSize,
      thickness
    };
  };

  const analyzeLoads = (totalLoad: number, geometry: TrussGeometry): LoadAnalysis => {
    const nodeForces = [];
    const nodesCount = geometry.nodes.length;

    for (let i = 0; i < nodesCount; i++) {
      nodeForces.push(totalLoad * geometry.panelLength * 0.5);
    }

    return {
      deadLoad: getDeadLoad(config.roofMaterial),
      snowLoad: totalLoad - getDeadLoad(config.roofMaterial),
      windLoad: 0.4, // типовое значение
      totalLoad,
      nodeForces,
      maxCompression: totalLoad * geometry.span * 2,
      maxTension: totalLoad * geometry.span * 1.5
    };
  };

  const generateBOM = (geometry: TrussGeometry, sections: ElementSections): BillOfMaterials => {
    const items = [];

    // Верхний пояс
    let totalTopChordLength = 0;
    for (let i = 0; i < geometry.panelCount; i++) {
      const dx = geometry.nodes[i + 1].x - geometry.nodes[i].x;
      const dy = geometry.nodes[i + 1].y - geometry.nodes[i].y;
      const length = Math.sqrt(dx*dx + dy*dy);
      totalTopChordLength += length;
    }

    items.push({
      name: 'Верхний пояс',
      profile: `${sections.topChord}x${sections.thickness}`,
      length: totalTopChordLength,
      quantity: 2, // два пояса
      weight: totalTopChordLength * 0.785 * sections.thickness * 0.001 * 8 // удельный вес
    });

    // Нижний пояс
    const bottomChordLength = geometry.span;
    items.push({
      name: 'Нижний пояс',
      profile: `${sections.bottomChord}x${sections.thickness}`,
      length: bottomChordLength,
      quantity: 2,
      weight: bottomChordLength * 0.785 * sections.thickness * 0.001 * 8
    });

    // Решетка
    const webElements = geometry.elements.filter(e => e.type === 'web');
    let totalWebLength = 0;

    webElements.forEach(elem => {
      const from = geometry.nodes[elem.from];
      const to = geometry.nodes[elem.to];
      const length = Math.sqrt(
        Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)
      );
      totalWebLength += length;
    });

    items.push({
      name: 'Элементы решетки',
      profile: `${sections.web}x${sections.thickness - 0.5}`,
      length: totalWebLength,
      quantity: 1,
      weight: totalWebLength * 0.785 * (sections.thickness - 0.5) * 0.001 * 8
    });

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const totalCost = totalWeight * 120; // примерная стоимость 120 руб/кг

    return { items, totalWeight: Math.round(totalWeight), totalCost: Math.round(totalCost) };
  };

  const generateDXF = (geometry: TrussGeometry, sections: ElementSections): string => {
    // Генерация упрощенного DXF файла
    let dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1018
9
$INSBASE
10
0.0
20
0.0
30
0.0
9
$EXTMIN
10
0.0
20
0.0
9
$EXTMAX
10
${geometry.span}
20
${geometry.height * 2}
0
ENDSEC
0
SECTION
2
ENTITIES
`;

    // Рисуем элементы фермы
    geometry.elements.forEach(elem => {
      const from = geometry.nodes[elem.from];
      const to = geometry.nodes[elem.to];

      dxf += `0
LINE
8
${elem.type === 'chord' ? 'CHORDS' : 'WEB'}
10
${from.x}
20
${from.y}
11
${to.x}
21
${to.y}
`;
    });

    // Размеры сечений
    dxf += `0
TEXT
8
NOTES
10
${geometry.span/2}
20
${-0.5}
40
0.2
1
Верхний пояс: ${sections.topChord}x${sections.thickness} мм
0
TEXT
8
NOTES
10
${geometry.span/2}
20
${-0.7}
40
0.2
1
Решетка: ${sections.web}x${sections.thickness - 0.5} мм
`;

    dxf += `0
ENDSEC
0
EOF`;

    return dxf;
  };

  const downloadDXF = () => {
    if (!result?.dxfContent) return;

    const blob = new Blob([result.dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ферма_${config.width}x${config.length}_${Date.now()}.dxf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadBOM = () => {
    if (!result?.bom) return;

    let bomText = `СПЕЦИФИКАЦИЯ ФЕРМЫ\n`;
    bomText += `========================\n`;
    bomText += `Размеры: ${config.width}м x ${config.length}м\n`;
    bomText += `Тип кровли: ${config.roofType}\n`;
    bomText += `Дата расчета: ${new Date().toLocaleDateString()}\n\n`;

    bomText += `ЭЛЕМЕНТЫ:\n`;
    result.bom.items.forEach((item, index) => {
      bomText += `${index + 1}. ${item.name}\n`;
      bomText += `   Профиль: ${item.profile} мм\n`;
      bomText += `   Длина: ${item.length.toFixed(2)} м\n`;
      bomText += `   Количество: ${item.quantity} шт\n`;
      bomText += `   Вес: ${item.weight.toFixed(1)} кг\n\n`;
    });

    bomText += `ИТОГО:\n`;
    bomText += `Общий вес: ${result.bom.totalWeight} кг\n`;
    bomText += `Примерная стоимость: ${result.bom.totalCost.toLocaleString()} руб\n`;

    const blob = new Blob([bomText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `спецификация_фермы_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Функции по умолчанию
  const getDefaultGeometry = (): TrussGeometry => ({
    span: config.width,
    height: config.width / 8,
    panelCount: 6,
    panelLength: config.width / 6,
    slopeAngle: config.roofSlope,
    nodes: [],
    elements: []
  });

  const getDefaultSections = (): ElementSections => ({
    topChord: '80x80',
    bottomChord: '80x80',
    web: '60x60',
    thickness: 4
  });

  const getDefaultLoads = (): LoadAnalysis => ({
    deadLoad: 0.3,
    snowLoad: 1.8,
    windLoad: 0.4,
    totalLoad: 2.5,
    nodeForces: [],
    maxCompression: 150,
    maxTension: 120
  });

  return (
    <div className="space-y-4">
      <button
        onClick={calculateTruss}
        disabled={calculating}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {calculating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Идет расчет...</span>
          </>
        ) : (
          <>
            <Calculator className="w-5 h-5" />
            <span>Начать автоматический расчет</span>
          </>
        )}
      </button>

      {result && (
        <div className="bg-white border border-green-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg text-green-800">
              ✓ Расчет завершен
            </h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showDetails ? 'Скрыть детали' : 'Показать детали'}
            </button>
          </div>

          {result.warnings.length > 0 && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
              {result.warnings.map((warning, idx) => (
                <div key={idx} className="text-yellow-700">⚠ {warning}</div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-50 p-2 rounded">
              <div className="text-xs text-slate-500">Сечение поясов</div>
              <div className="font-bold">{result.sections.topChord}x{result.sections.thickness} мм</div>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <div className="text-xs text-slate-500">Высота фермы</div>
              <div className="font-bold">{result.trussGeometry.height.toFixed(2)} м</div>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <div className="text-xs text-slate-500">Кол-во панелей</div>
              <div className="font-bold">{result.trussGeometry.panelCount} шт</div>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <div className="text-xs text-slate-500">Суммарная нагрузка</div>
              <div className="font-bold">{result.loads.totalLoad.toFixed(2)} кН/м²</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={downloadDXF}
              className="flex-1 bg-gray-800 hover:bg-gray-900 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Скачать DXF</span>
            </button>
            <button
              onClick={downloadBOM}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Спецификация</span>
            </button>
          </div>

          {showDetails && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <h4 className="font-bold mb-2 text-slate-700">Детали расчета:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Снеговая нагрузка:</span>
                  <span className="font-mono">{result.loads.snowLoad.toFixed(2)} кН/м²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Постоянная нагрузка:</span>
                  <span className="font-mono">{result.loads.deadLoad.toFixed(2)} кН/м²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Ветровая нагрузка:</span>
                  <span className="font-mono">{result.loads.windLoad.toFixed(2)} кН/м²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Макс. сжатие:</span>
                  <span className="font-mono">{result.loads.maxCompression.toFixed(0)} кН</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Макс. растяжение:</span>
                  <span className="font-mono">{result.loads.maxTension.toFixed(0)} кН</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Общий вес:</span>
                  <span className="font-mono">{result.bom.totalWeight} кг</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};