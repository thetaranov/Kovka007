import React, { useEffect } from 'react';
import { CarportConfig, RoofType, PillarSize, RoofMaterial, PaintType, InstallationType, MIN_WIDTH, MAX_WIDTH, MIN_LENGTH, MAX_LENGTH, MIN_HEIGHT, MAX_HEIGHT } from '../types';
import { ROOF_COLORS, FRAME_COLORS } from '../constants';
import { Check, Ruler, Maximize2, TrendingDown } from 'lucide-react';

interface ControlsProps {
  config: CarportConfig;
  onChange: (newConfig: CarportConfig) => void;
  price: number;
  onOrder: () => void;
}

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (val: number) => void;
  extraInfo?: string;
}> = ({ label, value, min, max, step = 0.5, unit, onChange, extraInfo }) => (
  <div className="mb-6">
    <div className="flex justify-between items-center mb-2">
      <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">{label}</label>
      <div className="flex items-center gap-2">
          {extraInfo && <span className="text-xs text-indigo-400 font-medium">{extraInfo}</span>}
          <div className="flex items-center bg-slate-700 rounded px-2 py-1">
            <span className="font-mono font-bold text-white">{value.toFixed(1)}</span>
            <span className="text-xs text-slate-400 ml-1">{unit}</span>
          </div>
      </div>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
    />
  </div>
);

