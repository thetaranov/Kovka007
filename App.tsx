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
    X,
    FileText,
    Globe,
    TrendingDown,
    Send,
    Settings2,
    Download,
    Car,
    Home,
    Calculator,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Layers,
    Shield,
    Check,
} from "lucide-react";

// ==================== SECURITY UTILITIES ====================

const sanitizeInput = (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .replace(/[\x00-\x1f\x7f]/g, '')
        .trim()
        .slice(0, 500);
};

const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return /^(\+7|8)?[0-9]{10}$/.test(cleaned);
};

const validateName = (name: string): boolean => {
    return /^[a-zA-Zа-яА-ЯёЁ\s\-]{2,100}$/.test(name);
};

const generateCSRFToken = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const rateLimitState = { lastSubmit: 0, submitCount: 0, resetTime: 0 };
const checkRateLimit = (): boolean => {
    const now = Date.now();
    if (now > rateLimitState.resetTime) {
        rateLimitState.submitCount = 0;
        rateLimitState.resetTime = now + 60000;
    }
    if (rateLimitState.submitCount >= 3) return false;
    if (now - rateLimitState.lastSubmit < 5000) return false;
    rateLimitState.lastSubmit = now;
    rateLimitState.submitCount++;
    return true;
};

// ==================== ENVIRONMENT DETECTION ====================

// Check if running inside Telegram WebApp (any type)
const isTelegramWebApp = (): boolean => {
    const tg = window.Telegram?.WebApp;
    // Check if WebApp object exists and has platform info (always present in real Telegram)
    return !!(tg && tg.platform && tg.platform !== 'unknown');
};

// Check if sendData is available (only for Keyboard Button Mini Apps)
const canUseSendData = (): boolean => {
    const tg = window.Telegram?.WebApp;
    // sendData is available when: ACTUALLY in Telegram + sendData function exists
    // CRITICAL: Must check isTelegramWebApp() first! Otherwise script may load in browser
    // and sendData function exists but won't work (silently fails)
    return !!(isTelegramWebApp() && tg && typeof tg.sendData === 'function');
};

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

// ==================== POLICY PAGES ====================

const PrivacyPolicyPage: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-[200] bg-slate-900 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
            <button onClick={onClose} className="mb-6 text-slate-400 hover:text-white flex items-center gap-2">
                <ChevronRight className="rotate-180" size={20} />Назад
            </button>
            <h1 className="text-3xl font-bold text-white mb-6">Политика конфиденциальности</h1>
            <div className="prose prose-invert max-w-none text-slate-300 space-y-6">
                <p className="text-slate-400">Последнее обновление: {new Date().toLocaleDateString('ru-RU')}</p>
                <section><h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Общие положения</h2><p>Настоящая политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей сервиса конфигуратора навесов Kovka007.</p></section>
                <section><h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Собираемые данные</h2><ul className="list-disc pl-6 space-y-2"><li>Имя и контактный телефон для связи</li><li>Комментарии и пожелания к заказу</li><li>Технические данные о конфигурации навеса</li></ul></section>
                <section><h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Цели обработки</h2><ul className="list-disc pl-6 space-y-2"><li>Обработка и выполнение заказов</li><li>Связь для уточнения деталей</li><li>Улучшение качества сервиса</li></ul></section>
                <section><h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Безопасность</h2><p>Мы принимаем все необходимые меры для защиты ваших данных. Передача осуществляется по защищенному протоколу HTTPS.</p></section>
                <section><h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Ваши права</h2><ul className="list-disc pl-6 space-y-2"><li>Получать информацию о своих данных</li><li>Требовать исправления или удаления</li><li>Отозвать согласие на обработку</li></ul></section>
            </div>
        </div>
    </div>
);

