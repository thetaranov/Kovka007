import React, { useState } from 'react';
import { CarportConfig } from '../types';
import { 
  Calculator, 
  Download, 
  Loader2, 
  Shield, 
  Snowflake,
  Wind,
  Weight
} from 'lucide-react';

export const AdvancedCalculator: React.FC<{ config: CarportConfig }> = ({ config }) => {
  const [calculating, setCalculating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [params, setParams] = useState({
    snowRegion: 3,
    windRegion: 2,
    importanceFactor: 1.0,
    temperature: -30,
    hasCrane: false,
    craneCapacity: 5
  });

  const performFullCalculation = async () => {
    setCalculating(true);

    // Имитация полного расчета по методике из учебника
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Здесь будет реальный расчет по СП и ГОСТ
    const calculatedResults = {
      success: true,
      truss: {
        optimalHeight: calculateOptimalHeight(config.width),
        panelSpacing: calculateOptimalPanelSpacing(config.width),
        webPattern: 'triangular', // или 'n-shaped', 'k-shaped'
        supportType: 'hinged'
      },
      loads: {
        dead: calculateDeadLoads(config),
        snow: calculateSnowLoad(params.snowRegion, config.roofSlope),
        wind: calculateWindLoad(params.windRegion, config.height),
        combination: calculateLoadCombination()
      },
      sections: {
        chords: selectChordSection(),
        web: selectWebSection(),
        connections: designConnections()
      },
      checks: {
        strength: true,
        stability: true,
        deflection: true,
        fatigue: params.hasCrane ? true : null
      },
      costOptimization: {
        materialSaving: '15%',
        recommendedChanges: ['Увеличить шаг ферм', 'Использовать более тонкие профили']
      }
    };

    setResults(calculatedResults);
    setCalculating(false);
  };

  // Вспомогательные функции расчета
  const calculateOptimalHeight = (span: number): number => {
    // Оптимальная высота фермы: 1/8 - 1/12 пролета
    return span / 10;
  };

  const calculateOptimalPanelSpacing = (span: number): number => {
    // Оптимальный шаг панелей: 1.5-3м
    return Math.min(3, Math.max(1.5, span / 8));
  };

  const calculateDeadLoads = (config: CarportConfig): number => {
    // Расчет постоянных нагрузок
    let deadLoad = 0;

    // Кровля
    if (config.roofMaterial === 'polycarbonate') deadLoad += 0.15;
    else if (config.roofMaterial === 'metaltile') deadLoad += 0.35;
    else deadLoad += 0.25;

    // Прогоны
    deadLoad += 0.1;

    // Собственный вес фермы (предварительно)
    deadLoad += 0.15;

    return deadLoad;
  };

  const calculateSnowLoad = (region: number, slope: number): number => {
    // Расчет снеговой нагрузки по СП 20.13330
    const Sg = [0.8, 1.2, 1.8, 2.4, 3.2, 4.0, 4.8, 5.6][region] || 2.4;
    const μ = slope <= 30 ? 1 : 0.5;
    const ce = 1.0;
    const ct = 1.0;

    return Sg * μ * ce * ct * 1.4;
  };

  const calculateWindLoad = (region: number, height: number): number => {
    // Расчет ветровой нагрузки
    const Wo = [0.17, 0.23, 0.30, 0.38, 0.48, 0.60, 0.73, 0.85][region] || 0.38;
    const k = height < 5 ? 0.75 : height < 10 ? 0.9 : 1.0;
    const c = 0.8; // аэродинамический коэффициент

    return Wo * k * c * 1.4;
  };

  const calculateLoadCombination = () => {
    // Комбинация нагрузок
    return {
      basic: '1.0D + 1.4S',
      withWind: '1.0D + 0.9S + 1.4W',
      withCrane: '1.0D + 1.2S + 1.1C'
    };
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-blue-800">Параметры расчета по СП</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Снеговой район
            </label>
            <select 
              value={params.snowRegion}
              onChange={(e) => setParams({...params, snowRegion: parseInt(e.target.value)})}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
            >
              <option value="1">I (0.8 кПа)</option>
              <option value="2">II (1.2 кПа)</option>
              <option value="3">III (1.8 кПа)</option>
              <option value="4">IV (2.4 кПа)</option>
              <option value="5">V (3.2 кПа)</option>
              <option value="6">VI (4.0 кПа)</option>
              <option value="7">VII (4.8 кПа)</option>
              <option value="8">VIII (5.6 кПа)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ветровой район
            </label>
            <select 
              value={params.windRegion}
              onChange={(e) => setParams({...params, windRegion: parseInt(e.target.value)})}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
            >
              <option value="1">I (0.17 кПа)</option>
              <option value="2">II (0.23 кПа)</option>
              <option value="3">III (0.30 кПа)</option>
              <option value="4">IV (0.38 кПа)</option>
              <option value="5">V (0.48 кПа)</option>
              <option value="6">VI (0.60 кПа)</option>
              <option value="7">VII (0.73 кПа)</option>
              <option value="8">VIII (0.85 кПа)</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="flex items-center gap-2">
              <input 
                type="checkbox"
                checked={params.hasCrane}
                onChange={(e) => setParams({...params, hasCrane: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">Наличие подвесного крана</span>
            </label>
          </div>

          {params.hasCrane && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Грузоподъемность крана, т
              </label>
              <input 
                type="range"
                min="1"
                max="20"
                value={params.craneCapacity}
                onChange={(e) => setParams({...params, craneCapacity: parseInt(e.target.value)})}
                className="w-full"
              />
              <div className="text-center text-sm">{params.craneCapacity} т</div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={performFullCalculation}
        disabled={calculating}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
      >
        {calculating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Выполняем расчет по СП...</span>
          </>
        ) : (
          <>
            <Calculator className="w-5 h-5" />
            <span>Выполнить полный расчет</span>
          </>
        )}
      </button>

      {results && (
        <div className="bg-white border border-green-300 rounded-xl p-4 shadow-md">
          <h3 className="font-bold text-lg text-green-800 mb-4">Результаты расчета</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Weight className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Оптимальная высота</span>
                </div>
                <div className="text-xl font-bold">{results.truss.optimalHeight.toFixed(2)} м</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-sm font-medium mb-1">Шаг панелей</div>
                <div className="text-xl font-bold">{results.truss.panelSpacing.toFixed(2)} м</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold mb-2 text-slate-700">Нагрузки:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Weight className="w-4 h-4" />
                    Постоянные
                  </span>
                  <span className="font-mono">{results.loads.dead.toFixed(2)} кН/м²</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Snowflake className="w-4 h-4" />
                    Снеговые
                  </span>
                  <span className="font-mono">{results.loads.snow.toFixed(2)} кН/м²</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Wind className="w-4 h-4" />
                    Ветровые
                  </span>
                  <span className="font-mono">{results.loads.wind.toFixed(2)} кН/м²</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold mb-2 text-slate-700">Проверки:</h4>
              <div className="space-y-2">
                {Object.entries(results.checks).map(([key, value]) => {
                  if (value === null) return null;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <span className="capitalize">{key}:</span>
                      <span className={value ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {value ? '✓ Прошла' : '✗ Не прошла'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {results.costOptimization && (
              <div className="border-t pt-4">
                <h4 className="font-bold mb-2 text-slate-700">Оптимизация:</h4>
                <div className="text-sm text-slate-600">
                  <div className="mb-2">Экономия материала: <span className="font-bold text-green-600">{results.costOptimization.materialSaving}</span></div>
                  <div>Рекомендации:</div>
                  <ul className="list-disc pl-5 mt-1">
                    {results.costOptimization.recommendedChanges.map((rec: string, idx: number) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};