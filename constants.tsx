import { ColorOption, RoofType, RoofMaterial, PillarSize, PaintType } from './types';

export const ROOF_COLORS: ColorOption[] = [
  { name: 'Шоколад', hex: '#3B2F2F', ral: 'RAL 8017' },
  { name: 'Зеленый мох', hex: '#004D40', ral: 'RAL 6005' },
  { name: 'Красное вино', hex: '#7f1e2c', ral: 'RAL 3005' },
  { name: 'Графит', hex: '#374151', ral: 'RAL 7024' },
  { name: 'Сигнальный синий', hex: '#1e3a8a', ral: 'RAL 5005' },
  { name: 'Бронза (PC)', hex: '#634832', ral: 'Bronze' }, 
];

export const FRAME_COLORS: ColorOption[] = [
  { name: 'Черный', hex: '#1a1a1a', ral: 'RAL 9005' },
  { name: 'Серый', hex: '#4b5563', ral: 'RAL 7004' },
  { name: 'Белый', hex: '#f3f4f6', ral: 'RAL 9003' },
  { name: 'Шоколад', hex: '#3E2723', ral: 'RAL 8017' },
];

// Physical Dimensions (in meters)
export const SPECS = {
  trussThickness: 0.04, // 40mm profile
  trussHeightGable: 0.25, // Ratio of width
  trussHeightArch: 0.15, // Ratio of width
  trussHeightSingle: 0.15, // Slope rise ratio
  purlinSize: 0.04, // 40mm
  mauerlatHeight: 0.1, // 100mm beam
  postSpacing: 2.5, // Max distance between posts
};

// COMPETITIVE PRICING UPDATE
// Target: ~8000 RUB/m2 for small, ~7000 RUB/m2 for large projects (Turnkey)
export const PRICING = {
  // Base metal structure price depends on volume.
  // We use linear interpolation between smallArea and largeArea.
  baseStructure: {
    smallArea: 20,    // <= 20 m2
    largeArea: 80,    // >= 80 m2
    priceSmall: 3600, // RUB per sqm of floor area (Metal only)
    priceLarge: 2600, // RUB per sqm of floor area (Metal only)
  },
  
  // Cost per LINEAR METER of pillar height
  pillarMultiplier: {
    [PillarSize.Size60]: 600,  // per meter
    [PillarSize.Size80]: 950,  // per meter
    [PillarSize.Size100]: 1450, // per meter
  },

  roofMaterialPricePerSqm: {
    [RoofMaterial.Polycarbonate]: 850,
    [RoofMaterial.Decking]: 750,
    [RoofMaterial.MetalTile]: 1100,
  },

  roofTypeMultiplier: {
    [RoofType.SingleSlope]: 1.0,
    [RoofType.Triangular]: 1.05,
    [RoofType.Gable]: 1.15,
    [RoofType.Arched]: 1.25,
    [RoofType.SemiArched]: 1.35,
  },

  paintMultiplier: {
    [PaintType.None]: 0,
    [PaintType.Ral]: 350, // Per sqm
    [PaintType.Polymer]: 950,
  },

  extras: {
    trusses: 450, // per sqm reinforcement
    gutters: 1200, // per meter length
    sideWalls: 2500, // per sqm wall
    foundation: 5000, // per sqm
    installation: 0.30, // 30% of total
  }
};