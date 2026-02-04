import { FC } from 'react';
import { GateConfig, GateType, GateFilling, calculateGatePrice, GATE_LIMITS } from '../types/gates';
import { FRAME_COLORS } from '../constants';
import { Check, DoorOpen, Cpu, UserPlus } from 'lucide-react';

interface GateControlsProps {
  config: GateConfig;
  onChange: (config: Partial<GateConfig>) => void;
}

const GateTypeIcon: React.FC<{ type: GateType; active: boolean }> = ({ type, active }) => {
  const color = active ? '#22d3ee' : '#6b7280'; // cyan-400 : gray-500
  
  if (type === GateType.None) {
    return (
      <svg width="100%" height="28" viewBox="0 0 40 28" fill="none" className="mx-auto">
        <line x1="4" y1="4" x2="36" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <line x1="36" y1="4" x2="4" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }
  
  if (type === GateType.Sliding) {
    return (
      <svg width="100%" height="28" viewBox="0 0 40 28" fill="none" className="mx-auto">
        <rect x="4" y="4" width="26" height="18" stroke={color} strokeWidth="2" fill="none"/>
        <path d="M30 4L30 22L38 22Z" stroke={color} strokeWidth="2" fill="none"/>
        <line x1="4" y1="24" x2="36" y2="24" stroke={color} strokeWidth="2"/>
      </svg>
    );
  }
  
  if (type === GateType.Swing) {
    return (
      <svg width="100%" height="28" viewBox="0 0 40 28" fill="none" className="mx-auto">
        <rect x="4" y="4" width="14" height="20" stroke={color} strokeWidth="2" fill="none"/>
        <rect x="22" y="4" width="14" height="20" stroke={color} strokeWidth="2" fill="none"/>
        <circle cx="6" cy="14" r="1.5" fill={color}/>
        <circle cx="34" cy="14" r="1.5" fill={color}/>
      </svg>
    );
  }
  
  // Hinged (секционные)
  return (
    <svg width="100%" height="28" viewBox="0 0 40 28" fill="none" className="mx-auto">
      <rect x="4" y="4" width="32" height="20" stroke={color} strokeWidth="2" fill="none"/>
      <line x1="4" y1="10" x2="36" y2="10" stroke={color} strokeWidth="1"/>
      <line x1="4" y1="16" x2="36" y2="16" stroke={color} strokeWidth="1"/>
      <line x1="4" y1="22" x2="36" y2="22" stroke={color} strokeWidth="1"/>
    </svg>
  );
};

export const GateControls: React.FC<GateControlsProps> = ({ config, onChange }) => {
  const handleChange = (key: keyof GateConfig, value: any) => {
    onChange({ [key]: value });
  };
  const frameColor = config.frameColor ?? '#1a1a1a';
  const panelColor = config.panelColor ?? '#3E2723';
  
  const limits = config.type !== GateType.None 
    ? GATE_LIMITS[config.type as keyof typeof GATE_LIMITS] 
    : { minWidth: 3, maxWidth: 6, minHeight: 1.8, maxHeight: 2.5 };
  
  const gatePrice = calculateGatePrice(config);
  
  return (
    <div className="space-y-6">
      {/* Тип ворот */}
      <section>
        <h3 className="font-bold text-sm uppercase tracking-wide text-cyan-400 mb-4 flex items-center gap-2">
          <DoorOpen size={16} />
          Тип ворот
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { v: GateType.None, l: 'Без ворот' },
            { v: GateType.Sliding, l: 'Откатные' },
            { v: GateType.Swing, l: 'Распашные' },
            { v: GateType.Hinged, l: 'Секционные' },
          ].map(opt => (
            <button
              key={opt.v}
              onClick={() => handleChange('type', opt.v)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all h-20 ${
                config.type === opt.v 
                ? 'border-cyan-500 bg-cyan-500/10' 
                : 'border-[#3d4251] hover:border-[#4d5261] hover:bg-[#252830]'
              }`}
            >
              <GateTypeIcon type={opt.v} active={config.type === opt.v} />
              <span className={`text-[10px] font-bold mt-1.5 leading-tight text-center ${
                config.type === opt.v ? 'text-cyan-400' : 'text-[#6b7280]'
              }`}>
                {opt.l}
              </span>
            </button>
          ))}
        </div>
      </section>
      
      {config.type !== GateType.None && (
        <>
          {/* Направление открытия (для откатных и распашных) */}
          {(config.type === GateType.Sliding || config.type === GateType.Swing) && (
            <section className="pt-4 border-t border-[#3d4251]">
              <h4 className="font-bold text-xs uppercase text-[#6b7280] mb-3">Направление открытия</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleChange('openDirection', 'left')}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    (config.openDirection ?? 'left') === 'left'
                    ? 'border-cyan-500 bg-cyan-500/10' 
                    : 'border-[#3d4251] hover:border-[#4d5261]'
                  }`}
                >
                  <div className={`font-semibold text-sm ${(config.openDirection ?? 'left') === 'left' ? 'text-cyan-400' : 'text-[#9ca3af]'}`}>
                    ← Влево
                  </div>
                </button>
                <button
                  onClick={() => handleChange('openDirection', 'right')}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    config.openDirection === 'right'
                    ? 'border-cyan-500 bg-cyan-500/10' 
                    : 'border-[#3d4251] hover:border-[#4d5261]'
                  }`}
                >
                  <div className={`font-semibold text-sm ${config.openDirection === 'right' ? 'text-cyan-400' : 'text-[#9ca3af]'}`}>
                    Вправо →
                  </div>
                </button>
              </div>
            </section>
          )}
          
          {/* Размеры ворот */}
          <section className="pt-4 border-t border-[#3d4251]">
            <h4 className="font-bold text-xs uppercase text-[#6b7280] mb-3">Размеры проема</h4>
            
            {/* Ширина */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-[#6b7280]">Ширина</label>
                <div className="flex items-center bg-[#252830] rounded px-2 py-1 border border-[#3d4251]">
                  <span className="font-mono font-bold text-white">{config.width.toFixed(1)}</span>
                  <span className="text-xs text-[#6b7280] ml-1">м</span>
                </div>
              </div>
              <input
                type="range"
                min={limits.minWidth}
                max={limits.maxWidth}
                step={0.1}
                value={config.width}
                onChange={(e) => handleChange('width', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#3d4251] rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
            
            {/* Высота */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-[#6b7280]">Высота</label>
                <div className="flex items-center bg-[#252830] rounded px-2 py-1 border border-[#3d4251]">
                  <span className="font-mono font-bold text-white">{config.height.toFixed(1)}</span>
                  <span className="text-xs text-[#6b7280] ml-1">м</span>
                </div>
              </div>
              <input
                type="range"
                min={limits.minHeight}
                max={limits.maxHeight}
                step={0.1}
                value={config.height}
                onChange={(e) => handleChange('height', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#3d4251] rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
            
            {/* Расстояние до навеса */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-[#6b7280]">До навеса</label>
                <div className="flex items-center bg-[#252830] rounded px-2 py-1 border border-[#3d4251]">
                  <span className="font-mono font-bold text-white">{(config.distanceFromCarport ?? 2.0).toFixed(1)}</span>
                  <span className="text-xs text-[#6b7280] ml-1">м</span>
                </div>
              </div>
              <input
                type="range"
                min={0.5}
                max={10}
                step={0.5}
                value={config.distanceFromCarport ?? 2.0}
                onChange={(e) => handleChange('distanceFromCarport', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#3d4251] rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-[#6b7280] mt-1">
                <span>0.5м</span>
                <span>10м</span>
              </div>
            </div>
          </section>
          
          {/* Заполнение */}
          <section className="pt-4 border-t border-[#3d4251]">
            <h4 className="font-bold text-xs uppercase text-[#6b7280] mb-3">Заполнение</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: GateFilling.Solid, l: 'Профлист', desc: 'Глухое заполнение' },
                { v: GateFilling.Lattice, l: 'Решетка', desc: 'Просматриваемое' },
                { v: GateFilling.Forged, l: 'Ковка', desc: 'Декоративные элементы' },
                { v: GateFilling.Combined, l: 'Комби', desc: 'Профлист + ковка' },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => handleChange('filling', opt.v)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    config.filling === opt.v 
                    ? 'border-cyan-500 bg-cyan-500/10' 
                    : 'border-[#3d4251] hover:border-[#4d5261]'
                  }`}
                >
                  <div className={`font-semibold text-sm ${config.filling === opt.v ? 'text-cyan-400' : 'text-[#9ca3af]'}`}>
                    {opt.l}
                  </div>
                  <div className="text-[10px] text-[#6b7280]">{opt.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Цвета ворот */}
          <section className="pt-4 border-t border-[#3d4251]">
            <h4 className="font-bold text-xs uppercase text-[#6b7280] mb-3">Цвет рамы</h4>
            <div className="flex flex-wrap gap-2">
              {FRAME_COLORS.map((c) => (
                <button
                  key={`frame-${c.hex}`}
                  onClick={() => handleChange('frameColor', c.hex)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    frameColor === c.hex ? 'border-cyan-500 scale-110' : 'border-[#3d4251] hover:border-[#5d6271]'
                  }`}
                  title={c.name}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            <h4 className="font-bold text-xs uppercase text-[#6b7280] mt-4 mb-3">Цвет профлиста</h4>
            <div className="flex flex-wrap gap-2">
              {FRAME_COLORS.map((c) => (
                <button
                  key={`panel-${c.hex}`}
                  onClick={() => handleChange('panelColor', c.hex)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    panelColor === c.hex ? 'border-cyan-500 scale-110' : 'border-[#3d4251] hover:border-[#5d6271]'
                  }`}
                  title={c.name}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </section>
          
          {/* Опции */}
          <section className="pt-4 border-t border-[#3d4251]">
            <h4 className="font-bold text-xs uppercase text-[#6b7280] mb-3">Дополнительно</h4>
            <div className="space-y-2">
              {/* Автоматика */}
              <label className="flex items-center justify-between p-3 rounded-lg border border-[#3d4251] hover:bg-[#252830] cursor-pointer">
                <div className="flex items-center gap-2">
                  <Cpu size={16} className="text-[#6b7280]" />
                  <span className="text-sm font-medium text-[#9ca3af]">Автоматический привод</span>
                </div>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  config.hasAutomation ? 'bg-cyan-500 border-cyan-500' : 'bg-[#1e2128] border-[#3d4251]'
                }`}>
                  {config.hasAutomation && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={config.hasAutomation} 
                  onChange={(e) => handleChange('hasAutomation', e.target.checked)} 
                />
              </label>
              
              {/* Калитка (только для откатных и распашных) */}
              {(config.type === GateType.Sliding || config.type === GateType.Swing) && (
                <label className="flex items-center justify-between p-3 rounded-lg border border-[#3d4251] hover:bg-[#252830] cursor-pointer">
                  <div className="flex items-center gap-2">
                    <UserPlus size={16} className="text-[#6b7280]" />
                    <span className="text-sm font-medium text-[#9ca3af]">Встроенная калитка</span>
                  </div>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    config.hasWicket ? 'bg-cyan-500 border-cyan-500' : 'bg-[#1e2128] border-[#3d4251]'
                  }`}>
                    {config.hasWicket && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={config.hasWicket} 
                    onChange={(e) => handleChange('hasWicket', e.target.checked)} 
                  />
                </label>
              )}
            </div>
          </section>
          
          {/* Цена ворот */}
          <div className="pt-4 border-t border-[#3d4251]">
            <div className="bg-[#252830] rounded-xl p-4 border border-[#3d4251]">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#9ca3af]">Стоимость ворот:</span>
                <span className="text-lg font-bold text-white">{gatePrice.toLocaleString()} ₽</span>
              </div>
              <div className="text-xs text-[#6b7280] mt-1">
                {config.width.toFixed(1)} × {config.height.toFixed(1)} м = {(config.width * config.height).toFixed(1)} м²
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GateControls;
