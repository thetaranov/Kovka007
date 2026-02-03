/**
 * Глобальное хранилище состояния приложения
 * Использует Zustand для управления состоянием
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  CarportConfig, 
  RoofType, 
  PillarSize, 
  RoofMaterial, 
  PaintType,
  GateType,
  GateFilling,
  PriceBreakdown,
  LoadsInfo,
  InstallationType,
} from '../types';
import { GateConfig, calculateGatePrice } from '../types/gates';
import { FRAME_COLORS, ROOF_COLORS, PRICING } from '../constants';
import { calculateLoads, CITY_REGIONS, SNOW_REGIONS, WIND_REGIONS } from '../utils/snowWindLoad';

// Начальная конфигурация навеса
const INITIAL_CARPORT: CarportConfig = {
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
  region: 'Москва',
  snowRegion: 'IV',
  windRegion: 'III',
  terrain: 'B',
};

// Начальная конфигурация ворот
const INITIAL_GATE: GateConfig = {
  type: GateType.None,
  width: 4.0,
  height: 2.0,
  filling: GateFilling.Solid,
  frameColor: '#1a1a1a',
  panelColor: '#3E2723',
  hasWicket: false,
  hasAutomation: false,
  frameSize: '60x40',
  distanceFromCarport: 2.0,
  openDirection: 'left',
};

interface AppState {
  // Конфигурация
  carport: CarportConfig;
  gate: GateConfig;
  deliveryDistance: number;
  comment: string;
  
  // Вычисляемые значения
  price: PriceBreakdown;
  loads: LoadsInfo;
  
  // UI состояние
  isMobileMenuOpen: boolean;
  activeTab: 'carport' | 'gate' | 'summary';
  showOrderModal: boolean;
  isLoading: boolean;
  
  // Действия
  setCarport: (config: Partial<CarportConfig>) => void;
  setGate: (config: Partial<GateConfig>) => void;
  setDeliveryDistance: (km: number) => void;
  setComment: (text: string) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setActiveTab: (tab: 'carport' | 'gate' | 'summary') => void;
  setShowOrderModal: (show: boolean) => void;
  setRegion: (city: string) => void;
  resetConfig: () => void;
  
  // Вычисления
  recalculatePrice: () => void;
  recalculateLoads: () => void;
}

/**
 * Расчет рекомендуемого сечения столбов
 */
function getRecommendedPillarSize(
  width: number,
  length: number,
  height: number,
  loads?: LoadsInfo
): PillarSize {
  const area = width * length;
  const totalLoad = loads?.totalLoad || 300;
  
  // Учитываем нагрузку и пролет
  if (width > 8.0 || height > 3.5 || area > 60 || totalLoad > 400) {
    return PillarSize.Size120;
  }
  if (width > 6.0 || height > 3.0 || area > 40 || totalLoad > 300) {
    return PillarSize.Size100;
  }
  if (width > 4.5 || height > 2.5 || area > 25 || totalLoad > 200) {
    return PillarSize.Size80;
  }
  return PillarSize.Size60;
}

/**
 * Расчет стоимости навеса
 */
function calculateCarportPrice(config: CarportConfig): number {
  let materialCost = 0;
  const floorArea = config.width * config.length;

  const baseRate = PRICING.baseTrussStructure.base;
  const widthPenalty = Math.max(0, config.width - 4.5) * PRICING.baseTrussStructure.widthFactor;

  let volumeDiscount = 1.0;
  if (floorArea > 50) volumeDiscount = 0.95;
  if (floorArea > 100) volumeDiscount = 0.9;

  const trussCostPerSqm = (baseRate + widthPenalty) * volumeDiscount;
  materialCost += floorArea * trussCostPerSqm * PRICING.roofTypeMultiplier[config.roofType];

  // Столбы
  const maxSpan = 6.0;
  const numCols = Math.ceil(config.width / maxSpan) + 1;
  const postSpacing = 3.5;
  const numRows = Math.ceil(config.length / postSpacing) + 1;
  const pillarCount = numCols * numRows;
  const totalPillarHeight = pillarCount * config.height;

  materialCost += totalPillarHeight * PRICING.pillarMultiplier[config.pillarSize];

  // Кровля
  let roofAreaMultiplier = 1.1;
  if (config.roofType === RoofType.Gable) roofAreaMultiplier = 1.25;
  if (config.roofType === RoofType.Arched) roofAreaMultiplier = 1.3;
  if (config.roofType === RoofType.SemiArched) roofAreaMultiplier = 1.35;

  const roofArea = floorArea * roofAreaMultiplier;
  materialCost += roofArea * PRICING.roofMaterialPricePerSqm[config.roofMaterial];
  materialCost += floorArea * PRICING.paintMultiplier[config.paintType];

  // Опции
  if (config.hasTrusses) materialCost += floorArea * PRICING.extras.trusses;
  if (config.hasGutters) materialCost += config.length * 2 * PRICING.extras.gutters;
  if (config.hasSideWalls) {
    const wallArea = config.length * config.height + config.width * config.height;
    materialCost += wallArea * PRICING.extras.sideWalls;
  }
  const foundationEnabled = config.hasFoundation || config.installationType === InstallationType.FoundationPour;
  if (foundationEnabled) {
    materialCost += pillarCount * 4000;
  }

  let total = materialCost;
  
  // Монтаж
  const installActive = config.installationType !== InstallationType.None;
  if (installActive) {
    let installPercent = PRICING.extras.installation;
    if (materialCost > 300000) installPercent = 0.22;
    if (materialCost > 600000) installPercent = 0.2;
    if (config.height > 3.2) installPercent += PRICING.extras.highWork;
    total = total * (1 + installPercent);
  }

  // Минимальная цена
  const minTotal = floorArea * PRICING.minPricePerSqm;
  if (total < minTotal) total = minTotal;

  return Math.round(total / 100) * 100;
}

