import type {
  BusinessArchetype,
  CompetitorNode,
  TransitAnchor,
  ViabilityResult,
  RecommendedZone,
  TaggedVendor,
} from './types';
import {
  BUSINESS_ARCHETYPES,
  generateAnchorsAround,
  generateCompetitorsAround,
  PHILIPPINE_METRO_HUBS,
} from './data/spots';
import { getAllDemandHotspots } from './data/hotspots';

// Haversine distance in meters
export function calculateDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// ---- Model constants per CLAUDE.md §4.1 ------------------------------------
const BETA = 1.7;              // distance-decay exponent
const MIN_DIST_M = 35;         // floor to avoid infinite pull at ~0m
const DIST_UNIT_M = 50;        // distances are measured in 50m units
const OUTSIDE_OPTION_M = 135;  // "walk past / buy elsewhere" baseline
const SATURATION_K = 0.85;     // calibrated so scores spread naturally (55..95)
const MIN_SCORE = 15;          // UI floor so nothing shows as 0

// Huff-style attraction of a site as seen from a customer origin at distanceM.
function attraction(distanceM: number, strength = 1): number {
  const d = Math.max(distanceM, MIN_DIST_M) / DIST_UNIT_M;
  return strength / Math.pow(d, BETA);
}

/**
 * Product-specific affinity multiplier for each transit/demand anchor type.
 */
export function getProductAnchorAffinity(
  productType: string,
  anchorType: TransitAnchor['type']
): number {
  const norm = productType.toLowerCase();
  if (norm.includes('taho')) {
    if (anchorType === 'school') return 1.28;
    if (anchorType === 'tricycle') return 1.16;
    if (anchorType === 'train') return 1.06;
    return 1.0;
  }
  if (norm.includes('siomai')) {
    if (anchorType === 'train') return 1.28;
    if (anchorType === 'jeepney') return 1.24;
    if (anchorType === 'school') return 1.14;
    return 0.92;
  }
  if (norm.includes('balut') || norm.includes('balot')) {
    if (anchorType === 'tricycle') return 1.34;
    if (anchorType === 'jeepney') return 1.22;
    if (anchorType === 'train') return 1.12;
    return 0.72;
  }
  if (anchorType === 'school') return 1.20;
  if (anchorType === 'train') return 1.15;
  return 1.05;
}

/**
 * Dense, multi-tier real-world transit, school, market, and barangay anchors
 * pinned to exact geographic coordinates across Metro Manila.
 */
