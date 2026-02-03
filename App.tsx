import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Scene } from "./components/Scene";
import { Controls } from "./components/Controls";
import { GateControls } from "./components/GateControls";
import { LoadsInfoPanel } from "./components/LoadsInfoPanel";
import {
    CarportConfig,
    RoofType,
    PillarSize,
    RoofMaterial,
    PaintType,
    GateType,
    GateFilling,
    InstallationType,
} from "./types";
import { GateConfig, calculateGatePrice } from "./types/gates";
import { PRICING, FRAME_COLORS, ROOF_COLORS, SPECS } from "./constants";
import { calculateLoads, CITY_REGIONS, TerrainType } from "./utils/snowWindLoad";
import { downloadDXF, downloadBOM, downloadReport, generateDXFBase64, generateOrderId, downloadOBJ, downloadDXFProjection } from "./utils/exportUtils";
import {
    Menu,
    X,
    FileText,
    Globe,
    TrendingDown,
    Send,
    Copy,
    Settings2,
    Download,
    Car,
    Home,
    Calculator,
    MapPin,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Layers,
} from "lucide-react";

const INITIAL_CONFIG: CarportConfig = {
    width: 4.5,
    length: 6,
    height: 2.1,
    roofType: RoofType.Gable,
    roofSlope: 20,
    pillarSize: PillarSize.Size80,
    roofMaterial: RoofMaterial.Polycarbonate,
    paintType: PaintType.Ral,
    frameColor: FRAME_COLORS[0].hex,
    roofColor: ROOF_COLORS[5].hex,
    hasTrusses: true,
    hasGutters: false,
    hasSideWalls: false,
    hasFoundation: false,
    hasInstallation: true,
    foundationThickness: 0.3,
    installationType: InstallationType.OnEmbedded,
    region: "Москва",
    snowRegion: "IV",
    windRegion: "III",
    terrain: "B",
};

// Начальная конфигурация ворот
const INITIAL_GATE: GateConfig = {
    type: GateType.None,
    width: 4.0,
    height: 2.0,
    filling: GateFilling.Solid,
    frameColor: "#1a1a1a",
    panelColor: "#3E2723",
    hasWicket: false,
    hasAutomation: false,
    frameSize: "60x40",
    distanceFromCarport: 2.0,
    openDirection: "left",
};