/**
 * Создание хранилища
 */
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Начальное состояние
      carport: INITIAL_CARPORT,
      gate: INITIAL_GATE,
      deliveryDistance: 0,
      comment: '',
      
      price: {
        materials: 0,
        metalwork: 0,
        roofing: 0,
        painting: 0,
        options: 0,
        installation: 0,
        delivery: 0,
        gate: 0,
        total: 0,
        pricePerSqm: 0,
      },
      
      loads: {
        snowLoad: 0,
        windLoad: 0,
        totalLoad: 0,
        recommended: {
          pillarSize: PillarSize.Size80,
          trussHeight: 0.35,
          purlinStep: 1.0,
        },
        warnings: [],
      },
      
      isMobileMenuOpen: false,
      activeTab: 'carport',
      showOrderModal: false,
      isLoading: false,
      
      // Действия
      setCarport: (config) => {
        set((state) => {
          const newCarport = { ...state.carport, ...config };
          
          // Автоподбор сечения столбов при изменении размеров
          if (config.width !== undefined || config.length !== undefined || config.height !== undefined) {
            const recommended = getRecommendedPillarSize(
              newCarport.width,
              newCarport.length,
              newCarport.height,
              state.loads
            );
            
            // Увеличиваем сечение если текущее меньше рекомендуемого
            const sizes = [PillarSize.Size60, PillarSize.Size80, PillarSize.Size100, PillarSize.Size120];
            const currentIdx = sizes.indexOf(newCarport.pillarSize);
            const recIdx = sizes.indexOf(recommended);
            
            if (recIdx > currentIdx) {
              newCarport.pillarSize = recommended;
            }
          }
          
          return { carport: newCarport };
        });
        
        // Пересчитываем после обновления
        setTimeout(() => {
          get().recalculateLoads();
          get().recalculatePrice();
        }, 0);
      },
      
      setGate: (config) => {
        set((state) => ({ gate: { ...state.gate, ...config } }));
        setTimeout(() => get().recalculatePrice(), 0);
      },
      
      setDeliveryDistance: (km) => {
        set({ deliveryDistance: km });
        setTimeout(() => get().recalculatePrice(), 0);
      },
      
      setComment: (text) => set({ comment: text }),
      
      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      setShowOrderModal: (show) => set({ showOrderModal: show }),
      
      setRegion: (city) => {
        const regions = CITY_REGIONS[city];
        if (regions) {
          set((state) => ({
            carport: {
              ...state.carport,
              region: city,
              snowRegion: regions.snow,
              windRegion: regions.wind,
            }
          }));
          setTimeout(() => {
            get().recalculateLoads();
            get().recalculatePrice();
          }, 0);
        }
      },
      
      resetConfig: () => {
        set({
          carport: INITIAL_CARPORT,
          gate: INITIAL_GATE,
          deliveryDistance: 0,
          comment: '',
        });
        setTimeout(() => {
          get().recalculateLoads();
          get().recalculatePrice();
        }, 0);
      },
      
      recalculatePrice: () => {
        const state = get();
        const { carport, gate, deliveryDistance } = state;
        
        const carportPrice = calculateCarportPrice(carport);
        const gatePrice = calculateGatePrice(gate);
        
        const floorArea = carport.width * carport.length;
        
        // Доставка
        let delivery = 5000; // базовая
        if (deliveryDistance > 30) {
          delivery += (deliveryDistance - 30) * 50;
        }
        
        const total = carportPrice + gatePrice + delivery;
        
        set({
          price: {
            materials: Math.round(carportPrice * 0.5),
            metalwork: Math.round(carportPrice * 0.25),
            roofing: Math.round(carportPrice * 0.15),
            painting: Math.round(carportPrice * 0.05),
            options: Math.round(carportPrice * 0.05),
            installation: carport.installationType !== InstallationType.None ? Math.round(carportPrice * 0.2) : 0,
            delivery,
            gate: gatePrice,
            total,
            pricePerSqm: Math.round(carportPrice / floorArea),
          }
        });
      },
      
      recalculateLoads: () => {
        const { carport } = get();
        
        try {
          const result = calculateLoads({
            snowRegion: carport.snowRegion || 'IV',
            windRegion: carport.windRegion || 'III',
            terrain: carport.terrain || 'B',
            buildingHeight: carport.height,
            roofAngle: carport.roofSlope,
            roofType: carport.roofType,
            roofWidth: carport.width,
            roofLength: carport.length,
          });
          
          set({
            loads: {
              snowLoad: result.snowCalculated,
              windLoad: result.windCalculated,
              totalLoad: result.totalVerticalLoad,
              recommended: {
                pillarSize: result.recommendedPillarSize as PillarSize,
                trussHeight: result.recommendedTrussHeight,
                purlinStep: result.recommendedPurlinStep,
              },
              warnings: result.warnings,
            }
          });
        } catch (e) {
          console.error('Error calculating loads:', e);
        }
      },
    }),
    {
      name: 'kovka007-config',
      partialize: (state) => ({
        carport: state.carport,
        gate: state.gate,
        deliveryDistance: state.deliveryDistance,
      }),
    }
  )
);

// Инициализация при загрузке
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const store = useStore.getState();
    store.recalculateLoads();
    store.recalculatePrice();
  }, 100);
}
