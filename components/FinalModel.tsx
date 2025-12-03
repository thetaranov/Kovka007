import React from 'react';
import { CarportConfig, CalculationResult } from '../types';
import { Lock, Download, CheckCircle, ArrowLeft } from 'lucide-react';
import JSZip from 'jszip';

interface FinalModelProps {
  config: CarportConfig;
  calculation: CalculationResult;
  onBack: () => void;
}

export const FinalModel: React.FC<FinalModelProps> = ({ config, calculation, onBack }) => {
  const generateProductionFiles = () => {
    const zip = new JSZip();

    zip.file("truss_drawing.dxf", calculation.dxfContent);

    let bomText = `СПЕЦИФИКАЦИЯ МАТЕРИАЛОВ\n`;
    bomText += `Заказчик: Kovka007 Client\n`;
    bomText += `Дата: ${new Date().toLocaleDateString()}\n`;
    bomText += `----------------------------------------\n`;
    calculation.bom.items.forEach((item, i) => {
        bomText += `${i+1}. ${item.name} (${item.profile}) - ${item.length.toFixed(2)}м x ${item.quantity} шт. = ${(item.weight * item.quantity).toFixed(1)} кг\n`;
    });
    bomText += `----------------------------------------\n`;
    bomText += `ИТОГО ВЕС: ${calculation.bom.totalWeight} кг\n`;

    zip.file("spec_materials.txt", bomText);

    let report = `ОТЧЕТ О РАСЧЕТЕ ФЕРМЫ\n\n`;
    report += `Геометрия:\n`;
    report += `Пролет: ${config.width} м\n`;
    report += `Высота фермы: ${calculation.geometry.height.toFixed(3)} м\n`;
    report += `\nНагрузки (по СП 20.13330):\n`;
    report += `Снеговой район: ${config.snowRegion} (${calculation.loads.snowLoad.toFixed(2)} кПа)\n`;
    report += `Ветровой район: ${config.windRegion} (${calculation.loads.windLoad.toFixed(2)} кПа)\n`;
    report += `Полная линейная нагрузка: ${calculation.loads.totalLinearLoad.toFixed(2)} кН/м\n`;
    report += `\nУсилия:\n`;
    report += `Макс. сжатие в поясе: ${calculation.loads.maxAxialTop.toFixed(1)} кН\n`;
    report += `\nПроверка сечений:\n`;
    report += `Верхний пояс (${calculation.sections.topChord.name}): Использование ${calculation.loads.utilization.top.toFixed(0)}%\n`;
    report += `Нижний пояс (${calculation.sections.bottomChord.name}): Использование ${calculation.loads.utilization.bottom.toFixed(0)}%\n`;

    zip.file("calculation_report.txt", report);

    zip.generateAsync({ type: "blob" }).then(content => {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project_kovka007_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white overflow-auto animate-fade-in-up">
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 pb-6 border-b border-slate-200">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Проект готов к производству</h1>
            <p className="text-slate-500">Расчет конструкции выполнен в соответствии с СП 16.13330.2017</p>
          </div>
          <div className="flex gap-3 w-full lg:w-auto">
            <button onClick={onBack} className="flex-1 lg:flex-none px-6 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 font-medium text-slate-700 flex items-center justify-center gap-2 transition-colors">
              <ArrowLeft size={18} />
              <span>Назад</span>
            </button>
            <button onClick={generateProductionFiles} className="flex-1 lg:flex-none px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-200 flex items-center justify-center gap-2 transition-all active:scale-95">
              <Download size={18} />
              <span>Скачать файлы (ZIP)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-full"><CheckCircle className="w-5 h-5 text-green-600" /></div>
                <h3 className="font-bold text-slate-800">Параметры конструкции</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-200/50"><span className="text-slate-500">Габариты:</span><span className="font-bold font-mono">{config.width}x{config.length}x{config.height} м</span></div>
                <div className="flex justify-between py-2 border-b border-slate-200/50"><span className="text-slate-500">Высота фермы:</span><span className="font-bold font-mono">{calculation.geometry.height.toFixed(2)} м</span></div>
                <div className="flex justify-between py-2 border-b border-slate-200/50"><span className="text-slate-500">Шаг ферм:</span><span className="font-bold font-mono">{(config.length / Math.ceil(config.length/1.5)).toFixed(2)} м</span></div>
                <div className="flex justify-between py-2"><span className="text-slate-500">Вес каркаса:</span><span className="font-bold font-mono">{calculation.bom.totalWeight} кг</span></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Подобранные сечения</h3>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-xs text-slate-400 uppercase font-bold">Верхний пояс</span><div className="font-mono font-bold text-lg text-slate-700">{calculation.sections.topChord.name}</div></div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-xs text-slate-400 uppercase font-bold">Нижний пояс</span><div className="font-mono font-bold text-lg text-slate-700">{calculation.sections.bottomChord.name}</div></div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100"><span className="text-xs text-slate-400 uppercase font-bold">Решетка</span><div className="font-mono font-bold text-lg text-slate-700">{calculation.sections.web.name}</div></div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 rounded-2xl aspect-video relative overflow-hidden flex items-center justify-center group">
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950"></div>
               <div className="relative text-center p-6">
                  <Lock className="w-12 h-12 text-slate-600 mx-auto mb-4 group-hover:text-green-500 transition-colors" />
                  <h3 className="text-white font-bold text-xl mb-2">3D Модель зафиксирована</h3>
                  <p className="text-slate-400 text-sm max-w-md mx-auto">Геометрия фермы оптимизирована под нагрузки вашего региона. Изменение параметров требует перерасчета.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};