// Модальное окно для браузера
const BrowserOrderModal = ({ isOpen, onClose, orderData, price, config, gateConfig }: any) => {
    if (!isOpen) return null;

    const [name, setName] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [comment, setComment] = useState<string>("");
    const [sending, setSending] = useState(false);

    const handleDownloadDXF = () => {
        if (config) downloadDXF(config, gateConfig);
    };

    const handleDownloadReport = () => {
        if (config && price) downloadReport(config, price);
    };

    const parsedOrder = (() => {
        try {
            return orderData ? JSON.parse(orderData) : null;
        } catch (e) {
            return null;
        }
    })();

    const handleSend = async () => {
        if (sending) return;
        setSending(true);
        try {
            const payload = {
                ...(parsedOrder || {}),
                name,
                phone,
                comment,
            };

            const endpoint = (window as any).KOVKA_BOT_ENDPOINT || (import.meta as any).env?.VITE_BOT_API || 'https://kovka007bot.onrender.com';
            console.log('📡 Sending order to:', endpoint);
            console.log('📦 Payload:', payload);

            const res = await fetch(`${endpoint.replace(/\/$/, '')}/submit_order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            console.log('📡 Response status:', res.status);
            console.log('📡 Response ok:', res.ok);

            if (res.ok) {
                // Сформируем полный текст заказа для Telegram
                const o = parsedOrder || {} as any;
                const roofTypeName = (t: string) => ({ single: 'Односкатный', gable: 'Двускатный', arched: 'Арочный', triangular: 'Треугольный', semiarched: 'Полуарочный' }[t] || t);
                const materialName = (m: string) => ({ polycarbonate: 'Сотовый поликарбонат', metaltile: 'Металлочерепица', decking: 'Профнастил' }[m] || m);
                const paintName = (p: string) => ({ none: 'Грунт-эмаль', ral: 'Эмаль RAL', polymer: 'Полимерно-порошковая' }[p] || p);
                const gateTypeName = (g: string) => ({ none: 'Нет', sliding: 'Откатные', swing: 'Распашные', hinged: 'Навесные' }[g] || g);
                const gateFillName = (f: string) => ({ lattice: 'Решетка', solid: 'Сплошное', forged: 'Ковка', combined: 'Комби', vertical: 'Вертик. планки' }[f] || f);

                const opts = o.opts || {};
                const optList: string[] = [];
                if (opts.trusses) optList.push('✅ Усил. фермы');
                if (opts.gutters) optList.push('✅ Водостоки');
                if (opts.walls) optList.push('✅ Зашивка');
                if (opts.found) optList.push('✅ Фундамент');
                if (opts.install) optList.push('✅ Монтаж');
                const optStr = optList.length ? optList.join('\n') : 'Базовая';

                const loads = o.loads || {};
                let loadsStr = '';
                if (loads.snow || loads.wind || loads.total) {
                    loadsStr = `➖➖➖➖➖➖➖➖➖➖\n❄️ Снеговая: ${loads.snow || 0} кг/м²\n💨 Ветровая: ${loads.wind || 0} Па\n⚖️ Общая: ${loads.total || 0} кг/м²\n📍 Регион: ${o.region || 'Не указан'}\n`;
                }

                const gate = o.gate || {};
                let gateStr = '';
                if (gate.type && gate.type !== 'none') {
                    gateStr = `➖➖➖➖➖➖➖➖➖➖\n🚗 ВОРОТА:\n📐 Тип: ${gateTypeName(gate.type)}\n📏 Размер: ${gate.width || 4}×${gate.height || 2} м\n🔲 Заполнение: ${gateFillName(gate.filling)}\n🎨 Цвет рамы: ${gate.frameColor || gate.frame_color || 'Не указан'}\n🎨 Цвет полотна: ${gate.panelColor || gate.panel_color || 'Не указан'}\n🚶 Калитка: ${gate.wicket ? 'Да' : 'Нет'}\n🤖 Автоматика: ${gate.automation ? 'Да' : 'Нет'}\n`;
                }

                const priceNavyes = o.price || 0;
                const priceGate = o.price_gate || 0;
                const priceTotal = o.price_total || priceNavyes + priceGate;
                let priceStr = `💰 НАВЕС: ${priceNavyes.toLocaleString()} руб.`;
                if (priceGate > 0) {
                    priceStr += `\n🚗 ВОРОТА: ${priceGate.toLocaleString()} руб.`;
                    priceStr += `\n💵 ИТОГО: ${priceTotal.toLocaleString()} руб.`;
                }

                const text = `Здравствуйте! Хочу оформить заявку, вот данные:
👤 Клиент: ${name || 'Не указан'}
📞 Phone: ${phone || 'Не указан'}
💬 Пожелания: ${comment || 'Нет пожеланий'}
🆔 ID: ${o.id || 'N/A'}
🏗 Тип: ${roofTypeName(o.type)}
📏 Длина: ${o.length || config?.length || '?'} м
📏 Ширина: ${o.width || config?.width || '?'} м
↕️ Высота (столб): ${o.height || config?.height || '?'} м
🏔 Высота (общ): ~${o.height_peak || '?'} м
📐 Уклон: ${o.slope || config?.roofSlope || '?'}°
🧱 Сечение: ${o.pillar || config?.pillarSize || '?'}
➖➖➖➖➖➖➖➖➖➖
🔲 S пола: ${o.area_floor || (config ? (config.width * config.length).toFixed(2) : '?')} м²
🏠 S кровли: ${o.area_roof || '?'} м²
🏠 Материал: ${materialName(o.material || config?.roofMaterial)}
🎨 Покраска: ${paintName(o.paint || config?.paintType)}
🖌 Цвет: ${o.color_frame || '?'} / ${o.color_roof || '?'}
➖➖➖➖➖➖➖➖➖➖
🛠 Опции:
${optStr}
${loadsStr}${gateStr}➖➖➖➖➖➖➖➖➖➖
${priceStr}`;

                // Скопировать текст в буфер обмена
                try {
                    await navigator.clipboard.writeText(text);
                    console.log('✅ Order text copied to clipboard');
                } catch (e) {
                    console.warn('Clipboard write failed', e);
                }

                // Попытки автоматически открыть Telegram с предзаполненным текстом.
                // Браузерные ограничения не позволяют вставлять текст в чужой ввод, поэтому:
                // 1) копируем текст в буфер обмена,
                // 2) открываем веб-чат администратора.
                try {
                    await navigator.clipboard.writeText(text);
                    console.log('✅ Order text copied to clipboard');
                } catch (e) {
                    console.warn('Clipboard write failed', e);
                }

                // Открываем веб-чат администратора
                const adminChatUrl = 'https://web.telegram.org/k/#5216818742';
                window.open(adminChatUrl, '_blank');

                alert('✅ Заказ отправлен менеджеру!\n\nТекст заказа скопирован в буфер обмена.\nОткройте чат с менеджером и вставьте текст (Ctrl+V).');
                onClose();
            } else {
                const txt = await res.text();
                console.error('Order submit failed', txt);
                alert('Ошибка отправки. Пожалуйста, скопируйте данные и отправьте вручную.');
            }
        } catch (e) {
            console.error(e);
            alert('Ошибка соединения. Попробуйте позже.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Оформление заказа</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Подробная сводка заказа */}
                {parsedOrder && config && (
                    <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-4">
                        <h4 className="font-semibold text-slate-700 mb-3">📋 Детали заказа:</h4>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500">🏗 Тип крыши:</span>
                                <p className="font-medium text-slate-800">{(() => {
                                    const types = { single: 'Односкатный', gable: 'Двускатный', arched: 'Арочный', triangular: 'Треугольный', semiarched: 'Полуарочный' };
                                    return types[parsedOrder.type as keyof typeof types] || parsedOrder.type;
                                })()}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">📏 Размеры:</span>
                                <p className="font-medium text-slate-800">{parsedOrder.length}×{parsedOrder.width}×{parsedOrder.height} м</p>
                            </div>
                            <div>
                                <span className="text-slate-500">🏔 Высота (общ):</span>
                                <p className="font-medium text-slate-800">~{parsedOrder.height_peak} м</p>
                            </div>
                            <div>
                                <span className="text-slate-500">📐 Уклон:</span>
                                <p className="font-medium text-slate-800">{parsedOrder.slope}°</p>
                            </div>
                            <div>
                                <span className="text-slate-500">🧱 Сечение:</span>
                                <p className="font-medium text-slate-800">{parsedOrder.pillar}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">🏠 Материал:</span>
                                <p className="font-medium text-slate-800">{(() => {
                                    const mats = { polycarbonate: 'Сотовый поликарбонат', metaltile: 'Металлочерепица', decking: 'Профнастил' };
                                    return mats[parsedOrder.material as keyof typeof mats] || parsedOrder.material;
                                })()}</p>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500">🔲 S пола:</span>
                                    <p className="font-medium text-slate-800">{parsedOrder.area_floor} м²</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">🏠 S кровли:</span>
                                    <p className="font-medium text-slate-800">{parsedOrder.area_roof} м²</p>
                                </div>
                            </div>
                        </div>

                        {parsedOrder.opts && Object.values(parsedOrder.opts).some(v => v) && (
                            <div className="border-t border-slate-200 pt-4">
                                <span className="text-slate-500 text-sm">🛠 Опции:</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {parsedOrder.opts.trusses && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Усил. фермы</span>}
                                    {parsedOrder.opts.gutters && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Водостоки</span>}
                                    {parsedOrder.opts.walls && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Зашивка</span>}
                                    {parsedOrder.opts.found && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Фундамент</span>}
                                    {parsedOrder.opts.install && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Монтаж</span>}
                                </div>
                            </div>
                        )}

                        {parsedOrder.gate && parsedOrder.gate.type && parsedOrder.gate.type !== 'none' && (
                            <div className="border-t border-slate-200 pt-4">
                                <span className="text-slate-500 text-sm">🚗 Ворота:</span>
                                <div className="mt-2 text-sm space-y-1">
                                    <p><span className="text-slate-600">Тип:</span> {(() => {
                                        const gates = { sliding: 'Откатные', swing: 'Распашные', hinged: 'Навесные' };
                                        return gates[parsedOrder.gate.type as keyof typeof gates] || parsedOrder.gate.type;
                                    })()}</p>
                                    <p><span className="text-slate-600">Размер:</span> {parsedOrder.gate.width}×{parsedOrder.gate.height} м</p>
                                    <p><span className="text-slate-600">Заполнение:</span> {(() => {
                                        const fills = { lattice: 'Решетка', solid: 'Сплошное', forged: 'Ковка', combined: 'Комби', vertical: 'Вертик. планки' };
                                        return fills[parsedOrder.gate.filling as keyof typeof fills] || parsedOrder.gate.filling;
                                    })()}</p>
                                </div>
                            </div>
                        )}

                        {price && (
                            <div className="border-t border-slate-200 pt-4">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-slate-800">💰 Навес:</span>
                                    <span className="font-bold text-indigo-600">{parsedOrder.price?.toLocaleString()} ₽</span>
                                </div>
                                {parsedOrder.price_gate > 0 && (
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="font-semibold text-slate-800">🚗 Ворота:</span>
                                        <span className="font-bold text-indigo-600">{parsedOrder.price_gate?.toLocaleString()} ₽</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-300">
                                    <span className="font-bold text-slate-900">💵 Итого:</span>
                                    <span className="text-xl font-bold text-indigo-600">{(parsedOrder.price_total || parsedOrder.price)?.toLocaleString()} ₽</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-3">
                    <div className="space-y-2">
                        <label className="text-sm text-slate-600">Ваше имя</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Иванов" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-slate-600">Телефон</label>
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-slate-600">Комментарий менеджеру</label>
                        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Дополнительные пожелания" className="w-full border border-slate-200 rounded-xl px-3 py-2 h-24 resize-none" />
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={sending}
                        className="w-full bg-[#2AABEE] hover:bg-[#229ED9] text-white p-4 rounded-xl flex items-center gap-3 justify-center font-bold shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        <Send size={20} />{" "}
                        <span>{sending ? 'Отправка...' : 'Отправить менеджеру'}</span>
                    </button>

                    <p className="text-xs text-slate-400 text-center mt-4">
                        После отправки менеджер свяжется с вами для уточнения деталей
                    </p>

                    <p className="text-xs text-slate-500 text-center mt-2">
                        При отправке вы соглашаетесь с <a href="#" className="text-indigo-600 hover:underline">политикой конфиденциальности</a> и <a href="#" className="text-indigo-600 hover:underline">условиями пользования</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

const getRecommendedPillarSize = (
    width: number,
    length: number,
    height: number,
    totalLoad: number = 300,
): PillarSize => {
    const area = width * length;
    if (width > 8.0 || height > 3.5 || area > 60 || totalLoad > 400) return PillarSize.Size120;
    if (width > 6.0 || height > 3.0 || area > 40 || totalLoad > 300) return PillarSize.Size100;
    if (width > 5.0 || height > 2.8 || area > 30) return PillarSize.Size80;
    return PillarSize.Size60;
};

// Модальное окно экспорта
const ExportModal = ({ isOpen, onClose, config, price, gateConfig }: any) => {
    const [selectedDXFView, setSelectedDXFView] = useState<'top' | 'front' | 'side' | 'all'>('all');
    
    if (!isOpen) return null;
    
    const handleExportOBJ = () => {
        downloadOBJ(config);
        onClose();
    };
    
    const handleExportBOM = () => {
        downloadBOM(config);
        onClose();
    };
    
    const handleExportReport = () => {
        downloadReport(config, price);
        onClose();
    };
    
    const handleExportDXF = () => {
        downloadDXFProjection(config, selectedDXFView, gateConfig);
        onClose();
    };
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Экспорт проекта</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="space-y-3">
                    {/* 3D модель OBJ */}
                    <button
                        onClick={handleExportOBJ}
                        className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-4 rounded-xl flex items-center gap-3 transition-all"
                    >
                        <div className="w-10 h-10 bg-indigo-200 rounded-lg flex items-center justify-center">
                            <Layers size={20} />
                        </div>
                        <div className="text-left">
                            <div className="font-semibold">3D модель (OBJ)</div>
                            <div className="text-xs text-indigo-500">Открывается в Blender, AutoCAD, 3ds Max</div>
                        </div>
                    </button>
                    
                    {/* Смета CSV */}
                    <button
                        onClick={handleExportBOM}
                        className="w-full bg-green-50 hover:bg-green-100 text-green-700 p-4 rounded-xl flex items-center gap-3 transition-all"
                    >
                        <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                            <Calculator size={20} />
                        </div>
                        <div className="text-left">
                            <div className="font-semibold">Спецификация (CSV)</div>
                            <div className="text-xs text-green-500">Таблица материалов для Excel</div>
                        </div>
                    </button>
                    
                    {/* Отчет TXT */}
                    <button
                        onClick={handleExportReport}
                        className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 p-4 rounded-xl flex items-center gap-3 transition-all"
                    >
                        <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center">
                            <FileText size={20} />
                        </div>
                        <div className="text-left">
                            <div className="font-semibold">Полный отчет (TXT)</div>
                            <div className="text-xs text-amber-500">Смета с описанием конфигурации</div>
                        </div>
                    </button>
                    
                    {/* DXF чертежи */}
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                                <Layers size={20} className="text-slate-600" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-slate-700">2D чертежи (DXF)</div>
                                <div className="text-xs text-slate-500">Проекции для AutoCAD</div>
                            </div>
                        </div>
                        <div className="flex gap-2 mb-3">
                            {[
                                { key: 'top', label: 'Сверху' },
                                { key: 'front', label: 'Спереди' },
                                { key: 'side', label: 'Сбоку' },
                                { key: 'all', label: 'Все' },
                            ].map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedDXFView(key as any)}
                                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                                        selectedDXFView === key
                                            ? 'bg-slate-700 text-white'
                                            : 'bg-white text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleExportDXF}
                            className="w-full bg-slate-700 hover:bg-slate-800 text-white py-2.5 rounded-lg font-medium text-sm transition-all"
                        >
                            Скачать DXF
                        </button>
                    </div>
                </div>
                
                <p className="text-xs text-slate-400 text-center mt-4">
                    Для STEP формата обратитесь к менеджеру
                </p>
            </div>
        </div>
    );
};

export default function App() {
    const [config, setConfig] = useState<CarportConfig>(INITIAL_CONFIG);
    const [gateConfig, setGateConfig] = useState<GateConfig>(INITIAL_GATE);
    const [activeTab, setActiveTab] = useState<"carport" | "gate">("carport");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showBrowserOrderModal, setShowBrowserOrderModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [price, setPrice] = useState(0);
    const [gatePrice, setGatePrice] = useState(0);
    const [orderJson, setOrderJson] = useState("");
    const [loads, setLoads] = useState({
        snowLoad: 336,
        windLoad: 304,
        totalLoad: 361,
        recommended: {
            pillarSize: PillarSize.Size80 as string,
            trussHeight: 0.35,
            purlinStep: 1.0,
        },
        warnings: [] as string[],
    });

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            console.log("🔄 Initializing Telegram WebApp...");
            console.log(`📱 Version: ${tg.version}`);
            console.log(`📱 Platform: ${tg.platform}`);
            console.log(`📱 initData present: ${!!tg.initData}`);
            console.log(`📱 initData length: ${tg.initData?.length || 0}`);
            console.log(`📱 sendData available: ${typeof tg.sendData === 'function'}`);
            
            tg.ready();
            try {
                tg.expand();
                document.body.style.height = tg.viewportHeight + "px";
                tg.setHeaderColor('#f8fafc');
                tg.setBackgroundColor('#f1f5f9');
                console.log("✅ Telegram WebApp initialized");
            } catch (e) {
                console.warn("⚠️ WebApp init error:", e);
            }
        } else {
            console.log("⚠️ Telegram WebApp not available - browser mode");
        }
    }, []);

    // Пересчет нагрузок при изменении конфигурации
    useEffect(() => {
        try {
            const result = calculateLoads({
                snowRegion: config.snowRegion || "IV",
                windRegion: config.windRegion || "III",
                terrain: (config.terrain || "B") as TerrainType,
                buildingHeight: config.height,
                roofAngle: config.roofSlope,
                roofType: config.roofType,
                roofWidth: config.width,
                roofLength: config.length,
            });
            
            setLoads({
                snowLoad: result.snowCalculated,
                windLoad: result.windCalculated,
                totalLoad: result.totalVerticalLoad,
                recommended: {
                    pillarSize: result.recommendedPillarSize,
                    trussHeight: result.recommendedTrussHeight,
                    purlinStep: result.recommendedPurlinStep,
                },
                warnings: result.warnings,
            });
        } catch (e) {
            console.error("Error calculating loads:", e);
        }
    }, [config.snowRegion, config.windRegion, config.terrain, config.height, config.roofSlope, config.roofType, config.width, config.length]);

    const handleConfigChange = useCallback((newConfig: CarportConfig) => {
        // Автоподбор сечения столбов при изменении размеров
        if (
            newConfig.width !== config.width ||
            newConfig.length !== config.length ||
            newConfig.height !== config.height
        ) {
            const recommended = getRecommendedPillarSize(
                newConfig.width,
                newConfig.length,
                newConfig.height,
                loads.totalLoad,
            );
            // Увеличиваем если рекомендуемое больше текущего
            const sizes = [PillarSize.Size60, PillarSize.Size80, PillarSize.Size100, PillarSize.Size120];
            const currentIdx = sizes.indexOf(newConfig.pillarSize);
            const recIdx = sizes.indexOf(recommended);
            
            if (recIdx > currentIdx) {
                newConfig.pillarSize = recommended;
            }
        }
        setConfig(newConfig);
    }, [config.width, config.length, config.height, loads.totalLoad]);

    // Обработчик изменения конфигурации ворот
    const handleGateChange = useCallback((changes: Partial<GateConfig>) => {
        setGateConfig(prev => ({ ...prev, ...changes }));
    }, []);

    // Обработчик изменения региона
    const handleRegionChange = useCallback((city: string) => {
        const regions = CITY_REGIONS[city];
        if (regions) {
            setConfig(prev => ({
                ...prev,
                region: city,
                snowRegion: regions.snow,
                windRegion: regions.wind,
            }));
        }
    }, []);

    // --- РАСЧЕТ СТОИМОСТИ ---
    useEffect(() => {
        let materialCost = 0;
        const floorArea = config.width * config.length;

        const baseRate = PRICING.baseTrussStructure.base;
        const widthPenalty =
            Math.max(0, config.width - 4.5) *
            PRICING.baseTrussStructure.widthFactor;

        let volumeDiscount = 1.0;
        if (floorArea > 50) volumeDiscount = 0.95;
        if (floorArea > 100) volumeDiscount = 0.9;

        const trussCostPerSqm = (baseRate + widthPenalty) * volumeDiscount;

        materialCost +=
            floorArea *
            trussCostPerSqm *
            PRICING.roofTypeMultiplier[config.roofType];

        const maxSpan = 6.0;
        const numCols = Math.ceil(config.width / maxSpan) + 1;
        const postSpacing = 3.5;
        const numRows = Math.ceil(config.length / postSpacing) + 1;
        const pillarCount = numCols * numRows;
        const totalPillarHeight = pillarCount * config.height;

        materialCost +=
            totalPillarHeight * PRICING.pillarMultiplier[config.pillarSize];

        let roofAreaMultiplier = 1.1;
        if (config.roofType === RoofType.Gable) roofAreaMultiplier = 1.25;
        if (config.roofType === RoofType.Arched) roofAreaMultiplier = 1.3;
        if (config.roofType === RoofType.SemiArched) roofAreaMultiplier = 1.35;

        const roofArea = floorArea * roofAreaMultiplier;
        materialCost +=
            roofArea * PRICING.roofMaterialPricePerSqm[config.roofMaterial];
        materialCost += floorArea * PRICING.paintMultiplier[config.paintType];

        if (config.hasTrusses)
            materialCost += floorArea * PRICING.extras.trusses;
        if (config.hasGutters)
            materialCost += config.length * 2 * PRICING.extras.gutters;
        if (config.hasSideWalls) {
            const wallArea =
                config.length * config.height + config.width * config.height;
            materialCost += wallArea * PRICING.extras.sideWalls;
        }
        const foundationEnabled = config.hasFoundation || config.installationType === InstallationType.FoundationPour;
        const baseThickness = 0.3;
        const thickness = Math.max(0.15, config.foundationThickness || baseThickness);
        const foundationVolume = foundationEnabled ? floorArea * thickness : 0;
        const foundationCost = foundationVolume * 10000;

        let total = materialCost;
        const installActive = config.installationType !== InstallationType.None;
        if (installActive) {
            let installPercent = PRICING.extras.installation;
            if (materialCost > 300000) installPercent = 0.22;
            if (materialCost > 600000) installPercent = 0.2;
            if (config.height > 3.2) installPercent += PRICING.extras.highWork;

            total = total * (1 + installPercent);
        }

        const minTotal = floorArea * PRICING.minPricePerSqm;
        if (total < minTotal) {
            total = minTotal;
        }

        total += foundationCost;

        setPrice(Math.round(total / 100) * 100);
    }, [config]);

    // Расчет стоимости ворот
    useEffect(() => {
        setGatePrice(calculateGatePrice(gateConfig));
    }, [gateConfig]);

    // Общая стоимость
    const totalPrice = price + gatePrice;
    const oldPrice = Math.round(totalPrice * 1.2);
    const savings = oldPrice - totalPrice;
    const installActive = config.installationType !== InstallationType.None;

    const calculateBOM = useCallback(() => {
        const pillarCount =
            (Math.ceil(config.width / 6.0) + 1) *
            (Math.ceil(config.length / 3.0) + 1);
        const foundationEnabled = config.hasFoundation || config.installationType === InstallationType.FoundationPour;
        const installActive = config.installationType !== InstallationType.None;

        return {
            pillarCount,
            roofArea: (config.width * config.length * 1.2).toFixed(1),
        };
    }, [config]);

    const handleDownloadReport = useCallback(() => {
        downloadReport(config, totalPrice);
    }, [config, totalPrice]);

    const getOrderPayload = useCallback((options?: { includeCad?: boolean }) => {
        const includeCad = options?.includeCad ?? true;
        const frameColorObj = FRAME_COLORS.find(
            (c) => c.hex === config.frameColor,
        );
        const roofColorObj = ROOF_COLORS.find(
            (c) => c.hex === config.roofColor,
        );

        const areaFloor = (config.width * config.length).toFixed(2);
        let roofAreaMultiplier = 1.0;
        if (config.roofType === RoofType.Gable) roofAreaMultiplier = 1.25;
        else if (config.roofType === RoofType.Arched) roofAreaMultiplier = 1.35;
        else roofAreaMultiplier = 1.1;
        const areaRoof = (
            config.width *
            config.length *
            roofAreaMultiplier
        ).toFixed(2);

        let peakHeight = config.height;
        if (config.roofType === RoofType.Gable)
            peakHeight +=
                (config.width / 2) *
                Math.tan((config.roofSlope * Math.PI) / 180);
        else if (config.roofType === RoofType.Arched)
            peakHeight += config.width * SPECS.trussHeightArch;

        const foundationEnabled = config.hasFoundation || config.installationType === InstallationType.FoundationPour;
        const installActive = config.hasInstallation;

        return {
            id: generateOrderId(),
            timestamp: new Date().toISOString(),
            type: config.roofType,
            width: config.width,
            length: config.length,
            height: config.height,
            height_peak: parseFloat(peakHeight.toFixed(2)),
            slope: config.roofSlope,
            pillar: config.pillarSize,
            area_floor: areaFloor,
            area_roof: areaRoof,
            material: config.roofMaterial,
            paint: config.paintType,
            color_frame: frameColorObj ? frameColorObj.name : config.frameColor,
            color_roof: roofColorObj ? roofColorObj.name : config.roofColor,
            opts: {
                trusses: config.hasTrusses,
                gutters: config.hasGutters,
                walls: config.hasSideWalls,
                found: foundationEnabled,
                install: installActive,
            },
            foundation_thickness: config.foundationThickness,
            installation_type: config.installationType,
            region: config.region,
            snow_region: config.snowRegion,
            wind_region: config.windRegion,
            loads: {
                snow: loads.snowLoad,
                wind: loads.windLoad,
                total: loads.totalLoad,
            },
            price: price,
            price_gate: gatePrice,
            price_total: totalPrice,
            gate: gateConfig.type !== GateType.None ? {
                type: gateConfig.type,
                width: gateConfig.width,
                height: gateConfig.height,
                filling: gateConfig.filling,
                frameColor: gateConfig.frameColor,
                panelColor: gateConfig.panelColor,
                wicket: gateConfig.hasWicket,
                automation: gateConfig.hasAutomation,
            } : undefined,
            cad_dxf: includeCad ? (() => {
                try {
                    return generateDXFBase64(config, gateConfig);
                } catch (e) {
                    console.error("Error generating DXF:", e);
                    return undefined;
                }
            })() : undefined,
        };
    }, [config, gateConfig, price, gatePrice, totalPrice, loads]);

    const handleOrder = useCallback(async () => {
        const tg = window.Telegram?.WebApp;
        const telegramPayload = getOrderPayload({ includeCad: false });

        console.log(`📱 Telegram WebApp version: ${tg?.version || 'N/A'}`);
        console.log(`📱 Platform: ${tg?.platform || 'N/A'}`);

        // Если Telegram WebApp отсутствует ИЛИ мы в браузере (platform unknown, no initData) — открываем browser modal для ввода контактов
        if (!tg || tg.platform === 'unknown' || !tg.initData) {
            console.warn("⚠️ Telegram WebApp not found or running in browser - browser mode");
            setOrderJson(JSON.stringify(getOrderPayload({ includeCad: true })));
            setShowBrowserOrderModal(true);
            return;
        }

        // Если Telegram WebApp доступен и можно использовать sendData — отправляем напрямую боту
        const dataToSend = JSON.stringify(telegramPayload);
        const payloadSize = new Blob([dataToSend]).size;
        const canUseSendData = tg && typeof tg.sendData === 'function';
        const initDataUnsafe = (tg as any)?.initDataUnsafe as any;
        const isInlineMode = !!initDataUnsafe?.query_id;
        console.log(`📤 Payload size: ${payloadSize} bytes (${(payloadSize / 1024).toFixed(2)}KB)`);
        console.log(`📱 canUseSendData: ${!!canUseSendData}, isInlineMode: ${isInlineMode}`);

        if (canUseSendData && !isInlineMode) {
            // Ограничение sendData — 4096 байт
            let finalData = dataToSend;
            if (payloadSize > 4096) {
                console.warn(`⚠️ Payload too large: ${payloadSize} bytes, reducing...`);
                const minimalPayload: any = {
                    id: telegramPayload.id,
                    type: telegramPayload.type,
                    length: telegramPayload.length,
                    width: telegramPayload.width,
                    height: telegramPayload.height,
                    height_peak: telegramPayload.height_peak,
                    slope: telegramPayload.slope,
                    pillar: telegramPayload.pillar,
                    area_floor: telegramPayload.area_floor,
                    material: telegramPayload.material,
                    paint: telegramPayload.paint,
                    color_frame: telegramPayload.color_frame,
                    color_roof: telegramPayload.color_roof,
                    opts: telegramPayload.opts,
                    price: telegramPayload.price,
                    price_gate: telegramPayload.price_gate,
                    price_total: telegramPayload.price_total,
                    region: telegramPayload.region,
                    gate: telegramPayload.gate,
                };
                finalData = JSON.stringify(minimalPayload);
                console.log(`📦 Reduced payload: ${new Blob([finalData]).size} bytes`);
            }

            try {
                console.log('🚀 Calling sendData...');
                tg.sendData(finalData);
                console.log('✅ sendData called successfully');
                return; // sendData will close WebApp; stop further processing
            } catch (e) {
                console.error('❌ sendData exception:', e);
                // fall through to clipboard/open behavior
            }
        }

        // Формируем полный текст заказа для отправки админу (clipboard/open-chat fallback)
        const o = telegramPayload as any;
        const roofTypeName = (t: string) => ({ single: 'Односкатный', gable: 'Двускатный', arched: 'Арочный', triangular: 'Треугольный', semiarched: 'Полуарочный' }[t] || t);
        const materialName = (m: string) => ({ polycarbonate: 'Сотовый поликарбонат', metaltile: 'Металлочерепица', decking: 'Профнастил' }[m] || m);
        const paintName = (p: string) => ({ none: 'Грунт-эмаль', ral: 'Эмаль RAL', polymer: 'Полимерно-порошковая' }[p] || p);
        const gateTypeName = (g: string) => ({ none: 'Нет', sliding: 'Откатные', swing: 'Распашные', hinged: 'Навесные' }[g] || g);
        const gateFillName = (f: string) => ({ lattice: 'Решетка', solid: 'Сплошное', forged: 'Ковка', combined: 'Комби', vertical: 'Вертик. планки' }[f] || f);

        const opts = o.opts || {};
        const optList: string[] = [];
        if (opts.trusses) optList.push('✅ Усил. фермы');
        if (opts.gutters) optList.push('✅ Водостоки');
        if (opts.walls) optList.push('✅ Зашивка');
        if (opts.found) optList.push('✅ Фундамент');
        if (opts.install) optList.push('✅ Монтаж');
        const optStr = optList.length ? optList.join('\n') : 'Базовая';

        const loads = o.loads || {};
        let loadsStr = '';
        if (loads.snow || loads.wind || loads.total) {
            loadsStr = `➖➖➖➖➖➖➖➖➖➖\n❄️ Снеговая: ${loads.snow || 0} кг/м²\n💨 Ветровая: ${loads.wind || 0} Па\n⚖️ Общая: ${loads.total || 0} кг/м²\n📍 Регион: ${o.region || 'Не указан'}\n`;
        }

        const gate = o.gate || {};
        let gateStr = '';
        if (gate.type && gate.type !== 'none') {
            gateStr = `➖➖➖➖➖➖➖➖➖➖\n🚗 ВОРОТА:\n📐 Тип: ${gateTypeName(gate.type)}\n📏 Размер: ${gate.width || 4}×${gate.height || 2} м\n🔲 Заполнение: ${gateFillName(gate.filling)}\n🎨 Цвет рамы: ${gate.frameColor || gate.frame_color || 'Не указан'}\n🎨 Цвет полотна: ${gate.panelColor || gate.panel_color || 'Не указан'}\n🚶 Калитка: ${gate.wicket ? 'Да' : 'Нет'}\n🤖 Автоматика: ${gate.automation ? 'Да' : 'Нет'}\n`;
        }

        const priceNavyes = o.price || 0;
        const priceGate = o.price_gate || 0;
        const priceTotal = o.price_total || priceNavyes + priceGate;
        let priceStr = `💰 НАВЕС: ${priceNavyes.toLocaleString()} руб.`;
        if (priceGate > 0) {
            priceStr += `\n🚗 ВОРОТА: ${priceGate.toLocaleString()} руб.`;
            priceStr += `\n💵 ИТОГО: ${priceTotal.toLocaleString()} руб.`;
        }

        const orderText = `Здравствуйте! Хочу оформить заявку, вот данные:
🆔 ID: ${o.id || 'N/A'}
🏗 Тип: ${roofTypeName(o.type)}
📏 Длина: ${o.length || '?'} м
📏 Ширина: ${o.width || '?'} м
↕️ Высота (столб): ${o.height || '?'} м
🏔 Высота (общ): ~${o.height_peak || '?'} м
📐 Уклон: ${o.slope || '?'}°
🧱 Сечение: ${o.pillar || '?'}
➖➖➖➖➖➖➖➖➖➖
🔲 S пола: ${o.area_floor || '?'} м²
🏠 S кровли: ${o.area_roof || '?'} м²
🏠 Материал: ${materialName(o.material)}
🎨 Покраска: ${paintName(o.paint)}
🖌 Цвет: ${o.color_frame || '?'} / ${o.color_roof || '?'}
➖➖➖➖➖➖➖➖➖➖
🛠 Опции:
${optStr}
${loadsStr}${gateStr}➖➖➖➖➖➖➖➖➖➖
${priceStr}`;

        // Копируем текст в буфер обмена
        navigator.clipboard.writeText(orderText).then(() => {
            console.log('✅ Order text copied to clipboard');
        }).catch(err => {
            console.warn('Clipboard write failed:', err);
        });

        // Если есть Telegram WebApp - используем openTelegramLink для открытия чата с админом
        if (tg && typeof tg.openTelegramLink === 'function') {
            console.log('📱 Using Telegram openTelegramLink to open admin chat');
            // Открываем чат с админом по user_id (numeric)
            // user_id 5216818742
            try {
                tg.openTelegramLink('tg://user?id=5216818742');
                // Если нативный клиент не открылся, через небольшой таймаут открываем web.telegram.org
                setTimeout(() => {
                    try {
                        tg.openTelegramLink('https://web.telegram.org/k/#5216818742');
                    } catch (e) {
                        window.open('https://web.telegram.org/k/#5216818742', '_blank');
                    }
                }, 800);
            } catch (err) {
                console.warn('openTelegramLink tg:// failed, falling back to web.telegram.org', err);
                try {
                    tg.openTelegramLink('https://web.telegram.org/k/#5216818742');
                } catch (e) {
                    window.open('https://web.telegram.org/k/#5216818742', '_blank');
                }
            }
            // Показываем уведомление
            setTimeout(() => {
                tg.showPopup?.({
                    title: "✅ Текст скопирован",
                    message: "Текст заказа скопирован в буфер обмена.\n\nВставьте его в чат (зажмите поле ввода → Вставить) и отправьте.",
                    buttons: [{ type: "close", text: "Понятно" }]
                });
            }, 500);
        } else {
            // Браузер без Telegram - открываем web.telegram.org
            console.log('🌐 Browser mode - opening web.telegram.org');
            window.open('https://web.telegram.org/k/#5216818742', '_blank');
            alert('✅ Текст заказа скопирован в буфер обмена.\n\nВставьте его в чат (Ctrl+V) и отправьте.');
        }
    }, [getOrderPayload]);

    return (
        <div className="flex flex-col lg:flex-row h-[100dvh] w-screen overflow-hidden bg-slate-100 font-sans overscroll-none fixed inset-0">
            {/* HEADER */}
            <div className="absolute top-0 left-0 right-0 z-40 p-4 pointer-events-none flex justify-between items-start lg:p-6">
                <div className="bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-xl shadow-sm border border-slate-200/50 pointer-events-auto">
                    <h1 className="font-bold text-slate-900 leading-tight flex items-center gap-2">
                        <span className="text-indigo-600">Kovka007</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-xs font-normal text-slate-500 uppercase tracking-wider">
                            Конструктор v2.0
                        </span>
                    </h1>
                </div>
            </div>

            <div className="relative w-full flex-grow min-h-0 lg:h-full transition-all duration-300">
                <Scene config={config} gateConfig={gateConfig} />

                {/* Предупреждения о нагрузках */}
                {loads.warnings.length > 0 && (
                    <div className="absolute top-20 left-4 z-20 max-w-xs">
                        {loads.warnings.map((warning, idx) => (
                            <div key={idx} className="bg-amber-50/90 backdrop-blur border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 mb-2 flex items-start gap-2">
                                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                                <span>{warning}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ИНФО-ПЛАШКА */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30 px-4">
                    <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-200 text-slate-800 flex flex-wrap items-center gap-2 text-[11px] sm:text-sm font-medium max-w-full">
                        <div className="flex items-baseline gap-1">
                            <span className="font-bold text-slate-700">
                                {config.length}×{config.width}×{config.height}м
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                                (Д×Ш×В)
                            </span>
                        </div>
                        <span className="text-slate-500">
                            {(config.width * config.length).toFixed(1)} м²
                        </span>
                        <span className="text-slate-500">
                            ~{Math.round(price / (config.width * config.length)).toLocaleString()} ₽/м²
                        </span>
                        {gateConfig.type !== GateType.None && (
                            <>
                                <span className="text-indigo-600 flex items-center gap-1">
                                    <Car size={12} />
                                    Ворота
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* MOBILE PANEL */}
            <div className="lg:hidden flex flex-col z-30 flex-shrink-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-safe">
                {/* Табы */}
                <div className="flex border-b border-slate-100">
                    <button
                        onClick={() => setActiveTab("carport")}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                            activeTab === "carport"
                                ? "text-indigo-600 border-b-2 border-indigo-600"
                                : "text-slate-500"
                        }`}
                    >
                        <Home size={16} />
                        Навес
                    </button>
                    <button
                        onClick={() => setActiveTab("gate")}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                            activeTab === "gate"
                                ? "text-indigo-600 border-b-2 border-indigo-600"
                                : "text-slate-500"
                        }`}
                    >
                        <Car size={16} />
                        Ворота
                        {gateConfig.type !== GateType.None && (
                            <span className="bg-indigo-100 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded-full">
                                +{gatePrice.toLocaleString()}
                            </span>
                        )}
                    </button>
                </div>
                
                {/* Кнопка настроек */}
                <div className="px-4 pt-3">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                    >
                        <Settings2 size={18} />
                        <span>Настроить {activeTab === "carport" ? "навес" : "ворота"}</span>
                        <ChevronRight size={16} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-medium text-slate-400 line-through decoration-slate-400/50">
                                    {oldPrice.toLocaleString()} ₽
                                </span>
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                    -20%
                                </span>
                            </div>
                            {installActive && (
                                <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                    <CheckCircle2 size={12} />
                                    с монтажом
                                </div>
                            )}
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-black text-slate-900 leading-none tracking-tight">
                                    {totalPrice.toLocaleString()} ₽
                                </p>
                                {gatePrice > 0 && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Навес: {price.toLocaleString()} + Ворота: {gatePrice.toLocaleString()}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">
                                <TrendingDown size={14} />
                                <span>-{savings.toLocaleString()} ₽</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleOrder}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOrder();
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg flex justify-center items-center gap-3 active:scale-[0.98] transition-all"
                        style={{ touchAction: "manipulation" }}
                    >
                        <span>Оформить заявку</span>
                        <Send size={18} />
                    </button>
                </div>
            </div>

            {/* DESKTOP SIDEBAR */}
            <div
                className={`fixed inset-0 z-50 lg:static lg:z-auto transform transition-transform duration-500 ease-out ${isMobileMenuOpen ? "translate-y-0" : "translate-y-[100%] lg:translate-y-0"} lg:w-[460px] lg:min-w-[420px] flex-shrink-0 h-full shadow-2xl lg:shadow-none flex flex-col bg-white`}
            >
                {/* Mobile close button */}
                <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800">Настройки</h2>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                {/* Desktop tabs */}
                <div className="hidden lg:flex border-b border-slate-100">
                    <button
                        onClick={() => setActiveTab("carport")}
                        className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                            activeTab === "carport"
                                ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
                                : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <Home size={18} />
                        Навес
                    </button>
                    <button
                        onClick={() => setActiveTab("gate")}
                        className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                            activeTab === "gate"
                                ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
                                : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <Car size={18} />
                        Ворота
                        {gateConfig.type !== GateType.None && (
                            <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                +{gatePrice.toLocaleString()}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === "carport" ? (
                        <div>
                            <Controls
                                config={config}
                                onChange={handleConfigChange}
                                price={price}
                                onOrder={handleOrder}
                            />
                            {/* Панель нагрузок */}
                            <div className="px-6 pb-6">
                                <LoadsInfoPanel
                                    loads={loads}
                                    region={config.region}
                                    snowRegion={config.snowRegion}
                                    windRegion={config.windRegion}
                                    terrain={config.terrain}
                                    onRegionChange={handleRegionChange}
                                    onSnowRegionChange={(r) => setConfig(prev => ({ ...prev, snowRegion: r }))}
                                    onWindRegionChange={(r) => setConfig(prev => ({ ...prev, windRegion: r }))}
                                    onTerrainChange={(t) => setConfig(prev => ({ ...prev, terrain: t }))}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-6">
                            <GateControls config={gateConfig} onChange={handleGateChange} />
                        </div>
                    )}
                </div>

                {/* ORDER FOOTER (always visible) */}
                <div className="flex-shrink-0 p-6 bg-white border-t border-slate-200">
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-medium text-slate-400 line-through decoration-slate-400/50">
                                    {oldPrice.toLocaleString()} ₽
                                </span>
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                    -20%
                                </span>
                            </div>
                            {installActive && (
                                <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                    <CheckCircle2 size={12} />
                                    с монтажом
                                </div>
                            )}
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-black text-slate-900 leading-none tracking-tight">
                                    {totalPrice.toLocaleString()} ₽
                                </p>
                                {gatePrice > 0 && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Навес: {price.toLocaleString()} + Ворота: {gatePrice.toLocaleString()}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">
                                <TrendingDown size={14} />
                                <span>-{savings.toLocaleString()} ₽</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleOrder}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOrder();
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                        style={{ touchAction: "manipulation" }}
                    >
                        <span>Оформить заявку</span>
                        <Send size={18} />
                    </button>
                </div>
            </div>

            {/* DESKTOP BUTTONS */}
            <div className="hidden lg:flex fixed bottom-6 left-6 z-40 gap-3 items-center">
                <button
                    onClick={() => setShowExportModal(true)}
                    className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-xl shadow-lg border border-slate-200 flex items-center gap-2 transition-all active:scale-95"
                >
                    <Download size={16} className="text-indigo-600" />
                    <span className="text-sm">Экспорт</span>
                </button>
                <a
                    href="https://kovka007.ru/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-xl shadow-lg border border-slate-200 flex items-center gap-2 transition-all active:scale-95 no-underline"
                >
                    <Globe size={16} className="text-blue-600" />
                    <span className="text-sm">Сайт</span>
                </a>
            </div>

            <BrowserOrderModal
                isOpen={showBrowserOrderModal}
                onClose={() => setShowBrowserOrderModal(false)}
                orderData={orderJson}
                price={totalPrice}
                config={config}
                gateConfig={gateConfig}
            />
            
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                config={config}
                price={totalPrice}
                gateConfig={gateConfig}
            />
        </div>
    );
}
