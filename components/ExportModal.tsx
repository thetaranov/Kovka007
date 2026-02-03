import React, { useState } from 'react';
import { X, FileText, Box, Layout, Download, Check } from 'lucide-react';
import { CarportConfig } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CarportConfig;
  price: number;
  onExportBOM: () => void;
  onExportOBJ: () => void;
  onExportDXF: (view: 'top' | 'front' | 'side' | 'all') => void;
  onExportReport: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  config,
  price,
  onExportBOM,
  onExportOBJ,
  onExportDXF,
  onExportReport,
}) => {
  const [selectedDXFView, setSelectedDXFView] = useState<'top' | 'front' | 'side' | 'all'>('all');
  const [exportingItem, setExportingItem] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async (type: string, action: () => void) => {
    setExportingItem(type);
    await new Promise(resolve => setTimeout(resolve, 300));
    action();
    setExportingItem(null);
  };

  const exportOptions = [
    {
      id: 'bom',
      title: 'Смета материалов',
      description: 'Спецификация в CSV для Excel',
      icon: FileText,
      color: 'text-green-600',
      bg: 'bg-green-50',
      action: () => handleExport('bom', onExportBOM),
    },
    {
      id: 'obj',
      title: '3D модель (OBJ)',
      description: 'Для Blender, 3ds Max, SketchUp',
      icon: Box,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      action: () => handleExport('obj', onExportOBJ),
    },
    {
      id: 'report',
      title: 'Полный отчет',
      description: 'Текстовый файл с расчетами',
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      action: () => handleExport('report', onExportReport),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Экспорт проекта</h2>
            <p className="text-sm text-slate-500">
              Навес {config.width}×{config.length}м
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Main export options */}
          <div className="grid gap-3">
            {exportOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={opt.action}
                disabled={exportingItem !== null}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all text-left ${
                  exportingItem === opt.id ? 'bg-slate-50' : ''
                }`}
              >
                <div className={`p-3 rounded-xl ${opt.bg}`}>
                  <opt.icon size={24} className={opt.color} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{opt.title}</div>
                  <div className="text-sm text-slate-500">{opt.description}</div>
                </div>
                {exportingItem === opt.id ? (
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                ) : (
                  <Download size={20} className="text-slate-400" />
                )}
              </button>
            ))}
          </div>

          {/* DXF Section */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Layout size={18} className="text-indigo-600" />
              <span className="font-semibold text-slate-900">Чертежи DXF</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { id: 'top', label: 'Сверху' },
                { id: 'front', label: 'Спереди' },
                { id: 'side', label: 'Сбоку' },
                { id: 'all', label: 'Все виды' },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => setSelectedDXFView(view.id as any)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    selectedDXFView === view.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => handleExport('dxf', () => onExportDXF(selectedDXFView))}
              disabled={exportingItem !== null}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
            >
              {exportingItem === 'dxf' ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Download size={18} />
                  <span>Скачать DXF</span>
                </>
              )}
            </button>
          </div>

          {/* Info */}
          <div className="text-xs text-slate-400 text-center pt-2">
            OBJ открывается в AutoCAD, SolidWorks, Компас через импорт
          </div>
        </div>
      </div>
    </div>
  );
};
