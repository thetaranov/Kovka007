
import React, { useState } from 'react';
import { CarportConfig, CalculationResult } from '../types';
import { calculateTrussPhysics } from '../services/trussEngine';
import { Calculator, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

interface TrussCalculatorProps {
  config: CarportConfig;
  onCalculated: (result: CalculationResult) => void;
}

export const TrussCalculator: React.FC<TrussCalculatorProps> = ({ config, onCalculated }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);

  const handleCalculate = async () => {
    setLoading(true);
    // Simulate async computation for UX
    await new Promise(r => setTimeout(r, 1500));
    
    try {
      const res = calculateTrussPhysics(config);
      setResult(res);
      onCalculated(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleCalculate}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            <span>Выполняем расчет СП 16.13330...</span>
          </>
        ) : (
          <>
            <Calculator size={20} />
            <span>Запустить просчет фермы</span>
          </>
        )}
      </button>

      {result && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <CheckCircle className="text-green-600" size={20} />
            <h4 className="font-bold text-slate-800">Результаты расчета</h4>
          </div>

          {result.warnings.length > 0 && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800 flex gap-2">
              <AlertTriangle className="shrink-0" size={16} />
              <ul className="list-disc list-inside">
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div className="bg-slate-50 p-2 rounded">
              <span className="text-slate-500 block text-xs">Верхний пояс</span>
              <span className="font-mono font-bold">{result.sections.topChord.name}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <span className="text-slate-500 block text-xs">Нижний пояс</span>
              <span className="font-mono font-bold">{result.sections.bottomChord.name}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <span className="text-slate-500 block text-xs">Решетка</span>
              <span className="font-mono font-bold">{result.sections.web.name}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <span className="text-slate-500 block text-xs">Вес металла</span>
              <span className="font-mono font-bold">{result.bom.totalWeight} кг</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Снеговая нагрузка:</span>
              <span>{result.loads.snowLoad.toFixed(2)} кПа</span>
            </div>
            <div className="flex justify-between">
              <span>Макс. момент:</span>
              <span>{result.loads.maxMoment.toFixed(1)} кН·м</span>
            </div>
            <div className="flex justify-between">
              <span>Запас прочности (пояс):</span>
              <span className="text-green-600 font-bold">{(100 - result.loads.utilization.top).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
