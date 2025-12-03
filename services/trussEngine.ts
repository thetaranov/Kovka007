
import { 
  CarportConfig, 
  RoofType, 
  TrussGeometry, 
  ElementSections, 
  LoadAnalysis, 
  BillOfMaterials, 
  Profile,
  CalculationResult 
} from "../types";
import { PROFILES, SPECS, SNOW_REGIONS, WIND_REGIONS } from "../constants";

// Helper to find profile by name or size criteria
const findProfile = (minH: number, minT: number = 2): Profile => {
  // Sort by weight ascending to optimize cost
  const sorted = [...PROFILES].sort((a, b) => a.weight - b.weight);
  const found = sorted.find(p => p.h >= minH && p.t >= minT);
  return found || sorted[sorted.length - 1];
};

const getSnowLoad = (regionId: number, slope: number): number => {
  const region = SNOW_REGIONS.find(r => r.id === regionId);
  const Sg = region ? region.val : 1.5;
  // Mu coefficient based on slope (SP 20.13330)
  // For gable/single < 30 deg, mu = 1.
  // For arched, simplified mu = 1.0 for conservative est.
  let mu = 1.0;
  if (slope > 60) mu = 0;
  else if (slope > 30) mu = (60 - slope) / 30;
  
  return Sg * mu * 1.4; // 1.4 safety factor
};

const getWindLoad = (regionId: number, height: number): number => {
  const region = WIND_REGIONS.find(r => r.id === regionId);
  const W0 = region ? region.val : 0.23;
  // k coefficient for height <= 5m type B terrain
  const k = 0.5; 
  return W0 * k * 1.4; // 1.4 safety factor
};

