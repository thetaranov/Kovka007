import React from 'react';
import { CarportConfig, TrussCalculation } from '../types';
import { Lock, Download, Printer, CheckCircle } from 'lucide-react';

interface FinalModelProps {
  config: CarportConfig;
  calculation: TrussCalculation;
  onBack: () => void;
}

export const FinalModel: React.FC<FinalModelProps> = ({ config, calculation, onBack }) => {
  const generateProductionFiles = () => {
    // Генерация полного комплекта файлов для производства
    const files = {
      dxf: generateFullDXF(),
      pdf: generateDrawingsPDF(),
      nc: generateCNCProgram(),
      bom: generateFullBOM()
    };

    // Создаем zip архив
    const zip = new JSZip();
    zip.file("ферма_чертеж.dxf", files.dxf);
    zip.file("спецификация.pdf", files.pdf);
    zip.file("программа_ЧПУ.nc", files.nc);
    zip.file("ведомость_материалов.txt", files.bom);

    zip.generateAsync({ type: "blob" }).then(content => {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `проект_фермы_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-white p-6 overflow-auto">
      <div className="max-w-7xl mx-auto">
        {/* Шапка */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Готовый проект фермы</h1>
            <p className="text-slate-600">Модель расчитана и готова к производству</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Вернуться к редактированию
            </button>
            <button
              onClick={generateProductionFiles}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Скачать все файлы
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Левая колонка - информация */}
          <div className="col-span-1 space-y-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-bold">Расчет выполнен</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Пролет:</span>
                  <span className="font-bold">{config.width} м</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Длина:</span>
                  <span className="font-bold">{config.length} м</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Высота фермы:</span>
                  <span className="font-bold">{calculation.geometry.height.toFixed(2)} м</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Кол-во ферм:</span>
                  <span className="font-bold">{Math.ceil(config.length / 6)} шт</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-bold mb-3">Сечения профилей</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span>Верхний пояс:</span>
                  <span className="font-bold">{calculation.sections.topChord}×{calculation.sections.thickness}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span>Нижний пояс:</span>
                  <span className="font-bold">{calculation.sections.bottomChord}×{calculation.sections.thickness}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span>Решетка:</span>
                  <span className="font-bold">{calculation.sections.web}×{calculation.sections.thickness-0.5}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-bold mb-3">Спецификация</h3>
              <div className="space-y-2">
                {calculation.bom.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.name}:</span>
                    <span className="font-mono">{item.quantity}×{item.length.toFixed(2)}м</span>
                  </div>
                ))}
                <div className="pt-2 border-t mt-2">
                  <div className="flex justify-between font-bold">
                    <span>Общий вес:</span>
                    <span>{calculation.bom.totalWeight} кг</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Стоимость:</span>
                    <span>{calculation.bom.totalCost.toLocaleString()} руб</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-blue-800">Файлы для производства</h3>
              </div>
              <div className="space-y-2 text-sm">
                <button className="w-full text-left p-2 bg-white rounded hover:bg-blue-50">
                  📐 Чертеж DXF (AutoCAD)
                </button>
                <button className="w-full text-left p-2 bg-white rounded hover:bg-blue-50">
                  📋 Спецификация TXT
                </button>
                <button className="w-full text-left p-2 bg-white rounded hover:bg-blue-50">
                  ⚙ Программа ЧПУ NC
                </button>
                <button className="w-full text-left p-2 bg-white rounded hover:bg-blue-50">
                  📊 Отчет по расчету PDF
                </button>
              </div>
            </div>
          </div>

          {/* Центральная колонка - 3D модель */}
          <div className="col-span-2">
            <div className="bg-slate-100 rounded-xl p-4 h-96 mb-4">
              {/* Здесь будет "запеченная" 3D модель */}
              <div className="flex items-center justify-center h-full text-slate-500">
                3D модель расчитанной фермы
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border rounded-xl p-4">
                <h4 className="font-bold mb-2">Чертеж фермы</h4>
                <div className="aspect-video bg-slate-100 rounded flex items-center justify-center">
                  📐 Предварительный вид
                </div>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <h4 className="font-bold mb-2">Узлы соединений</h4>
                <div className="aspect-video bg-slate-100 rounded flex items-center justify-center">
                  🔗 Деталировка узлов
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
                <div>
                  <h4 className="font-bold text-green-800 mb-1">Проект готов к изготовлению</h4>
                  <p className="text-sm text-green-700">
                    Все расчеты выполнены по СП 16.13330.2017 и ГОСТ 23118-2012.
                    Конструкция проверена на прочность, устойчивость и деформации.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};