const ColorOptionBtn: React.FC<{ hex: string; selected: boolean; onClick: () => void }> = ({ hex, selected, onClick }) => (
    <button
        onClick={onClick}
        className={`w-8 h-8 rounded-full border-2 transition-all ${selected ? 'border-indigo-600 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
        style={{ backgroundColor: hex }}
    >
        {selected && <Check className="w-4 h-4 text-white mx-auto drop-shadow-sm" />}
    </button>
);

const RoofIcon: React.FC<{ type: RoofType; active: boolean }> = ({ type, active }) => {
    const color = active ? '#818cf8' : '#94a3b8';
    const fill = active ? '#312e81' : 'transparent';

    if (type === RoofType.Arched) {
        return (
            <svg width="100%" height="24" viewBox="0 0 40 24" fill="none" className="mx-auto">
                <path d="M2 20C2 20 10 4 20 4C30 4 38 20 38 20" stroke={color} strokeWidth="2" strokeLinecap="round"/>
                <path d="M2 20L38 20" stroke={color} strokeWidth="1" strokeDasharray="4 2"/>
            </svg>
        );
    }
    if (type === RoofType.SemiArched) {
        return (
            <svg width="100%" height="24" viewBox="0 0 40 24" fill="none" className="mx-auto">
                <path d="M2 20C10 20, 25 4, 38 4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
                <path d="M2 23C10 23, 25 7, 38 7" stroke={color} strokeWidth="1"/>
            </svg>
        );
    }
    if (type === RoofType.Gable) {
        return (
            <svg width="100%" height="24" viewBox="0 0 40 24" fill="none" className="mx-auto">
                <path d="M2 20L20 4L38 20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 4V20" stroke={color} strokeWidth="1"/>
            </svg>
        );
    }
    if (type === RoofType.Triangular) {
        return (
            <svg width="100%" height="24" viewBox="0 0 40 24" fill="none" className="mx-auto">
                 <path d="M2 20L38 4V20H2Z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill={fill}/>
                 <path d="M2 20L38 4" stroke={color} strokeWidth="2"/>
            </svg>
        );
    }
    return (
        <svg width="100%" height="24" viewBox="0 0 40 24" fill="none" className="mx-auto">
            <path d="M2 20L38 8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <path d="M2 23L38 11" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <path d="M2 20L2 23" stroke={color} strokeWidth="1"/>
            <path d="M38 8L38 11" stroke={color} strokeWidth="1"/>
        </svg>
    );
}

export const Controls: React.FC<ControlsProps> = ({ config, onChange, price, onOrder }) => {
  const handleChange = (key: keyof CarportConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const maxRise = 2.0; 
  const base = config.roofType === RoofType.Gable ? config.width / 2 : config.width;
  const maxAngleRad = Math.atan(maxRise / base);
  const maxAngleDeg = maxAngleRad * (180 / Math.PI);
  const maxAllowedAngle = Math.min(45, Math.floor(maxAngleDeg));

  useEffect(() => {
    if (config.roofType !== RoofType.Arched && config.roofSlope > maxAllowedAngle) {
        handleChange('roofSlope', maxAllowedAngle);
    }
  }, [config.roofType, config.roofSlope, maxAllowedAngle]);

  const area = (config.width * config.length).toFixed(1);
  const oldPrice = Math.round(price * 1.2);
  const savings = oldPrice - price;

  return (
    <div className="flex flex-col h-full bg-slate-800 border-l border-slate-700">

      <div className="flex-1 overflow-y-auto custom-scrollbar">
         <div className="p-6 space-y-8">

            <section>
                <h3 className="font-bold text-sm uppercase tracking-wide text-indigo-400 mb-4">Тип конструкции</h3>
                <div className="grid grid-cols-5 gap-1.5">
                    {[
                        { v: RoofType.Arched, l: 'Арочный' },
                        { v: RoofType.SemiArched, l: 'Полуарка' },
                        { v: RoofType.SingleSlope, l: '1-скат' },
                        { v: RoofType.Triangular, l: 'Треуг.' },
                        { v: RoofType.Gable, l: '2-скат' },
                    ].map(opt => (
                        <button
                            key={opt.v}
                            onClick={() => handleChange('roofType', opt.v)}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-xl border-2 transition-all h-20 ${
                                config.roofType === opt.v 
                                ? 'border-indigo-500 bg-indigo-900/30' 
                                : 'border-slate-700 hover:border-slate-500 hover:bg-slate-700/50'
                            }`}
                        >
                            <RoofIcon type={opt.v} active={config.roofType === opt.v} />
                            <span className={`text-[9px] sm:text-[10px] font-bold mt-1.5 leading-tight text-center ${config.roofType === opt.v ? 'text-indigo-300' : 'text-slate-400'}`}>
                                {opt.l}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="pt-6 border-t border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-slate-200">
                        <Ruler size={18} />
                        <h3 className="font-bold text-sm uppercase tracking-wide">Размеры</h3>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-700 px-2 py-1 rounded text-slate-300">
                        <Maximize2 size={14} />
                        <span className="text-xs font-bold font-mono">{area} м²</span>
                    </div>
                </div>

                {/* ИЗМЕНЕН ПОРЯДОК: Длина -> Ширина -> Высота */}
                <Slider label="Длина навеса" value={config.length} min={MIN_LENGTH} max={MAX_LENGTH} step={0.1} unit="м" onChange={(v) => handleChange('length', v)} />
                <Slider label="Ширина навеса" value={config.width} min={MIN_WIDTH} max={MAX_WIDTH} step={0.1} unit="м" onChange={(v) => handleChange('width', v)} />
                <Slider label="Высота столбов" value={config.height} min={MIN_HEIGHT} max={MAX_HEIGHT} step={0.1} unit="м" onChange={(v) => handleChange('height', v)} />

                {(config.roofType !== RoofType.Arched) && (
                    <Slider 
                        label={config.roofType === RoofType.SemiArched ? "Высота подъема (угол)" : "Угол наклона"}
                        value={Math.min(config.roofSlope, maxAllowedAngle)} 
                        min={5} 
                        max={maxAllowedAngle} 
                        step={1} 
                        unit="°" 
                        onChange={(v) => handleChange('roofSlope', v)}
                        extraInfo={config.roofType === RoofType.Gable 
                             ? `Подъем: ${((config.width/2) * Math.tan(config.roofSlope * Math.PI/180)).toFixed(2)} м` 
                             : `Подъем: ${(config.width * Math.tan(config.roofSlope * Math.PI/180)).toFixed(2)} м`
                        }
                    />
                )}

                <div className="mt-4">
                    <label className="text-xs uppercase font-bold text-slate-400 tracking-wider block mb-2">Сечение столбов</label>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { v: PillarSize.Size60, l: '60x60' },
                            { v: PillarSize.Size80, l: '80x80' },
                            { v: PillarSize.Size100, l: '100x100' },
                            { v: PillarSize.Size120, l: '120x120' }
                        ].map(opt => (
                            <button
                                key={opt.v}
                                onClick={() => handleChange('pillarSize', opt.v)}
                                className={`py-2 text-xs font-medium rounded-lg border ${
                                    config.pillarSize === opt.v 
                                    ? 'border-indigo-500 bg-indigo-900/30 text-indigo-300' 
                                    : 'border-slate-600 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                {opt.l}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="pt-6 border-t border-slate-700">
                <h3 className="font-bold text-sm uppercase tracking-wide text-indigo-400 mb-4">Материалы</h3>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Материал кровли</label>
                    <select 
                        value={config.roofMaterial}
                        onChange={(e) => handleChange('roofMaterial', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 text-slate-200 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value={RoofMaterial.Polycarbonate}>Сотовый поликарбонат</option>
                        <option value={RoofMaterial.MetalTile}>Металлочерепица</option>
                        <option value={RoofMaterial.Decking}>Профнастил</option>
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Покраска металла</label>
                    <select 
                        value={config.paintType}
                        onChange={(e) => handleChange('paintType', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 text-slate-200 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value={PaintType.None}>Грунт-эмаль (Стандарт)</option>
                        <option value={PaintType.Ral}>Эмаль RAL (Премиум)</option>
                        <option value={PaintType.Polymer}>Полимерно-порошковая</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Цвет каркаса</label>
                        <div className="flex flex-wrap gap-2">
                            {FRAME_COLORS.map(c => (
                                <ColorOptionBtn key={c.hex} hex={c.hex} selected={config.frameColor === c.hex} onClick={() => handleChange('frameColor', c.hex)} />
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Цвет кровли</label>
                        <div className="flex flex-wrap gap-2">
                            {ROOF_COLORS.map(c => (
                                <ColorOptionBtn key={c.hex} hex={c.hex} selected={config.roofColor === c.hex} onClick={() => handleChange('roofColor', c.hex)} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="pt-6 border-t border-slate-700">
                <h3 className="font-bold text-sm uppercase tracking-wide text-indigo-400 mb-4">Опции</h3>
                <div className="space-y-3">
                    {[
                        { k: 'hasTrusses', l: 'Усиленные фермы' },
                        { k: 'hasSideWalls', l: 'Боковая зашивка' },
                        { k: 'hasGutters', l: 'Водостоки' },
                        { k: 'hasFoundation', l: 'Заливка фундамента' }
                    ].map((item) => (
                        <label key={item.k} className="flex items-center justify-between p-3 rounded-lg border border-slate-700 hover:bg-slate-700/50 cursor-pointer transition-colors">
                            <span className="text-sm font-medium text-slate-200">{item.l}</span>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                config[item.k as keyof CarportConfig] ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-700 border-slate-500'
                            }`}>
                                {config[item.k as keyof CarportConfig] && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={config[item.k as keyof CarportConfig] as boolean} onChange={(e) => handleChange(item.k as keyof CarportConfig, e.target.checked)} />
                        </label>
                    ))}
                </div>

                {(config.hasFoundation || config.installationType === InstallationType.FoundationPour) && (
                    <div className="mt-4">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Толщина фундамента</label>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-slate-400">{(config.foundationThickness * 100).toFixed(0)} см</span>
                        </div>
                        <input
                            type="range"
                            min={0.15}
                            max={0.5}
                            step={0.05}
                            value={config.foundationThickness}
                            onChange={(e) => handleChange('foundationThickness', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                )}

                <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Тип монтажа</label>
                    <select
                        value={config.installationType}
                        onChange={(e) => {
                            const value = e.target.value as InstallationType;
                            const installActive = value !== InstallationType.None;
                            const foundationActive = value === InstallationType.FoundationPour ? true : config.hasFoundation;
                            onChange({
                                ...config,
                                installationType: value,
                                hasInstallation: installActive,
                                hasFoundation: foundationActive,
                            });
                        }}
                        className="w-full bg-slate-700 border border-slate-600 text-slate-200 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value={InstallationType.FoundationPour}>Заливка фундамента</option>
                        <option value={InstallationType.OnPosts}>Установка на залитые столбы</option>
                        <option value={InstallationType.OnEmbedded}>Установка на закладные</option>
                        <option value={InstallationType.None}>Без монтажа</option>
                    </select>
                </div>
            </section>
                 </div>
            </div>
        </div>
    );
};