const TermsOfUsePage: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-[200] bg-slate-900 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
            <button onClick={onClose} className="mb-6 text-slate-400 hover:text-white flex items-center gap-2">
                <ChevronRight className="rotate-180" size={20} />Назад
            </button>
            <h1 className="text-3xl font-bold text-white mb-6">Условия использования</h1>
            <div className="prose prose-invert max-w-none text-slate-300 space-y-6">
                <p className="text-slate-400">Последнее обновление: {new Date().toLocaleDateString('ru-RU')}</p>
                <section><h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Описание сервиса</h2><p>Kovka007 предоставляет онлайн-инструмент для конфигурации и расчета стоимости навесов. Все расчеты носят ориентировочный характер.</p></section>
                <section><h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Использование</h2><ul className="list-disc pl-6 space-y-2"><li>Предоставлять достоверную информацию</li><li>Не использовать сервис для незаконных целей</li><li>Соблюдать правила хорошего тона</li></ul></section>
                <section><h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Оформление заказа</h2><p>Окончательная цена и сроки определяются после согласования с менеджером.</p></section>
                <section><h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Ответственность</h2><p>Сервис не несет ответственности за неточности, вызванные некорректными входными данными.</p></section>
            </div>
        </div>
    </div>
);

// ==================== SUCCESS SCREEN ====================

const OrderSuccessScreen: React.FC<{ onClose: () => void; orderId: string }> = ({ onClose, orderId }) => (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8 text-center border border-slate-700">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={48} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Заявка отправлена!</h2>
            <p className="text-slate-400 mb-2">Номер заявки: <span className="text-white font-mono">{orderId}</span></p>
            <p className="text-slate-400 mb-6">Наш менеджер свяжется с вами в ближайшее время.</p>
            <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
                <p className="text-sm text-slate-300">📞 Обычно отвечаем в течение 30 минут в рабочее время</p>
            </div>
            <button onClick={onClose} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors">Понятно</button>
        </div>
    </div>
);

// ==================== BROWSER ORDER MODAL (SECURE) ====================

interface BrowserOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderData: string;
    price: number;
    config: CarportConfig;
    gateConfig: GateConfig;
    onSuccess: (orderId: string) => void;
    onShowPrivacy: () => void;
    onShowTerms: () => void;
}

