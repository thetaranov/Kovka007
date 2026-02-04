import { FC } from 'react';
import { GateConfig, GateType, GateFilling, calculateGatePrice, GATE_LIMITS } from '../types/gates';
import { FRAME_COLORS } from '../constants';
import { Check, DoorOpen, Cpu, UserPlus } from 'lucide-react';

interface GateControlsProps {
  config: GateConfig;
  onChange: (config: Partial<GateConfig>) => void;
}

const GateTypeIcon: React.FC<{ type: GateType; active: boolean }> = ({ type, active }) => {
  const color = active ? 'var(--accent)' : 'var(--text-muted)';
  
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
        <h3 className="menu-section-title mb-4 flex items-center gap-2">
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
                ? 'menu-btn-active' 
                : 'menu-btn'
              }`}
            >
              <GateTypeIcon type={opt.v} active={config.type === opt.v} />
              <span className={`text-[10px] font-bold mt-1.5 leading-tight text-center`}
                    style={{ color: config.type === opt.v ? 'var(--accent)' : 'var(--text-muted)' }}>
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
            <section className="menu-divider">
              <h4 className="menu-label mb-3">Направление открытия</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleChange('openDirection', 'left')}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    (config.openDirection ?? 'left') === 'left'
                    ? 'menu-btn-active' 
                    : 'menu-btn'
                  }`}
                >
                  <div className="font-semibold text-sm" 
                       style={{ color: (config.openDirection ?? 'left') === 'left' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    ← Влево
                  </div>
                </button>
                <button
                  onClick={() => handleChange('openDirection', 'right')}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    config.openDirection === 'right'
                    ? 'menu-btn-active' 
                    : 'menu-btn'
                  }`}
                >
                  <div className="font-semibold text-sm"
                       style={{ color: config.openDirection === 'right' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    Вправо →
                  </div>
                </button>
              </div>
            </section>
          )}
          
          {/* Размеры ворот */}
          <section className="menu-divider">
            <h4 className="menu-label mb-3">Размеры проема</h4>
            
            {/* Ширина */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="menu-text-secondary">Ширина</label>
                <div className="menu-value flex items-center">
                  <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{config.width.toFixed(1)}</span>
                  <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>м</span>
                </div>
              </div>
              <input
                type="range"
                min={limits.minWidth}
                max={limits.maxWidth}
                step={0.1}
                value={config.width}
                onChange={(e) => handleChange('width', parseFloat(e.target.value))}
                className="menu-slider"
              />
            </div>
            
            {/* Высота */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="menu-text-secondary">Высота</label>
                <div className="menu-value flex items-center">
                  <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{config.height.toFixed(1)}</span>
                  <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>м</span>
                </div>
              </div>
              <input
                type="range"
                min={limits.minHeight}
                max={limits.maxHeight}
                step={0.1}
                value={config.height}
                onChange={(e) => handleChange('height', parseFloat(e.target.value))}
                className="menu-slider"
              />
            </div>
            
            {/* Расстояние до навеса */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="menu-text-secondary">До навеса</label>
                <div className="menu-value flex items-center">
                  <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{(config.distanceFromCarport ?? 2.0).toFixed(1)}</span>
                  <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>м</span>
                </div>
              </div>
              <input
                type="range"
                min={0.5}
                max={10}
                step={0.5}
                value={config.distanceFromCarport ?? 2.0}
                onChange={(e) => handleChange('distanceFromCarport', parseFloat(e.target.value))}
                className="menu-slider"
              />
              <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                <span>0.5м</span>
                <span>10м</span>
              </div>
            </div>
          </section>
          
          {/* Заполнение */}
          <section className="menu-divider">
            <h4 className="menu-label mb-3">Заполнение</h4>
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
                    ? 'menu-btn-active' 
                    : 'menu-btn'
                  }`}
                >
                  <div className="font-semibold text-sm" 
                       style={{ color: config.filling === opt.v ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {opt.l}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Цвета ворот */}
          <section className="menu-divider">
            <h4 className="menu-label mb-3">Цвет рамы</h4>
            <div className="flex flex-wrap gap-2">
              {FRAME_COLORS.map((c) => (
                <button
                  key={`frame-${c.hex}`}
                  onClick={() => handleChange('frameColor', c.hex)}
                  className="w-8 h-8 rounded-full border-2 transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: c.hex,
                    borderColor: frameColor === c.hex ? 'var(--accent)' : 'var(--border-card)',
                    transform: frameColor === c.hex ? 'scale(1.1)' : undefined
                  }}
                  title={c.name}
                />
              ))}
            </div>
            <h4 className="menu-label mt-4 mb-3">Цвет профлиста</h4>
            <div className="flex flex-wrap gap-2">
              {FRAME_COLORS.map((c) => (
                <button
                  key={`panel-${c.hex}`}
                  onClick={() => handleChange('panelColor', c.hex)}
                  className="w-8 h-8 rounded-full border-2 transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: c.hex,
                    borderColor: panelColor === c.hex ? 'var(--accent)' : 'var(--border-card)',
                    transform: panelColor === c.hex ? 'scale(1.1)' : undefined
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </section>
          
          {/* Опции */}
          <section className="menu-divider">
            <h4 className="menu-label mb-3">Дополнительно</h4>
            <div className="space-y-2">
              {/* Автоматика */}
              <label className="menu-checkbox">
                <div className="flex items-center gap-2">
                  <Cpu size={16} style={{ color: 'var(--text-muted)' }} />
                  <span className="menu-text">Автоматический привод</span>
                </div>
                <div className={`menu-checkbox-box ${config.hasAutomation ? 'checked' : ''}`}>
                  {config.hasAutomation && <Check className="w-3.5 h-3.5" style={{ color: 'var(--bg-main)' }} />}
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
                <label className="menu-checkbox">
                  <div className="flex items-center gap-2">
                    <UserPlus size={16} style={{ color: 'var(--text-muted)' }} />
                    <span className="menu-text">Встроенная калитка</span>
                  </div>
                  <div className={`menu-checkbox-box ${config.hasWicket ? 'checked' : ''}`}>
                    {config.hasWicket && <Check className="w-3.5 h-3.5" style={{ color: 'var(--bg-main)' }} />}
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
          <div className="menu-divider">
            <div className="rounded-xl p-4 border" 
                 style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
              <div className="flex justify-between items-center">
                <span className="menu-text-secondary">Стоимость ворот:</span>
                <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{gatePrice.toLocaleString()} ₽</span>
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
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
