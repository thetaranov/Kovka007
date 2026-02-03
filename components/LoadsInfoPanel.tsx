import { useState, FC } from 'react';
import { Cloud, Wind, AlertTriangle, MapPin, ChevronDown, Info } from 'lucide-react';
import { SNOW_REGIONS, WIND_REGIONS, CITY_REGIONS, TerrainType, TERRAIN_TYPES } from '../utils/snowWindLoad';
import { LoadsInfo } from '../types';

interface LoadsInfoPanelProps {
  loads: LoadsInfo;
  region?: string;
  snowRegion?: string;
  windRegion?: string;
  terrain?: TerrainType;
  onRegionChange: (city: string) => void;
  onSnowRegionChange: (region: string) => void;
  onWindRegionChange: (region: string) => void;
  onTerrainChange: (terrain: TerrainType) => void;
}

export const LoadsInfoPanel: React.FC<LoadsInfoPanelProps> = ({
  loads,
  region,
  snowRegion = 'IV',
  windRegion = 'III',
  terrain = 'B',
  onRegionChange,
  onSnowRegionChange,
  onWindRegionChange,
  onTerrainChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCitySearch, setShowCitySearch] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  
  const filteredCities = Object.keys(CITY_REGIONS).filter(
    city => city.toLowerCase().includes(citySearch.toLowerCase())
  );
  
  return (
    <section className="border-t border-slate-100 pt-4" style={{ touchAction: "pan-y" }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-3"
      >
        <h3 className="font-bold text-sm uppercase tracking-wide text-indigo-600 flex items-center gap-2">
          <Cloud size={16} />
          Нагрузки по СП 20
        </h3>
        <ChevronDown 
          size={18} 
          className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {/* Краткая информация всегда видна */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Cloud size={14} />
            <span className="text-xs font-medium">Снеговая</span>
          </div>
          <div className="text-lg font-bold text-blue-900">
            {loads.snowLoad} <span className="text-xs font-normal">кг/м²</span>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <Wind size={14} />
            <span className="text-xs font-medium">Ветровая</span>
          </div>
          <div className="text-lg font-bold text-emerald-900">
            {loads.windLoad} <span className="text-xs font-normal">Па</span>
          </div>
        </div>
      </div>
      
      {/* Предупреждения */}
      {loads.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          {loads.warnings.map((warning, idx) => (
            <div key={idx} className="flex items-start gap-2 text-amber-700 text-xs">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Расширенные настройки */}
      {isExpanded && (
        <div className="space-y-4 animate-fadeIn">
          {/* Выбор города */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              <MapPin size={12} className="inline mr-1" />
              Город / Регион
            </label>
            <div className="relative">
              <button
                onClick={() => setShowCitySearch(!showCitySearch)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2.5 px-3 rounded-lg text-left flex justify-between items-center"
              >
                <span>{region || 'Выберите город'}</span>
                <ChevronDown size={16} className={`transition-transform ${showCitySearch ? 'rotate-180' : ''}`} />
              </button>
              
              {showCitySearch && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                  <input
                    type="text"
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    placeholder="Поиск города..."
                    className="w-full px-3 py-2 border-b border-slate-100 text-sm focus:outline-none"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCities.slice(0, 20).map(city => (
                      <button
                        key={city}
                        onClick={() => {
                          onRegionChange(city);
                          setShowCitySearch(false);
                          setCitySearch('');
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Снеговой район */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Снеговой район
            </label>
            <select
              value={snowRegion}
              onChange={(e) => onSnowRegionChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2.5 px-3 rounded-lg text-sm"
            >
              {Object.entries(SNOW_REGIONS).map(([key, data]) => (
                <option key={key} value={key}>
                  {data.name} — {data.Sg} кг/м²
                </option>
              ))}
            </select>
          </div>
          
          {/* Ветровой район */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Ветровой район
            </label>
            <select
              value={windRegion}
              onChange={(e) => onWindRegionChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2.5 px-3 rounded-lg text-sm"
            >
              {Object.entries(WIND_REGIONS).map(([key, data]) => (
                <option key={key} value={key}>
                  {data.name} — {data.w0} Па
                </option>
              ))}
            </select>
          </div>
          
          {/* Тип местности */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Тип местности
            </label>
            <select
              value={terrain}
              onChange={(e) => onTerrainChange(e.target.value as TerrainType)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2.5 px-3 rounded-lg text-sm"
            >
              {Object.entries(TERRAIN_TYPES).map(([key, desc]) => (
                <option key={key} value={key}>
                  {key} — {desc}
                </option>
              ))}
            </select>
          </div>
          
          {/* Рекомендации */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <Info size={14} />
              <span className="text-xs font-bold uppercase">Рекомендации</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• Сечение столбов: <strong>{loads.recommended.pillarSize}</strong></li>
              <li>• Высота фермы: <strong>{loads.recommended.trussHeight} м</strong></li>
              <li>• Шаг прогонов: <strong>{loads.recommended.purlinStep} м</strong></li>
              <li>• Суммарная нагрузка: <strong>{loads.totalLoad} кг/м²</strong></li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
};

export default LoadsInfoPanel;
