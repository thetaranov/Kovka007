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
    setResult(null); // Сбрасываем предыдущий результат
    // Имитация асинхронного расчета для UX
    await new Promise(r => setTimeout(r, 1500));

    try {
      const res = calculateTrussPhysics(config);
      setResult(res);
      onCalculated(res);
    } catch (e) {
      console.error("Ошибка при расчете фермы:", e);
      // Здесь можно будет обработать ошибку и показать ее пользователю
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
            <span>Выполняем расчет...</span>
          </>
        ) : (
          <>
            <Calculator size={20} />
            <span>Запустить просчет фермы</span>
          </>
        )}
      </button>

      {/* Отображение результатов можно будет добавить сюда позже, если потребуется */}
      {result && result.warnings.length > 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800 flex gap-2">
            <AlertTriangle className="shrink-0 mt-0.5" size={16} />
            <ul className="list-disc list-inside">
              {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
      )}
    </div>
  );
};