const BrowserOrderModal: React.FC<BrowserOrderModalProps> = ({
    isOpen, onClose, orderData, config, onSuccess, onShowPrivacy, onShowTerms
}) => {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [comment, setComment] = useState("");
    const [sending, setSending] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
    const [csrfToken] = useState(() => generateCSRFToken());

    // useMemo must be called before any conditional returns (Rules of Hooks)
    const parsedOrder = useMemo(() => {
        try { return orderData ? JSON.parse(orderData) : null; }
        catch { return null; }
    }, [orderData]);

    if (!isOpen) return null;

    const validateForm = (): boolean => {
        const newErrors: { name?: string; phone?: string } = {};
        const sanitizedName = sanitizeInput(name);
        if (!sanitizedName) newErrors.name = "Введите имя";
        else if (!validateName(sanitizedName)) newErrors.name = "Некорректное имя";
        const sanitizedPhone = sanitizeInput(phone);
        if (!sanitizedPhone) newErrors.phone = "Введите телефон";
        else if (!validatePhone(sanitizedPhone)) newErrors.phone = "Некорректный формат";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSend = async () => {
        if (sending) return;
        if (!validateForm()) return;
        if (!checkRateLimit()) { alert('Слишком много запросов. Подождите.'); return; }

        setSending(true);
        try {
            const payload = {
                ...(parsedOrder || {}),
                name: sanitizeInput(name),
                phone: sanitizeInput(phone),
                comment: sanitizeInput(comment),
                csrf_token: csrfToken,
                timestamp: Date.now(),
                source: 'browser'
            };

            const endpoint = (window as any).KOVKA_BOT_ENDPOINT || (import.meta as any).env?.VITE_BOT_API || 'https://kovka007bot.onrender.com';
            console.log('[BrowserOrderModal] Sending order to:', `${endpoint}/submit_order`);
            console.log('[BrowserOrderModal] Payload:', payload);
            
            const res = await fetch(`${endpoint.replace(/\/$/, '')}/submit_order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
                body: JSON.stringify(payload),
            });

            console.log('[BrowserOrderModal] Response status:', res.status);

            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                console.log('[BrowserOrderModal] Success:', data);
                onSuccess(parsedOrder?.id || 'N/A');
            } else {
                const errorText = await res.text().catch(() => 'Unknown error');
                console.error('[BrowserOrderModal] Error response:', res.status, errorText);
                alert(`Ошибка отправки (${res.status}). Попробуйте позже.`);
            }
        } catch (err) {
            console.error('[BrowserOrderModal] Network error:', err);
            alert('Ошибка соединения. Проверьте интернет и попробуйте позже.');
        } finally {
            setSending(false);
        }
    };

    const roofTypeName = (t: string) => ({ single: 'Односкатный', gable: 'Двускатный', arched: 'Арочный', triangular: 'Треугольный', semiarched: 'Полуарочный' }[t] || t);
    const materialName = (m: string) => ({ polycarbonate: 'Поликарбонат', metaltile: 'Металлочерепица', decking: 'Профнастил' }[m] || m);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto border border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Shield size={20} className="text-green-500" />Оформление заказа
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-slate-400">Ваше имя *</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Иванов" maxLength={100} autoComplete="name"
                            className={`w-full mt-1 bg-slate-700 border ${errors.name ? 'border-red-500' : 'border-slate-600'} rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none`} />
                        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="text-sm text-slate-400">Телефон *</label>
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" maxLength={20} autoComplete="tel" type="tel"
                            className={`w-full mt-1 bg-slate-700 border ${errors.phone ? 'border-red-500' : 'border-slate-600'} rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none`} />
                        {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                        <label className="text-sm text-slate-400">Комментарий</label>
                        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Дополнительные пожелания" maxLength={500}
                            className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 h-20 resize-none text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none" />
                    </div>

                    <button onClick={handleSend} disabled={sending}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white p-4 rounded-xl flex items-center gap-3 justify-center font-bold transition-all active:scale-[0.98]">
                        <Send size={20} /><span>{sending ? 'Отправка...' : 'Отправить менеджеру'}</span>
                    </button>

                    <p className="text-xs text-slate-500 text-center">
                        При отправке вы соглашаетесь с <button onClick={onShowPrivacy} className="text-indigo-400 hover:underline">политикой конфиденциальности</button> и <button onClick={onShowTerms} className="text-indigo-400 hover:underline">условиями пользования</button>
                    </p>
                </div>

                {parsedOrder && (
                    <div className="bg-slate-700/50 rounded-xl p-4 mt-6 space-y-3">
                        <h4 className="font-semibold text-slate-300">📋 Детали заказа:</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-slate-500">Тип:</span><p className="text-slate-200">{roofTypeName(parsedOrder.type)}</p></div>
                            <div><span className="text-slate-500">Размеры:</span><p className="text-slate-200">{parsedOrder.length}×{parsedOrder.width}×{parsedOrder.height} м</p></div>
                            <div><span className="text-slate-500">Материал:</span><p className="text-slate-200">{materialName(parsedOrder.material)}</p></div>
                            <div><span className="text-slate-500">Площадь:</span><p className="text-slate-200">{parsedOrder.area_floor} м²</p></div>
                        </div>
                        <div className="border-t border-slate-600 pt-3 flex justify-between items-center">
                            <span className="font-bold text-white">💵 Итого:</span>
                            <span className="text-xl font-bold text-white">{(parsedOrder.price_total || parsedOrder.price)?.toLocaleString()} ₽</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const getRecommendedPillarSize = (width: number, length: number, height: number, totalLoad: number = 300): PillarSize => {
    const area = width * length;
    if (width > 8.0 || height > 3.5 || area > 60 || totalLoad > 400) return PillarSize.Size120;
    if (width > 6.0 || height > 3.0 || area > 40 || totalLoad > 300) return PillarSize.Size100;
    if (width > 5.0 || height > 2.8 || area > 30) return PillarSize.Size80;
    return PillarSize.Size60;
};

// ==================== EXPORT MODAL ====================

const ExportModal: React.FC<{ isOpen: boolean; onClose: () => void; config: CarportConfig; price: number; gateConfig: GateConfig }> = ({ isOpen, onClose, config, price, gateConfig }) => {
    const [selectedDXFView, setSelectedDXFView] = useState<'top' | 'front' | 'side' | 'all'>('all');
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Экспорт проекта</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400"><X size={20} /></button>
                </div>
                
                <div className="space-y-3">
                    <button onClick={() => { downloadOBJ(config); onClose(); }}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-xl flex items-center gap-3 transition-all">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center"><Layers size={20} className="text-indigo-400" /></div>
                        <div className="text-left"><div className="font-semibold">3D модель (OBJ)</div><div className="text-xs text-slate-400">Blender, AutoCAD, 3ds Max</div></div>
                    </button>
                    
                    <button onClick={() => { downloadBOM(config); onClose(); }}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-xl flex items-center gap-3 transition-all">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center"><Calculator size={20} className="text-green-400" /></div>
                        <div className="text-left"><div className="font-semibold">Спецификация (CSV)</div><div className="text-xs text-slate-400">Таблица материалов</div></div>
                    </button>
                    
                    <button onClick={() => { downloadReport(config, price); onClose(); }}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-xl flex items-center gap-3 transition-all">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center"><FileText size={20} className="text-amber-400" /></div>
                        <div className="text-left"><div className="font-semibold">Полный отчет (TXT)</div><div className="text-xs text-slate-400">Смета с описанием</div></div>
                    </button>
                    
                    <div className="bg-slate-700/50 p-4 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center"><Layers size={20} className="text-slate-300" /></div>
                            <div className="text-left"><div className="font-semibold text-white">2D чертежи (DXF)</div><div className="text-xs text-slate-400">Проекции для AutoCAD</div></div>
                        </div>
                        <div className="flex gap-2 mb-3">
                            {(['top', 'front', 'side', 'all'] as const).map((key) => (
                                <button key={key} onClick={() => setSelectedDXFView(key)}
                                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${selectedDXFView === key ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}>
                                    {{ top: 'Сверху', front: 'Спереди', side: 'Сбоку', all: 'Все' }[key]}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => { downloadDXFProjection(config, selectedDXFView, gateConfig); onClose(); }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium text-sm transition-all">Скачать DXF</button>
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
    const [onlyGates, setOnlyGates] = useState(false); // Режим "только ворота"
    const [activeTab, setActiveTab] = useState<"carport" | "gate">("carport");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showBrowserOrderModal, setShowBrowserOrderModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
    const [showTermsOfUse, setShowTermsOfUse] = useState(false);
    const [showOrderSuccess, setShowOrderSuccess] = useState(false);
    const [successOrderId, setSuccessOrderId] = useState("");
    const [price, setPrice] = useState(0);
    const [gatePrice, setGatePrice] = useState(0);
    const [orderJson, setOrderJson] = useState("");
    const [isDarkTheme, setIsDarkTheme] = useState(true); // Theme state
    const [isThemeChanging, setIsThemeChanging] = useState(false);
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

    // Initialize Telegram WebApp with dark theme
    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            console.log("🔄 Initializing Telegram WebApp...");
            tg.ready();
            try {
                tg.expand();
                document.body.style.height = tg.viewportHeight + "px";
                tg.setHeaderColor('#0f172a');
                tg.setBackgroundColor('#1e293b');
                console.log("✅ Telegram WebApp initialized");
            } catch (e) {
                console.warn("⚠️ WebApp init error:", e);
            }
        }
    }, []);

    // Theme management with smooth transition
    useEffect(() => {
        const root = document.documentElement;
        
        // Apply theme attribute
        if (isDarkTheme) {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', 'light');
        }
        
        // Update Telegram WebApp colors if available
        const tg = window.Telegram?.WebApp;
        if (tg) {
            try {
                if (isDarkTheme) {
                    tg.setHeaderColor('#0f172a');
                    tg.setBackgroundColor('#1e293b');
                } else {
                    tg.setHeaderColor('#f8fafc');
                    tg.setBackgroundColor('#ffffff');
                }
            } catch (e) {
                console.warn("Theme update error:", e);
            }
        }
    }, [isDarkTheme]);

    // Theme toggle handler with animation
    const handleThemeToggle = useCallback(() => {
        setIsThemeChanging(true);
        setTimeout(() => {
            setIsDarkTheme(prev => !prev);
            setTimeout(() => setIsThemeChanging(false), 400);
        }, 50);
    }, []);

    // Recalculate loads
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
        // Сбрасываем "только ворота" если ворота выключены
        if (gateConfig.type === GateType.None) {
            setOnlyGates(false);
        }
    }, [gateConfig]);

    // Общая стоимость (если onlyGates - только ворота)
    const totalPrice = onlyGates ? gatePrice : (price + gatePrice);
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
            only_gates: onlyGates, // Режим "только ворота" (без навеса)
            cad_dxf: includeCad ? (() => {
                try {
                    return generateDXFBase64(config, gateConfig);
                } catch (e) {
                    console.error("Error generating DXF:", e);
                    return undefined;
                }
            })() : undefined,
        };
    }, [config, gateConfig, price, gatePrice, totalPrice, loads, onlyGates]);

    const handleOrder = useCallback(async () => {
        const tg = window.Telegram?.WebApp;
        const telegramPayload = getOrderPayload({ includeCad: false });

        // Check if running in Telegram WebApp and can use sendData
        if (canUseSendData() && tg) {
            console.log('📱 Telegram WebApp mode - using sendData');
            console.log('Platform:', tg.platform);
            console.log('initData length:', tg.initData?.length || 0);
            
            const dataToSend = JSON.stringify(telegramPayload);
            const payloadSize = new Blob([dataToSend]).size;
            console.log('Payload size:', payloadSize, 'bytes');

            let finalData = dataToSend;
            if (payloadSize > 4096) {
                console.log('⚠️ Payload too large, using minimal version');
                const minimalPayload = {
                    id: telegramPayload.id,
                    type: telegramPayload.type,
                    length: telegramPayload.length,
                    width: telegramPayload.width,
                    height: telegramPayload.height,
                    slope: telegramPayload.slope,
                    pillar: telegramPayload.pillar,
                    area_floor: telegramPayload.area_floor,
                    material: telegramPayload.material,
                    paint: telegramPayload.paint,
                    opts: telegramPayload.opts,
                    price: telegramPayload.price,
                    price_gate: telegramPayload.price_gate,
                    price_total: telegramPayload.price_total,
                    region: telegramPayload.region,
                    gate: telegramPayload.gate,
                };
                finalData = JSON.stringify(minimalPayload);
                console.log('Minimal payload size:', new Blob([finalData]).size, 'bytes');
            }

            try {
                console.log('📤 Calling tg.sendData...');
                tg.sendData(finalData);
                console.log('✅ sendData called successfully');
                // sendData closes the WebApp automatically
                return;
            } catch (e) {
                console.error('❌ sendData failed:', e);
                // Fall through to browser mode as fallback
            }
        }

        // Browser mode (or Telegram fallback if sendData failed)
        console.log('🌐 Browser mode - showing order modal');
        console.log('Platform:', tg?.platform || 'browser');
        setOrderJson(JSON.stringify(getOrderPayload({ includeCad: true })));
        setShowBrowserOrderModal(true);
    }, [getOrderPayload]);

    const handleOrderSuccess = useCallback((orderId: string) => {
        setShowBrowserOrderModal(false);
        setSuccessOrderId(orderId);
        setShowOrderSuccess(true);
    }, []);

    return (
        <div className={`flex flex-col lg:flex-row h-[100dvh] w-screen overflow-hidden font-sans overscroll-none fixed inset-0 theme-transition ${isDarkTheme ? 'bg-slate-900' : 'bg-slate-100'} ${isThemeChanging ? 'theme-changing' : ''}`}>
            {/* HEADER - Adaptive Theme */}
            <div className="absolute top-0 left-0 right-0 z-40 p-3 pointer-events-none flex justify-between items-start lg:p-4">
                <div className={`backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg pointer-events-auto theme-transition ${isDarkTheme ? 'bg-[#1e2128]/95 border border-[#2d323d]' : 'bg-white/95 border border-slate-200'}`}>
                    <h1 className={`font-bold leading-tight flex items-center gap-1.5 text-sm theme-transition ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>
                        <span className={isDarkTheme ? 'text-cyan-400' : 'text-cyan-600'}>Kovka007</span>
                        <span className={isDarkTheme ? 'text-[#3d4451]' : 'text-slate-300'}>|</span>
                        <span className={`text-[10px] font-normal uppercase tracking-wider ${isDarkTheme ? 'text-[#6b7280]' : 'text-slate-500'}`}>v2.0</span>
                        <span className={isDarkTheme ? 'text-[#3d4451]' : 'text-slate-300'}>|</span>
                        <button
                            onClick={handleThemeToggle}
                            className={`text-[10px] font-normal uppercase tracking-wider cursor-pointer transition-colors ${isDarkTheme ? 'text-[#6b7280] hover:text-cyan-400' : 'text-slate-500 hover:text-cyan-600'}`}
                        >
                            тема<span className={isDarkTheme ? 'text-cyan-400/70' : 'text-cyan-600/70'}>({isDarkTheme ? 'тёмная' : 'светлая'})</span>
                        </button>
                    </h1>
                </div>
            </div>

            <div className="relative w-full flex-grow min-h-0 lg:h-full transition-all duration-300">
                <Scene config={config} gateConfig={gateConfig} isDarkTheme={isDarkTheme} />

                {/* Warnings */}
                {loads.warnings.length > 0 && (
                    <div className="absolute top-14 left-4 z-20 max-w-xs">
                        {loads.warnings.map((warning, idx) => (
                            <div key={idx} className={`backdrop-blur text-xs rounded-lg px-3 py-2 mb-2 flex items-start gap-2 theme-transition ${isDarkTheme ? 'bg-amber-900/90 border border-amber-700 text-amber-200' : 'bg-amber-50 border border-amber-300 text-amber-800'}`}>
                                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                                <span>{warning}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ИНФО-ПЛАШКА */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30 px-4">
                    <div className={`backdrop-blur-md px-3 py-2 rounded-xl shadow-lg flex flex-wrap items-center gap-2 text-[11px] sm:text-sm font-medium max-w-full theme-transition ${isDarkTheme ? 'bg-[#1e2128]/95 border border-[#2d323d] text-white' : 'bg-white/95 border border-slate-200 text-slate-800'}`}>
                        <div className="flex items-baseline gap-1">
                            <span className={`font-bold ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>
                                {config.length}×{config.width}×{config.height}м
                            </span>
                            <span className={`text-[10px] font-normal ${isDarkTheme ? 'text-[#6b7280]' : 'text-slate-500'}`}>
                                (Д×Ш×В)
                            </span>
                        </div>
                        <span className={isDarkTheme ? 'text-[#9ca3af]' : 'text-slate-600'}>
                            {(config.width * config.length).toFixed(1)} м²
                        </span>
                        <span className={isDarkTheme ? 'text-[#9ca3af]' : 'text-slate-600'}>
                            ~{Math.round(price / (config.width * config.length)).toLocaleString()} ₽/м²
                        </span>
                        {gateConfig.type !== GateType.None && (
                            <>
                                <span className="text-cyan-400 flex items-center gap-1">
                                    <Car size={12} />
                                    Ворота
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* MOBILE PANEL */}
            <div className="lg:hidden flex flex-col z-30 flex-shrink-0 bg-[#1e2128] shadow-[0_-4px_20px_rgba(0,0,0,0.4)] pb-safe">
                {/* Табы */}
                <div className="flex border-b border-[#2d323d]">
                    <button
                        onClick={() => setActiveTab("carport")}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                            activeTab === "carport"
                                ? "text-cyan-400 border-b-2 border-cyan-400"
                                : "text-[#6b7280]"
                        }`}
                    >
                        <Home size={16} />
                        Навес
                    </button>
                    <button
                        onClick={() => setActiveTab("gate")}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                            activeTab === "gate"
                                ? "text-cyan-400 border-b-2 border-cyan-400"
                                : "text-[#6b7280]"
                        }`}
                    >
                        <Car size={16} />
                        Ворота
                        {gateConfig.type !== GateType.None && (
                            <span className="bg-cyan-500/20 text-cyan-400 text-[10px] px-1.5 py-0.5 rounded-full">
                                +{gatePrice.toLocaleString()}
                            </span>
                        )}
                    </button>
                </div>
                
                {/* Кнопка настроек */}
                <div className="px-4 pt-3">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="w-full bg-[#252830] hover:bg-[#2d3039] border border-[#3d4251] text-[#9ca3af] font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                    >
                        <Settings2 size={18} />
                        <span>Настроить {activeTab === "carport" ? "навес" : "ворота"}</span>
                        <ChevronRight size={16} className="text-[#6b7280]" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-medium text-[#6b7280] line-through decoration-[#6b7280]/50">
                                    {oldPrice.toLocaleString()} ₽
                                </span>
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                    -20%
                                </span>
                            </div>
                            {installActive && (
                                <div className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                    <CheckCircle2 size={12} />
                                    с монтажом
                                </div>
                            )}
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-black text-white leading-none tracking-tight">
                                    {totalPrice.toLocaleString()} ₽
                                </p>
                                {!onlyGates && gatePrice > 0 && (
                                    <p className="text-xs text-[#6b7280] mt-1">
                                        Навес: {price.toLocaleString()} + Ворота: {gatePrice.toLocaleString()}
                                    </p>
                                )}
                                {onlyGates && (
                                    <p className="text-xs text-cyan-400 mt-1">Только ворота</p>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/20 px-2 py-1 rounded">
                                <TrendingDown size={14} />
                                <span>-{savings.toLocaleString()} ₽</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-[#6b7280] mt-2 text-center">Цена ориентировочная, точный расчёт после замера</p>
                    </div>
                    
                    {/* Чекбокс "Только ворота" - показываем только если ворота выбраны */}
                    {gateConfig.type !== GateType.None && (
                        <label className="flex items-center gap-3 mb-3 p-3 rounded-lg border border-[#3d4251] cursor-pointer hover:bg-[#252830] transition-colors">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                onlyGates ? 'bg-cyan-500 border-cyan-500' : 'bg-[#252830] border-[#4d5261]'
                            }`}>
                                {onlyGates && <Check className="w-3.5 h-3.5 text-[#0f1419]" />}
                            </div>
                            <span className="text-sm font-medium text-white">Без навеса (только ворота)</span>
                            <input type="checkbox" className="hidden" checked={onlyGates} onChange={(e) => setOnlyGates(e.target.checked)} />
                        </label>
                    )}
                    
                    <button
                        onClick={handleOrder}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOrder();
                        }}
                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-[#0f1419] font-bold py-4 px-6 rounded-xl shadow-lg flex justify-center items-center gap-3 active:scale-[0.98] transition-all"
                        style={{ touchAction: "manipulation" }}
                    >
                        <span>Оформить заявку</span>
                        <Send size={18} />
                    </button>
                </div>
            </div>

            {/* DESKTOP SIDEBAR */}
            <div
                className={`fixed inset-0 z-50 lg:static lg:z-auto transform transition-transform duration-500 ease-out ${isMobileMenuOpen ? "translate-y-0" : "translate-y-[100%] lg:translate-y-0"} lg:w-[460px] lg:min-w-[420px] flex-shrink-0 h-full shadow-2xl lg:shadow-none flex flex-col menu-container`}
            >
                {/* Mobile close button */}
                <div className="lg:hidden flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Настройки</h2>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 rounded-full transition-colors"
                        style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
                    >
                        <X size={20} />
                    </button>
                </div>
                
                {/* Desktop tabs */}
                <div className="hidden lg:flex border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <button
                        onClick={() => setActiveTab("carport")}
                        className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                            activeTab === "carport"
                                ? "border-b-2"
                                : ""
                        }`}
                        style={{
                            color: activeTab === "carport" ? 'var(--accent)' : 'var(--text-muted)',
                            borderColor: activeTab === "carport" ? 'var(--accent)' : 'transparent',
                            backgroundColor: activeTab === "carport" ? 'var(--accent-bg)' : 'transparent'
                        }}
                    >
                        <Home size={18} />
                        Навес
                    </button>
                    <button
                        onClick={() => setActiveTab("gate")}
                        className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                            activeTab === "gate"
                                ? "border-b-2"
                                : ""
                        }`}
                        style={{
                            color: activeTab === "gate" ? 'var(--accent)' : 'var(--text-muted)',
                            borderColor: activeTab === "gate" ? 'var(--accent)' : 'transparent',
                            backgroundColor: activeTab === "gate" ? 'var(--accent-bg)' : 'transparent'
                        }}
                    >
                        <Car size={18} />
                        Ворота
                        {gateConfig.type !== GateType.None && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                  style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent)' }}>
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
                                isDarkTheme={isDarkTheme}
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
                <div className="flex-shrink-0 p-6 border-t menu-container" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-medium line-through" style={{ color: 'var(--text-muted)', textDecorationColor: 'var(--text-muted)' }}>
                                    {oldPrice.toLocaleString()} ₽
                                </span>
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                    -20%
                                </span>
                            </div>
                            {installActive && (
                                <div className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                    <CheckCircle2 size={12} />
                                    с монтажом
                                </div>
                            )}
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-black leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                    {totalPrice.toLocaleString()} ₽
                                </p>
                                {!onlyGates && gatePrice > 0 && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                        Навес: {price.toLocaleString()} + Ворота: {gatePrice.toLocaleString()}
                                    </p>
                                )}
                                {onlyGates && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>Только ворота</p>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/20 px-2 py-1 rounded">
                                <TrendingDown size={14} />
                                <span>-{savings.toLocaleString()} ₽</span>
                            </div>
                        </div>
                        <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>Цена ориентировочная, точный расчёт после замера</p>
                    </div>
                    
                    {/* Чекбокс "Только ворота" - показываем только если ворота выбраны */}
                    {gateConfig.type !== GateType.None && (
                        <label className="menu-checkbox mb-3">
                            <span className="menu-text">Без навеса (только ворота)</span>
                            <div className={`menu-checkbox-box ${onlyGates ? 'checked' : ''}`}>
                                {onlyGates && <Check className="w-3.5 h-3.5" style={{ color: 'var(--bg-main)' }} />}
                            </div>
                            <input type="checkbox" className="hidden" checked={onlyGates} onChange={(e) => setOnlyGates(e.target.checked)} />
                        </label>
                    )}
                    
                    <button
                        onClick={handleOrder}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOrder();
                        }}
                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-[#0f1419] font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
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
                    className="bg-[#1e2128]/95 hover:bg-[#252830] text-[#9ca3af] font-medium py-2.5 px-4 rounded-xl shadow-lg border border-[#2d323d] flex items-center gap-2 transition-all active:scale-95 backdrop-blur-md"
                >
                    <Download size={16} className="text-cyan-400" />
                    <span className="text-sm">Экспорт</span>
                </button>
                <a
                    href="https://kovka007.ru/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#1e2128]/95 hover:bg-[#252830] text-[#9ca3af] font-medium py-2.5 px-4 rounded-xl shadow-lg border border-[#2d323d] flex items-center gap-2 transition-all active:scale-95 backdrop-blur-md no-underline"
                >
                    <Globe size={16} className="text-cyan-400" />
                    <span className="text-sm">Сайт</span>
                </a>
            </div>

            {/* Modals */}
            <BrowserOrderModal
                isOpen={showBrowserOrderModal}
                onClose={() => setShowBrowserOrderModal(false)}
                orderData={orderJson}
                price={totalPrice}
                config={config}
                gateConfig={gateConfig}
                onSuccess={handleOrderSuccess}
                onShowPrivacy={() => setShowPrivacyPolicy(true)}
                onShowTerms={() => setShowTermsOfUse(true)}
            />
            
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                config={config}
                price={totalPrice}
                gateConfig={gateConfig}
            />

            {/* Policy Pages */}
            {showPrivacyPolicy && <PrivacyPolicyPage onClose={() => setShowPrivacyPolicy(false)} />}
            {showTermsOfUse && <TermsOfUsePage onClose={() => setShowTermsOfUse(false)} />}
            {showOrderSuccess && <OrderSuccessScreen orderId={successOrderId} onClose={() => setShowOrderSuccess(false)} />}
        </div>
    );
}