export const calculateTrussPhysics = (config: CarportConfig): CalculationResult => {
  const warnings: string[] = [];
  
  // 1. Loads
  const spacing = SPECS.postSpacing; // Load width per truss
  const snowP = getSnowLoad(config.snowRegion, config.roofSlope);
  const windP = getWindLoad(config.windRegion, config.height);
  const deadP = config.roofMaterial === 'metaltile' ? 0.05 : 0.02; // kN/m2 (light roof)
  
  const totalLoadArea = (snowP + deadP); // kN/m2
  const q_lin = totalLoadArea * spacing; // kN/m on the truss
  
  // 2. Geometry Generation
  const span = config.width;
  // Textbook optimal height: 1/7 to 1/12 of span. Let's aim for 1/8 to 1/10.
  let trussHeight = span / 8;
  if (config.roofType === 'single') trussHeight = span * Math.tan(config.roofSlope * Math.PI / 180);
  if (config.roofType === 'gable') trussHeight = (span / 2) * Math.tan(config.roofSlope * Math.PI / 180);
  
  // Minimum truss height for stiffness (0.4m)
  if (trussHeight < 0.4 && config.roofType !== 'single') trussHeight = 0.4;

  const panelCount = Math.ceil(span / 1.5); // Panel approx 1.5m
  const panelLength = span / panelCount;
  
  const nodes: {x: number, y: number}[] = [];
  const elements: {from: number, to: number, type: 'topChord' | 'bottomChord' | 'web' | 'pillar', length: number}[] = [];
  
  // Generate Nodes & Elements based on type
  // Simplified Pratt/Warren style for Gable/Parallel
  
  // Bottom nodes
  for(let i=0; i<=panelCount; i++) {
    nodes.push({ x: i * panelLength, y: 0 });
  }
  const bottomOffset = 0;
  
  // Top nodes
  for(let i=0; i<=panelCount; i++) {
    const x = i * panelLength;
    let y = trussHeight; // Default parallel
    if (config.roofType === 'gable') {
      y = (span/2 - Math.abs(x - span/2)) * Math.tan(config.roofSlope * Math.PI / 180);
      if (y < 0.3) y = 0.3; // min height at eaves
    } else if (config.roofType === 'arched') {
      // Circle equation approximation
      const rise = config.width * 0.15;
      const radius = (span*span + 4*rise*rise)/(8*rise);
      const centerX = span/2;
      const centerY = - (radius - rise);
      const dx = x - centerX;
      y = Math.sqrt(radius*radius - dx*dx) + centerY;
    } else if (config.roofType === 'single') {
        y = 0.4 + x * Math.tan(config.roofSlope * Math.PI / 180);
    }
    nodes.push({ x, y });
  }
  const topOffset = panelCount + 1;

  // Create Chords
  for(let i=0; i<panelCount; i++) {
    // Bottom
    elements.push({ 
        from: i, to: i+1, type: 'bottomChord', 
        length: panelLength 
    });
    // Top
    const l = Math.sqrt(Math.pow(nodes[topOffset+i+1].x - nodes[topOffset+i].x, 2) + Math.pow(nodes[topOffset+i+1].y - nodes[topOffset+i].y, 2));
    elements.push({ 
        from: topOffset+i, to: topOffset+i+1, type: 'topChord', 
        length: l
    });
  }

  // Webs (Zig-zag)
  for(let i=0; i<=panelCount; i++) {
    // Verticals
    const vLen = nodes[topOffset+i].y - nodes[i].y;
    elements.push({ from: i, to: topOffset+i, type: 'web', length: vLen });
    
    // Diagonals
    if (i < panelCount) {
        const dLen = Math.sqrt(Math.pow(nodes[topOffset+i+1].x - nodes[i].x, 2) + Math.pow(nodes[topOffset+i+1].y - nodes[i].y, 2));
        elements.push({ from: i, to: topOffset+i+1, type: 'web', length: dLen });
    }
  }

  // 3. Statics (Simplified Beam Approximation for Chords + Shear for Webs)
  // M_max = q * L^2 / 8
  const M_max = q_lin * span * span / 8;
  const Q_max = q_lin * span / 2;
  
  // Internal forces estimation (Method of sections approx)
  // h_eff approx 0.9 * height for variable trusses
  const h_eff = config.roofType === 'gable' ? trussHeight * 0.6 : trussHeight * 0.9; 
  
  const N_chord = M_max / h_eff; // Tension bottom, Compression top
  const N_web = Q_max / Math.sin(45 * Math.PI / 180); // Rough check for end diagonals

  // 4. Section Selection (SP 16.13330)
  // Steel C245 Ry = 24 kN/cm2 = 240 MPa
  const Ry = 24.0; // kN/cm2
  const gammaC = 1.0;
  
  // Bottom Chord (Tension): N / An <= Ry
  // Required Area
  const A_req_bottom = N_chord / (Ry * gammaC); // cm2
  
  // Top Chord (Compression): N / (phi * A) <= Ry
  // Assume phi ~ 0.5 for initial pick
  const A_req_top = N_chord / (0.5 * Ry * gammaC); // cm2
  
  const bottomProfile = PROFILES.find(p => p.A >= A_req_bottom && p.h >= 60) || PROFILES[PROFILES.length-1];
  const topProfile = PROFILES.find(p => p.A >= A_req_top && p.h >= 60) || PROFILES[PROFILES.length-1];
  const webProfile = findProfile(40, 2); // Minimum constructible
  
  // Pillars
  // Load on pillar = Q_max
  const N_pillar = Q_max;
  const pillarH = config.height;
  // Check stability. lambda = L_eff / i. 
  // Select min size based on UI config first, then verify.
  let pillarProfile = findProfile(60, 3);
  if (config.pillarSize === '80x80') pillarProfile = findProfile(80, 3);
  if (config.pillarSize === '100x100') pillarProfile = findProfile(100, 4);

  // Check pillar stability
  const lambda = (pillarH * 100 * 2) / pillarProfile.i_x; // mu=2 for cantilever
  // if lambda > 120 -> warning
  if (lambda > 150) warnings.push("Гибкость колонны слишком велика. Увеличьте сечение.");

  const sections: ElementSections = {
    topChord: topProfile,
    bottomChord: bottomProfile,
    web: webProfile,
    pillar: pillarProfile,
    purlin: findProfile(40, 2)
  };

  // 5. BOM Generation
  const items = [];
  const totalLengthTop = elements.filter(e => e.type === 'topChord').reduce((s, e) => s + e.length, 0);
  items.push({ name: "Верхний пояс", profile: topProfile.name, length: totalLengthTop, quantity: 1, weight: totalLengthTop * topProfile.weight });
  
  const totalLengthBot = elements.filter(e => e.type === 'bottomChord').reduce((s, e) => s + e.length, 0);
  items.push({ name: "Нижний пояс", profile: bottomProfile.name, length: totalLengthBot, quantity: 1, weight: totalLengthBot * bottomProfile.weight });
  
  const totalLengthWeb = elements.filter(e => e.type === 'web').reduce((s, e) => s + e.length, 0);
  items.push({ name: "Решетка", profile: webProfile.name, length: totalLengthWeb, quantity: 1, weight: totalLengthWeb * webProfile.weight });

  // Add Pillars
  const numPillars = (Math.ceil(config.length / SPECS.postSpacing) + 1) * 2;
  items.push({ name: "Стойки", profile: pillarProfile.name, length: config.height, quantity: numPillars, weight: config.height * numPillars * pillarProfile.weight });

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const metalPrice = 120; // RUB/kg
  const totalCost = Math.ceil(totalWeight * metalPrice);

  // 6. DXF Content
  const dxf = generateDXF(nodes, elements);

  return {
    success: true,
    geometry: { span, height: trussHeight, panelCount, panelLength, nodes, elements },
    sections,
    loads: {
      snowLoad: snowP,
      windLoad: windP,
      deadLoad: deadP,
      totalLinearLoad: q_lin,
      maxMoment: M_max,
      maxShear: Q_max,
      maxAxialTop: N_chord,
      maxAxialBottom: N_chord,
      maxAxialWeb: N_web,
      utilization: {
        top: Math.min(100, (A_req_top / topProfile.A) * 100),
        bottom: Math.min(100, (A_req_bottom / bottomProfile.A) * 100),
        web: 50,
        pillar: 40
      }
    },
    dxfContent: dxf,
    bom: { items, totalWeight, totalCost },
    warnings
  };
};

const generateDXF = (nodes: any[], elements: any[]): string => {
  let s = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1009
0
ENDSEC
0
SECTION
2
ENTITIES
`;
  
  elements.forEach(e => {
    const n1 = nodes[e.from];
    const n2 = nodes[e.to];
    s += `0
LINE
8
0
10
${n1.x}
20
${n1.y}
30
0.0
11
${n2.x}
21
${n2.y}
31
0.0
`;
  });

  s += `0
ENDSEC
0
EOF`;
  return s;
};