export const WIDE_DISTRICT_ANCHORS: TransitAnchor[] = [
  // Sampaloc / UST / University Belt (Dense Street-Level Network)
  { id: 'wd-ust-dapitan', name: 'UST Dapitan Gate & Asturias Strip', type: 'school', lat: 14.6118, lng: 120.9882, weight: 1.18 },
  { id: 'wd-ust-noval', name: 'UST P. Noval Gate & Dorm Corridor', type: 'school', lat: 14.6075, lng: 120.9873, weight: 1.10 },
  { id: 'wd-ust-lacson', name: 'UST Hospital & Lacson Jeepney Bay', type: 'jeepney', lat: 14.6108, lng: 120.9926, weight: 1.02 },
  { id: 'wd-espana-main', name: 'España Blvd / Cayco Footbridge', type: 'jeepney', lat: 14.6091, lng: 120.9898, weight: 1.14 },
  { id: 'wd-espana-vicente', name: 'España & Vicente Cruz Jeepney Stop', type: 'jeepney', lat: 14.6109, lng: 120.9952, weight: 0.96 },
  { id: 'wd-pnr-espana', name: 'PNR España Station & Antipolo Crossing', type: 'train', lat: 14.6124, lng: 120.9942, weight: 1.18 },
  { id: 'wd-feu-morayta', name: 'FEU Morayta / Nicanor Reyes Belt', type: 'school', lat: 14.6041, lng: 120.9866, weight: 1.22 },
  { id: 'wd-prc-morayta', name: 'PRC Morayta & Paredes Review Center Strip', type: 'school', lat: 14.6060, lng: 120.9855, weight: 1.08 },
  { id: 'wd-ue-recto', name: 'UE Recto Gate & Mendiola Crossing', type: 'school', lat: 14.6018, lng: 120.9895, weight: 1.14 },
  { id: 'wd-san-sebastian', name: 'San Sebastian & Plaza del Carmen', type: 'school', lat: 14.5996, lng: 120.9890, weight: 0.92 },
  { id: 'wd-lrt-legarda', name: 'LRT-2 Legarda Station & Bustillos', type: 'train', lat: 14.6010, lng: 120.9925, weight: 1.25 },
  { id: 'wd-lardizabal', name: 'Lardizabal Market & M. Dela Fuente TODA', type: 'tricycle', lat: 14.6032, lng: 120.9978, weight: 0.95 },
  { id: 'wd-trabajo-market', name: 'Trabajo Public Market & Loyola TODA', type: 'tricycle', lat: 14.6062, lng: 120.9965, weight: 1.04 },
  { id: 'wd-balic-balic', name: 'Balic-Balic / G. Tuazon & Calabash Road', type: 'jeepney', lat: 14.6095, lng: 121.0018, weight: 0.98 },
  { id: 'wd-laon-laan', name: 'Laon Laan & Dimasalang Junction', type: 'jeepney', lat: 14.6148, lng: 120.9915, weight: 1.00 },
  { id: 'wd-dangwa-flower', name: 'Dangwa Flower Market & Dos Castillas', type: 'jeepney', lat: 14.6135, lng: 120.9892, weight: 1.06 },
  { id: 'wd-maceda-pnr', name: 'Maceda PNR & España Terminal', type: 'tricycle', lat: 14.6152, lng: 120.9972, weight: 1.02 },
  { id: 'wd-blumentritt-ext', name: 'Blumentritt Ext. & Retiro Food Strip', type: 'jeepney', lat: 14.6215, lng: 120.9955, weight: 1.04 },

  // Santa Cruz / Quiapo / Binondo / Tondo / Divisoria
  { id: 'wd-quiapo-plaza', name: 'Quiapo Church & Carriedo Terminal', type: 'train', lat: 14.5986, lng: 120.9838, weight: 1.28 },
  { id: 'wd-raon-gonzalo', name: 'Raon / Gonzalo Puyat & Avenida Strip', type: 'jeepney', lat: 14.6015, lng: 120.9830, weight: 1.08 },
  { id: 'wd-lrt-recto', name: 'LRT-1 Doroteo Jose & LRT-2 Recto Hub', type: 'train', lat: 14.6054, lng: 120.9822, weight: 1.25 },
  { id: 'wd-arranque-mkt', name: 'Arranque Market & Alonzo Corridor', type: 'jeepney', lat: 14.6038, lng: 120.9795, weight: 0.98 },
  { id: 'wd-bambang-lrt', name: 'LRT-1 Bambang Station Medical Strip', type: 'train', lat: 14.6080, lng: 120.9800, weight: 1.04 },
  { id: 'wd-fugoso-ust', name: 'Fugoso & Oroquieta Barangay Court', type: 'tricycle', lat: 14.6112, lng: 120.9825, weight: 0.90 },
  { id: 'wd-tayuman-sm', name: 'LRT-1 Tayuman & SM San Lazaro Hub', type: 'train', lat: 14.6163, lng: 120.9828, weight: 1.18 },
  { id: 'wd-san-lazaro-hosp', name: 'San Lazaro Hospital & Quiricada Gate', type: 'school', lat: 14.6138, lng: 120.9812, weight: 0.98 },
  { id: 'wd-blumentritt', name: 'LRT-1 Blumentritt & Public Market', type: 'train', lat: 14.6226, lng: 120.9829, weight: 1.22 },
  { id: 'wd-chinese-gen', name: 'Chinese General Hospital & Blumentritt', type: 'school', lat: 14.6245, lng: 120.9878, weight: 1.00 },
  { id: 'wd-abad-santos', name: 'LRT-1 Abad Santos & Manuguit Junction', type: 'train', lat: 14.6305, lng: 120.9814, weight: 1.06 },
  { id: 'wd-tutuban-divi', name: 'Tutuban PNR & Divisoria Mall Terminal', type: 'train', lat: 14.6092, lng: 120.9732, weight: 1.26 },
  { id: 'wd-168-divisoria', name: '168 / 999 Mall & Reina Regente Jeep Hub', type: 'jeepney', lat: 14.6048, lng: 120.9742, weight: 1.20 },
  { id: 'wd-binondo-church', name: 'Binondo Church / Ongpin & Quintin Paredes', type: 'jeepney', lat: 14.6002, lng: 120.9748, weight: 1.10 },
  { id: 'wd-pritil-market', name: 'Pritil Public Market & Tayuman Tondo', type: 'tricycle', lat: 14.6178, lng: 120.9695, weight: 1.06 },
  { id: 'wd-ugbo-tondo', name: 'Ugbo Street Food Strip & Velasquez Tondo', type: 'tricycle', lat: 14.6235, lng: 120.9648, weight: 1.14 },
  { id: 'wd-gagalangin', name: 'Gagalangin Juan Luna & Pampanga TODA', type: 'jeepney', lat: 14.6268, lng: 120.9735, weight: 1.02 },
  { id: 'wd-moriones-tondo', name: 'Moriones Plaza & Tondo Church Hub', type: 'tricycle', lat: 14.6125, lng: 120.9675, weight: 1.04 },

  // Sta. Mesa / San Miguel / Paco / Ermita / Malate / Intramuros
  { id: 'wd-pureza-pup', name: 'LRT-2 Pureza & PUP Sta. Mesa Gate', type: 'school', lat: 14.6017, lng: 121.0052, weight: 1.20 },
  { id: 'wd-stop-and-shop', name: 'Stop & Shop Teresa PUP Jeepney Terminal', type: 'jeepney', lat: 14.5992, lng: 121.0108, weight: 1.16 },
  { id: 'wd-v-mapa-lrt', name: 'LRT-2 V. Mapa & SM Sta. Mesa Hub', type: 'train', lat: 14.6042, lng: 121.0172, weight: 1.18 },
  { id: 'wd-intramuros-plm', name: 'Intramuros PLM / Mapua & Lyceum Gate', type: 'school', lat: 14.5915, lng: 120.9772, weight: 1.16 },
  { id: 'wd-lrt-central', name: 'LRT-1 Central Terminal & Arroceros', type: 'train', lat: 14.5928, lng: 120.9816, weight: 1.24 },
  { id: 'wd-lrt-un-ave', name: 'LRT-1 UN Avenue & NBI / Times Plaza', type: 'train', lat: 14.5826, lng: 120.9846, weight: 1.16 },
  { id: 'wd-lrt-pedro-gil', name: 'LRT-1 Pedro Gil & UP Manila / PGH Gate', type: 'school', lat: 14.5766, lng: 120.9882, weight: 1.24 },
  { id: 'wd-paco-market', name: 'Paco Public Market & Pedro Gil Bridge', type: 'jeepney', lat: 14.5788, lng: 120.9965, weight: 1.10 },
  { id: 'wd-lrt-quirino', name: 'LRT-1 Quirino & San Andres Market', type: 'train', lat: 14.5703, lng: 120.9916, weight: 1.12 },
  { id: 'wd-dlsu-vito-cruz', name: 'LRT-1 Vito Cruz & DLSU Taft Corridor', type: 'school', lat: 14.5636, lng: 120.9948, weight: 1.24 },

  // Welcome Rotonda / Quezon Ave / Banawe / Del Monte
  { id: 'wd-welcome-rotonda', name: 'Welcome Rotonda Quezon Ave Hub', type: 'jeepney', lat: 14.6177, lng: 121.0006, weight: 1.20 },
  { id: 'wd-kanlaon-toda', name: 'Kanlaon & Mayon TODA Terminal', type: 'tricycle', lat: 14.6205, lng: 120.9992, weight: 0.96 },
  { id: 'wd-retiro-amoranto', name: 'Retiro / N.S. Amoranto & Mayon Crossing', type: 'jeepney', lat: 14.6258, lng: 120.9995, weight: 1.04 },
  { id: 'wd-banawe-qave', name: 'Banawe St. & Quezon Ave Crossing', type: 'jeepney', lat: 14.6238, lng: 121.0062, weight: 1.06 },
  { id: 'wd-galas-market', name: 'Galas Public Market & Unang Hakbang', type: 'tricycle', lat: 14.6135, lng: 121.0058, weight: 1.00 },
  { id: 'wd-araneta-qave', name: 'G. Araneta Ave & Quezon Ave Sanctuarium', type: 'jeepney', lat: 14.6275, lng: 121.0128, weight: 1.02 },
  { id: 'wd-del-monte-banawe', name: 'Del Monte Ave & Banawe Siena Corridor', type: 'school', lat: 14.6348, lng: 121.0068, weight: 1.04 },
  { id: 'wd-frisco-market', name: 'Frisco Market & Roosevelt Ave Jeep Hub', type: 'jeepney', lat: 14.6422, lng: 121.0165, weight: 1.10 },
  { id: 'wd-st-lukes', name: 'E. Rodriguez Sr. Medical Corridor', type: 'school', lat: 14.6225, lng: 121.0230, weight: 1.08 },
  { id: 'wd-fisher-mall', name: 'Pantranco / Fisher Mall Q. Ave Hub', type: 'jeepney', lat: 14.6335, lng: 121.0195, weight: 1.14 },
  { id: 'wd-timog-tomas', name: 'Timog & Tomas Morato Boy Scout Circle', type: 'tricycle', lat: 14.6352, lng: 121.0352, weight: 1.02 },
  { id: 'wd-kamuning-mkt', name: 'Kamuning Public Market & K-J Street', type: 'tricycle', lat: 14.6305, lng: 121.0422, weight: 1.04 },
  { id: 'wd-mrt-qave', name: 'MRT-3 Quezon Ave & Centris Terminal', type: 'train', lat: 14.6425, lng: 121.0387, weight: 1.24 },

  // Cubao / Philcoa / UP / Monumento / Baclaran
  { id: 'wd-cubao-araneta', name: 'Cubao LRT-2 / MRT-3 & Farmers Bay', type: 'train', lat: 14.6200, lng: 121.0530, weight: 1.28 },
  { id: 'wd-anonas-lrt', name: 'LRT-2 Anonas & St. Joseph Market Strip', type: 'train', lat: 14.6280, lng: 121.0645, weight: 1.14 },
  { id: 'wd-katipunan-lrt', name: 'LRT-2 Katipunan & UP/Ateneo Gate', type: 'school', lat: 14.6310, lng: 121.0725, weight: 1.22 },
  { id: 'wd-philcoa-hub', name: 'PHILCOA Commonwealth & UP Jeep Hub', type: 'jeepney', lat: 14.6518, lng: 121.0493, weight: 1.22 },
  { id: 'wd-up-area2', name: 'UP Diliman Area 2 & Oval Gate', type: 'school', lat: 14.6548, lng: 121.0645, weight: 1.16 },
  { id: 'wd-maginhawa', name: 'Maginhawa & Krus na Ligas TODA', type: 'tricycle', lat: 14.6462, lng: 121.0568, weight: 1.04 },
  { id: 'wd-sm-north-trinoma', name: 'SM North EDSA & Trinoma Grand Terminal', type: 'train', lat: 14.6560, lng: 121.0305, weight: 1.28 },
  { id: 'wd-munoz-roosevelt', name: 'LRT-1 Fernando Poe Jr. / Muñoz Market', type: 'train', lat: 14.6575, lng: 121.0212, weight: 1.18 },
  { id: 'wd-monumento-lrt', name: 'LRT-1 Monumento & MCU Terminal', type: 'train', lat: 14.6548, lng: 120.9839, weight: 1.26 },
  { id: 'wd-5th-ave-lrt', name: 'LRT-1 5th Avenue & C-3 Jeepney Hub', type: 'train', lat: 14.6444, lng: 120.9836, weight: 1.10 },
  { id: 'wd-baclaran-lrt', name: 'LRT-1 Baclaran & Redemptorist Hub', type: 'train', lat: 14.5343, lng: 120.9983, weight: 1.28 },
];

