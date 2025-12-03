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

const findProfile = (minA: number, minH: number = 40): Profile => {
  const sorted = [...PROFILES].sort((a, b) => a.weight - b.weight);
  const found = sorted.find(p => p.A >= minA && p.h >= minH);
  return found || sorted[sorted.length - 1];
};

const getSnowLoad = (regionId: number, slope: number): number => {
  const region = SNOW_REGIONS.find(r => r.id === regionId);
  const Sg = region ? region.val : 1.5;
  let mu = 1.0;
  if (slope > 60) mu = 0;
  else if (slope > 30) mu = (60 - slope) / 30;
  return Sg * mu * 1.4;
};

const getWindLoad = (regionId: number, height: number): number => {
  const region = WIND_REGIONS.find(r => r.id === regionId);
  const W0 = region ? region.val : 0.23;
  const k = 0.5; 
  return W0 * k * 1.4;
};

export const calculateTrussPhysics = (config: CarportConfig): CalculationResult => {
  const warnings: string[] = [];

  const spacing = SPECS.postSpacing;
  const snowP = getSnowLoad(config.snowRegion, config.roofSlope);
  const windP = getWindLoad(config.windRegion, config.height);
  const deadP = config.roofMaterial === 'metaltile' ? 0.05 : 0.02;

  const totalLoadArea = (snowP + deadP);
  const q_lin = totalLoadArea * spacing;

  const span = config.width;
  let trussHeight = 0;

  const panelCount = Math.max(4, Math.ceil(span / 1.5) * 2); 
  const panelLength = span / panelCount;

  const nodes: {x: number, y: number}[] = [];
  const elements: {from: number, to: number, type: 'topChord' | 'bottomChord' | 'web' | 'pillar', length: number}[] = [];

  for(let i=0; i<=panelCount; i++) {
    nodes.push({ x: i * panelLength, y: 0 });
  }
  const topOffset = panelCount + 1;

  for(let i=0; i<=panelCount; i++) {
    const x = i * panelLength;
    let y = 0;

    switch(config.roofType) {
        case RoofType.Gable:
            trussHeight = (span / 2) * Math.tan(config.roofSlope * Math.PI / 180);
            y = (span/2 - Math.abs(x - span/2)) * Math.tan(config.roofSlope * Math.PI / 180);
            if (i === 0 || i === panelCount) y = 0.1; // Небольшой подъем на краю
            break;
        case RoofType.SingleSlope:
        case RoofType.Triangular:
            trussHeight = span * Math.tan(config.roofSlope * Math.PI / 180);
            y = 0.35 + x * Math.tan(config.roofSlope * Math.PI / 180);
            break;
        case RoofType.Arched:
            const rise = span * SPECS.trussHeightArch;
            trussHeight = rise;
            const radius = (span*span + 4*rise*rise)/(8*rise);
            const centerY = -(radius - rise);
            y = Math.sqrt(Math.max(0, radius*radius - Math.pow(x - span/2, 2))) + centerY;
            break;
        default:
            trussHeight = span / 8;
            y = trussHeight;
    }
    nodes.push({ x, y });
  }

  if (trussHeight < 0.4) {
    trussHeight = 0.4;
    warnings.push("Недостаточная высота фермы, увеличена до минимума (0.4м).");
  }

  for(let i=0; i<panelCount; i++) {
    const l_bottom = Math.hypot(nodes[i+1].x - nodes[i].x, nodes[i+1].y - nodes[i].y);
    elements.push({ from: i, to: i+1, type: 'bottomChord', length: l_bottom });

    const l_top = Math.hypot(nodes[topOffset+i+1].x - nodes[topOffset+i].x, nodes[topOffset+i+1].y - nodes[topOffset+i].y);
    elements.push({ from: topOffset+i, to: topOffset+i+1, type: 'topChord', length: l_top });
  }

  for(let i=0; i<=panelCount; i++) {
    if (i > 0 && i < panelCount) {
        const vLen = Math.hypot(nodes[topOffset+i].x - nodes[i].x, nodes[topOffset+i].y - nodes[i].y);
        elements.push({ from: i, to: topOffset+i, type: 'web', length: vLen });
    }
    if (i < panelCount) {
      if (i % 2 === 0) {
        const dLen = Math.hypot(nodes[topOffset+i].x - nodes[i+1].x, nodes[topOffset+i].y - nodes[i+1].y);
        elements.push({ from: topOffset+i, to: i+1, type: 'web', length: dLen });
      } else {
        const dLen = Math.hypot(nodes[topOffset+i+1].x - nodes[i].x, nodes[topOffset+i+1].y - nodes[i].y);
        elements.push({ from: topOffset+i+1, to: i, type: 'web', length: dLen });
      }
    }
  }

  const M_max = q_lin * span * span / 8;
  const Q_max = q_lin * span / 2;
  const h_eff = trussHeight * 0.9;
  const N_chord = M_max / (h_eff > 0 ? h_eff : 0.4);
  const N_web = Q_max / Math.sin(45 * Math.PI / 180);

  const Ry = 24.0;
  const gammaC = 1.0;
  const A_req_bottom = N_chord / (Ry * gammaC);
  const A_req_top = N_chord / (0.5 * Ry * gammaC);

  const bottomProfile = findProfile(A_req_bottom, 40);
  const topProfile = findProfile(A_req_top, 40);
  const webProfile = findProfile(2.92, 40);

  let pillarProfile = findProfile(6.61, 60);
  if (config.pillarSize === PillarSize.Size80) pillarProfile = findProfile(9.01, 80);
  if (config.pillarSize === PillarSize.Size100) pillarProfile = findProfile(14.95, 100);

  const lambda = (config.height * 100 * 2) / pillarProfile.i_x;
  if (lambda > 150) warnings.push("Гибкость колонны слишком велика. Увеличьте сечение.");

  const sections: ElementSections = { topChord: topProfile, bottomChord: bottomProfile, web: webProfile, pillar: pillarProfile, purlin: findProfile(2.92, 40) };

  const items: BillOfMaterials['items'] = [];
  const totalLengthTop = elements.filter(e => e.type === 'topChord').reduce((s, e) => s + e.length, 0);
  items.push({ name: "Верхний пояс", profile: topProfile.name, length: totalLengthTop, quantity: 1, weight: totalLengthTop * topProfile.weight });
  const totalLengthBot = elements.filter(e => e.type === 'bottomChord').reduce((s, e) => s + e.length, 0);
  items.push({ name: "Нижний пояс", profile: bottomProfile.name, length: totalLengthBot, quantity: 1, weight: totalLengthBot * bottomProfile.weight });
  const totalLengthWeb = elements.filter(e => e.type === 'web').reduce((s, e) => s + e.length, 0);
  items.push({ name: "Решетка", profile: webProfile.name, length: totalLengthWeb, quantity: 1, weight: totalLengthWeb * webProfile.weight });

  const numPillars = (Math.ceil(config.length / SPECS.postSpacing) + 1) * 2;
  const pillarWeight = config.height * pillarProfile.weight;
  items.push({ name: "Стойки", profile: pillarProfile.name, length: config.height, quantity: numPillars, weight: pillarWeight * numPillars });

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const totalCost = Math.ceil(totalWeight * 120);
  const dxf = generateDXF(nodes, elements);

  return {
    success: true,
    geometry: { span, height: trussHeight, panelCount, panelLength, nodes, elements },
    sections,
    loads: {
      snowLoad: snowP, windLoad: windP, deadLoad: deadP, totalLinearLoad: q_lin, maxMoment: M_max, maxShear: Q_max, maxAxialTop: N_chord, maxAxialBottom: N_chord, maxAxialWeb: N_web,
      utilization: { top: Math.min(100, (A_req_top / topProfile.A) * 100), bottom: Math.min(100, (A_req_bottom / bottomProfile.A) * 100), web: 50, pillar: 40 }
    },
    dxfContent: dxf,
    bom: { items, totalWeight: Math.round(totalWeight), totalCost },
    warnings
  };
};

const generateDXF = (nodes: any[], elements: any[]): string => {
  let s = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
  elements.forEach(e => {
    const n1 = nodes[e.from];
    const n2 = nodes[e.to];
    s += `0\nLINE\n8\n0\n10\n${n1.x}\n20\n${n1.y}\n30\n0.0\n11\n${n2.x}\n21\n${n2.y}\n31\n0.0\n`;
  });
  s += `0\nENDSEC\n0\nEOF`;
  return s;
};