/**
 * Generates a rich, world-pinned set of transit, school, market, and barangay anchors.
 * Uses absolute Earth grid indices (anchored to 0°,0° lat/lng) for secondary barangay pockets
 * so every single heat zone is 100% stationary on the map and NEVER moves on zoom or pan.
 */
export function generateWideScopeAnchors(
  centerLat: number,
  centerLng: number,
  radiusM = 5500
): TransitAnchor[] {
  const result: TransitAnchor[] = [];

  // 1. Curated wide-district anchors within radius
  for (const a of WIDE_DISTRICT_ANCHORS) {
    if (calculateDistanceM(centerLat, centerLng, a.lat, a.lng) <= radiusM) {
      result.push(a);
    }
  }

  // 2. Local hub anchors around nearby Metro hubs
  for (const hub of PHILIPPINE_METRO_HUBS) {
    if (calculateDistanceM(centerLat, centerLng, hub.lat, hub.lng) <= radiusM) {
      const hubAnchors = generateAnchorsAround(hub.lat, hub.lng);
      for (const ha of hubAnchors) {
        if (!result.some((r) => calculateDistanceM(r.lat, r.lng, ha.lat, ha.lng) < 110)) {
          result.push(ha);
        }
      }
    }
  }

  // 3. Configured Demand Hotspots
  const hotspots = getAllDemandHotspots(centerLat, centerLng);
  for (const h of hotspots) {
    if (calculateDistanceM(centerLat, centerLng, h.lat, h.lng) <= radiusM) {
      if (!result.some((r) => calculateDistanceM(r.lat, r.lng, h.lat, h.lng) < 110)) {
        const mappedType: TransitAnchor['type'] =
          h.category === 'school'
            ? 'school'
            : h.category === 'commuter'
              ? 'jeepney'
              : 'tricycle';
        result.push({
          id: `hs-${h.id}`,
          name: h.nameTl || h.name,
          type: mappedType,
          lat: h.lat,
          lng: h.lng,
          weight: Math.max(0.78, Math.min(1.20, h.opportunityScore / 80)),
        });
      }
    }
  }

  // 4. World-fixed secondary barangay micro-pockets (indexed by integer latIdx/lngIdx from 0,0)
  // Because latIdx and lngIdx are absolute world coordinates, these points NEVER shift when panning or zooming!
  const STEP = 0.0042; // ~460m spacing
  const degRadius = radiusM / 110540;
  const minLatIdx = Math.floor((centerLat - degRadius) / STEP);
  const maxLatIdx = Math.ceil((centerLat + degRadius) / STEP);
  const minLngIdx = Math.floor((centerLng - degRadius) / STEP);
  const maxLngIdx = Math.ceil((centerLng + degRadius) / STEP);

  const types: TransitAnchor['type'][] = ['tricycle', 'jeepney', 'school', 'tricycle'];
  const barangayLabels: Record<TransitAnchor['type'], string> = {
    tricycle: 'Barangay TODA & Kanto',
    jeepney: 'Lokal na Sakayan at Tawiran',
    school: 'Paaralan at Merienda Corner',
    train: 'Commuter Waiting Area',
  };

  for (let latIdx = minLatIdx; latIdx <= maxLatIdx; latIdx++) {
    for (let lngIdx = minLngIdx; lngIdx <= maxLngIdx; lngIdx++) {
      // Deterministic hash from integer world grid indices ONLY
      const h1 = Math.abs(Math.sin(latIdx * 127.1 + lngIdx * 311.7) * 43758.5453123);
      const f1 = h1 - Math.floor(h1);
      const h2 = Math.abs(Math.sin(latIdx * 269.5 + lngIdx * 183.3) * 28471.918273);
      const f2 = h2 - Math.floor(h2);

      // Skip ~25% of cells for organic, non-uniform city structure, and exclude Manila Bay water west of ~120.961
      const nodeLat = (latIdx + 0.2 + f1 * 0.6) * STEP;
      const nodeLng = (lngIdx + 0.2 + f2 * 0.6) * STEP;
      if (f1 < 0.22 || (nodeLat < 14.63 && nodeLng < 120.962)) continue;

      if (calculateDistanceM(centerLat, centerLng, nodeLat, nodeLng) <= radiusM) {
        const tooClose = result.some((r) => calculateDistanceM(r.lat, r.lng, nodeLat, nodeLng) < 250);
        if (!tooClose) {
          const anchorType = types[(latIdx + lngIdx + Math.floor(f2 * 10)) & 3];
          // Moderate-to-good weights (0.68 - 1.02) so the map has a natural mix of yellow, amber, and red pockets
          const weight = Number((0.68 + f2 * 0.34).toFixed(2));
          result.push({
            id: `bgy-${latIdx}-${lngIdx}`,
            name: barangayLabels[anchorType],
            type: anchorType,
            lat: nodeLat,
            lng: nodeLng,
            weight,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Huff gravity model, share-based per CLAUDE.md §4.1:
 *   Viability Score = sum(W_j / d_ij^beta) - lambda * (Competitor Density_i)
 */
export function evaluateLocationViability(
  lat: number,
  lng: number,
  archetype: BusinessArchetype,
  anchors: TransitAnchor[],
  competitors: CompetitorNode[]
): ViabilityResult {
  let nearestAnchor: TransitAnchor | null = null;
  let minAnchorDist = Infinity;
  let anchorsWithin300m = 0;

  const rivalStrength = archetype.competitorPenalty > 0 ? archetype.competitorPenalty : 1;
  const outside = attraction(OUTSIDE_OPTION_M);

  let expectedDemand = 0;

  for (const anchor of anchors) {
    const distM = calculateDistanceM(lat, lng, anchor.lat, anchor.lng);
    if (distM < minAnchorDist) {
      minAnchorDist = distM;
      nearestAnchor = anchor;
    }
    if (distM <= 300) anchorsWithin300m += 1;

    if (distM > 450) continue;

    const affinity = getProductAnchorAffinity(archetype.id, anchor.type);
    const mine = attraction(distM, affinity);

    let rivals = 0;
    for (const comp of competitors) {
      const compToAnchorM = calculateDistanceM(comp.lat, comp.lng, anchor.lat, anchor.lng);
      if (compToAnchorM <= 400) {
        const compMultiplier = comp.category === archetype.id ? 2.0 : 1.0;
        rivals += attraction(compToAnchorM, rivalStrength * compMultiplier);
      }
    }

    const share = mine / (mine + rivals + outside);
    expectedDemand += anchor.weight * archetype.transitWeight * affinity * share;
  }

  let competitorsWithin150m = 0;
  let directCannibalization = 0;
  for (const comp of competitors) {
    const dComp = calculateDistanceM(lat, lng, comp.lat, comp.lng);
    if (dComp <= 150) {
      competitorsWithin150m += 1;
      const sameProductMult = comp.category === archetype.id ? 1.7 : 0.8;
      directCannibalization +=
        rivalStrength * sameProductMult * Math.pow(1 - dComp / 160, 1.3) * 0.22;
    }
  }

  const netDemand = Math.max(0.02, expectedDemand - directCannibalization);
  const rawScore = 100 * (1 - Math.exp(-netDemand / SATURATION_K));
  const clampedScore = Math.min(96, Math.max(MIN_SCORE, Math.round(rawScore)));

  let ratingTl = 'Katamtaman ang Tao';
  let ratingEn = 'Moderate Viability';

  if (clampedScore >= 80) {
    ratingTl = 'Napakagandang Pwesto!';
    ratingEn = 'Prime Hotspot!';
  } else if (clampedScore >= 60) {
    ratingTl = 'Magandang Pwesto';
    ratingEn = 'High Foot Traffic';
  } else if (clampedScore < 40) {
    ratingTl = 'Mababang Trapiko';
    ratingEn = 'Low Foot Traffic';
  }

  return {
    score: clampedScore,
    ratingTl,
    ratingEn,
    nearestAnchorName: nearestAnchor ? nearestAnchor.name : 'Pangunahing Sakayan',
    nearestAnchorDistM: minAnchorDist === Infinity ? 100 : minAnchorDist,
    anchorCountWithin300m: anchorsWithin300m,
    competitorCountWithin150m: competitorsWithin150m,
    peakHoursTl: archetype.peakHoursTl,
    peakHoursEn: archetype.peakHours,
  };
}

export interface HeatmapSpotProbeResult extends ViabilityResult {
  lat: number;
  lng: number;
  sameProductCompetitors150m: number;
  corridorSynergy: boolean;
  adviceTl: string;
  adviceEn: string;
}

/**
 * Interactive "Tap Anywhere on Heatmap" Spot Analyzer.
 */
export function evaluateHeatmapProbe(
  lat: number,
  lng: number,
  productType: string = 'taho',
  activeVendors: TaggedVendor[] = []
): HeatmapSpotProbeResult {
  const normProd = productType.toLowerCase();
  const archetype =
    BUSINESS_ARCHETYPES.find((a) => normProd.includes(a.id)) ||
    BUSINESS_ARCHETYPES[2];

  const wideAnchors = generateWideScopeAnchors(lat, lng, 4500);
  const baseCompetitors = generateCompetitorsAround(lat, lng);

  const allCompetitors: CompetitorNode[] = [...baseCompetitors];
  for (const v of activeVendors) {
    if (v.status !== 'sold_out') {
      allCompetitors.push({
        id: `live-${v.id}`,
        name: v.name,
        lat: v.lat,
        lng: v.lng,
        category: v.productType,
      });
    }
  }

  const baseResult = evaluateLocationViability(lat, lng, archetype, wideAnchors, allCompetitors);

  let sameProductCompetitors150m = 0;
  for (const v of activeVendors) {
    if (
      v.status !== 'sold_out' &&
      (v.productType.toLowerCase() === normProd || normProd.includes(v.productType.toLowerCase())) &&
      calculateDistanceM(lat, lng, v.lat, v.lng) <= 160
    ) {
      sameProductCompetitors150m += 1;
    }
  }

  const corridorSynergy = baseResult.anchorCountWithin300m >= 2;

  let adviceTl = '';
  let adviceEn = '';

  if (baseResult.score >= 80 && sameProductCompetitors150m === 0) {
    adviceTl = `Bakanteng Sweet Spot! Malakas ang daanan ng tao malapit sa ${baseResult.nearestAnchorName} at walang kaparehong ${productType} sa 150m.`;
    adviceEn = `Uncontested Sweet Spot! Strong foot traffic near ${baseResult.nearestAnchorName} with zero same-product rivals within 150m.`;
  } else if (baseResult.score >= 70 && sameProductCompetitors150m > 0) {
    adviceTl = `Mataas ang tao pero may ${sameProductCompetitors150m} kaparehong tindero malapit. Subukang lumipat ng ~100m sa kabilang kanto.`;
    adviceEn = `High foot traffic, but ${sameProductCompetitors150m} same-product vendor(s) nearby. Consider shifting ~100m down the corridor.`;
  } else if (baseResult.score >= 55) {
    adviceTl = `Magandang daanan ng tao (~${baseResult.nearestAnchorDistM}m mula sa ${baseResult.nearestAnchorName}). Mainam sa ${baseResult.peakHoursTl.split('(')[0]}.`;
    adviceEn = `Solid pedestrian corridor (~${baseResult.nearestAnchorDistM}m from ${baseResult.nearestAnchorName}). Best during ${baseResult.peakHoursEn}.`;
  } else {
    adviceTl = `Medyo malayo sa pangunahing sakayan (~${baseResult.nearestAnchorDistM}m). Mas mainam lumapit sa mainit na bahagi ng heatmap.`;
    adviceEn = `Far from primary transit hubs (~${baseResult.nearestAnchorDistM}m). Move toward the warm zones on the heatmap for higher sales.`;
  }

  return {
    ...baseResult,
    lat,
    lng,
    sameProductCompetitors150m,
    corridorSynergy,
    adviceTl,
    adviceEn,
  };
}

/**
 * Recommendation Engine implementing the Huff Gravity Model across a wider district scope.
 */
export function getRecommendedZones(
  centerLat: number,
  centerLng: number,
  productType: string = 'taho',
  radiusM: number = 4000,
  activeVendors: TaggedVendor[] = []
): RecommendedZone[] {
  const normProduct = productType.toLowerCase();
  const archetype =
    BUSINESS_ARCHETYPES.find((a) => normProduct.includes(a.id)) ||
    BUSINESS_ARCHETYPES.find((a) => a.id === 'taho') ||
    BUSINESS_ARCHETYPES[0];

  const wideAnchors = generateWideScopeAnchors(centerLat, centerLng, radiusM);
  const baseCompetitors = generateCompetitorsAround(centerLat, centerLng);

  const allCompetitors: CompetitorNode[] = [...baseCompetitors];
  for (const v of activeVendors) {
    if (v.status !== 'sold_out') {
      allCompetitors.push({
        id: `live-${v.id}`,
        name: v.name,
        lat: v.lat,
        lng: v.lng,
        category: v.productType,
      });
    }
  }

  // Only recommend named major/curated zones in the Top 3 list (exclude generic bgy-* filler nodes)
  const namedAnchors = wideAnchors.filter((a) => !a.id.startsWith('bgy-'));

  interface CandidatePoint {
    id: string;
    name: string;
    nameTl: string;
    lat: number;
    lng: number;
    crowdEstimate: string;
    category: TransitAnchor['type'];
  }

  const candidates: CandidatePoint[] = namedAnchors.map((a) => ({
    id: a.id,
    name: a.name,
    nameTl: a.name,
    lat: a.lat,
    lng: a.lng,
    crowdEstimate:
      a.weight >= 1.2
        ? '~1,200 - 2,200 katao / oras'
        : a.weight >= 1.0
          ? '~700 - 1,200 katao / oras'
          : '~400 - 750 katao / oras',
    category: a.type,
  }));

  const uniqueCandidates: CandidatePoint[] = [];
  for (const cand of candidates) {
    const exists = uniqueCandidates.some(
      (u) => calculateDistanceM(cand.lat, cand.lng, u.lat, u.lng) < 160
    );
    if (!exists) {
      uniqueCandidates.push(cand);
    }
  }

  const scored = uniqueCandidates.map((cand) => {
    const distFromUser = calculateDistanceM(centerLat, centerLng, cand.lat, cand.lng);
    const viability = evaluateLocationViability(
      cand.lat,
      cand.lng,
      archetype,
      wideAnchors,
      allCompetitors
    );

    const affinity = getProductAnchorAffinity(normProduct, cand.category);
    const affinityBoost = Math.round((affinity - 1.0) * 18);

    let rationaleTl = '';
    let rationaleEn = '';

    if (normProduct.includes('taho')) {
      if (cand.category === 'school') {
        rationaleTl = 'Perpekto sa umaga (6:00 - 9:00 AM). Dagsa ng mga estudyante, magulang, at guro.';
        rationaleEn = 'Prime morning window (6:00 - 9:00 AM). High student and parent foot traffic.';
      } else if (cand.category === 'tricycle') {
        rationaleTl = 'Labasan ng mga residente sa umaga. Kaunti ang kalabang taho sa ruta na ito.';
        rationaleEn = 'Morning residential exit funnel with low competing taho vendors.';
      } else {
        rationaleTl = 'Mataas na dagsa ng mga commuter na naghahanap ng mabilis na almusal.';
        rationaleEn = 'High morning commuter volume looking for a quick warm breakfast.';
      }
    } else if (normProduct.includes('siomai')) {
      if (cand.category === 'train' || cand.category === 'jeepney') {
        rationaleTl = 'Pangunahing babaan at sakayan sa tanghali at uwian (11:30 AM - 7:30 PM). Gutom ang mga pasahero.';
        rationaleEn = 'Major lunch and rush-hour transit transfer hub. Strong demand for siomai rice.';
      } else {
        rationaleTl = 'Paboritong kainan ng mga estudyante at empleyado na nagtitipid sa tanghalian.';
        rationaleEn = 'Popular student and worker lunch corridor with high turnover.';
      }
    } else if (normProduct.includes('balut') || normProduct.includes('balot')) {
      if (cand.category === 'tricycle' || cand.category === 'jeepney') {
        rationaleTl = 'Buhay na sakayan at tambayan sa gabi (6:00 - 10:30 PM). Madaling makita ang iyong pwesto.';
        rationaleEn = 'Active evening terminal (6:00 - 10:30 PM). High visibility for night commuters.';
      } else {
        rationaleTl = 'Maliwanag na daanan ng mga pauwing manggagawa at BPO employees sa gabi.';
        rationaleEn = 'Well-lit evening walking corridor for night-shift workers and commuters.';
      }
    } else {
      rationaleTl = 'Tuloy-tuloy na bulto ng naglalakad buong araw at maluwag ang bangketa.';
      rationaleEn = 'Consistent all-day pedestrian flow with accessible sidewalk space.';
    }

    const distAdjustment = distFromUser > 2200 ? -5 : distFromUser <= 1000 ? 3 : 0;
    const matchPercentage = Math.min(
      95,
      Math.max(52, Math.round(viability.score * 0.88 + affinityBoost + distAdjustment))
    );

    return {
      id: cand.id,
      name: cand.name,
      nameTl: cand.nameTl,
      lat: cand.lat,
      lng: cand.lng,
      score: viability.score,
      matchPercentage,
      distanceM: distFromUser,
      peakHoursTl: archetype.peakHoursTl,
      peakHoursEn: archetype.peakHours,
      rationaleTl,
      rationaleEn,
      competitorCount: viability.competitorCountWithin150m,
      estimatedCrowd: cand.crowdEstimate,
    };
  });

  scored.sort((a, b) => b.matchPercentage - a.matchPercentage || a.distanceM - b.distanceM);

  const diverseTop: RecommendedZone[] = [];
  for (const item of scored) {
    if (diverseTop.length >= 3) break;
    const tooClose = diverseTop.some(
      (existing) => calculateDistanceM(existing.lat, existing.lng, item.lat, item.lng) < 280
    );
    if (!tooClose) {
      diverseTop.push(item);
    }
  }

  return diverseTop;
}
