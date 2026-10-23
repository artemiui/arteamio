import type { BusinessArchetype, CompetitorNode, TransitAnchor, ViabilityResult, RecommendedZone } from './types';
import { BUSINESS_ARCHETYPES, generateAnchorsAround, generateCompetitorsAround, PHILIPPINE_METRO_HUBS } from './data/spots';
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

// ---- Model constants -------------------------------------------------------
const BETA = 1.7;              // distance-decay exponent
const MIN_DIST_M = 30;         // floor to avoid infinite pull at ~0m
const DIST_UNIT_M = 50;        // distances are measured in 50m units
const OUTSIDE_OPTION_M = 150;  // "walk past / buy elsewhere" baseline, see below
const SATURATION_K = 0.6;      // controls how fast the score approaches 100
const MIN_SCORE = 15;          // UI floor so nothing shows as 0

// Huff-style attraction of a site as seen from a customer origin at distanceM.
function attraction(distanceM: number, strength = 1): number {
  const d = Math.max(distanceM, MIN_DIST_M) / DIST_UNIT_M;
  return strength / Math.pow(d, BETA);
}

/**
 * Huff gravity model, share-based.
 *
 * Each transit anchor is a demand origin. For each anchor, the probability that
 * its foot traffic buys from YOU is:
 *
 *   P = A_me / (A_me + sum(A_competitor) + A_outside)
 *
 * where A = strength / distance^beta, measured from the anchor to the site.
 * A_outside is a fixed "customer buys nothing / goes elsewhere" option placed at
 * OUTSIDE_OPTION_M. Without it, a lone vendor would capture 100% of an anchor's
 * demand at any distance, which is unrealistic for walking.
 *
 * Expected demand = sum over anchors of (anchor weight * business affinity * P).
 * It is then squashed to 0-100 with 1 - exp(-x / K) so strong spots stay
 * distinguishable instead of all clamping at 100.
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

  // Assumption: competitorPenalty is a rival's strength relative to you (1 = equal).
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

    const mine = attraction(distM);

    // Competitors compete for THIS anchor's customers, so measure their distance to the anchor.
    let rivals = 0;
    for (const comp of competitors) {
      const compToAnchorM = calculateDistanceM(comp.lat, comp.lng, anchor.lat, anchor.lng);
      rivals += attraction(compToAnchorM, rivalStrength);
    }

    const share = mine / (mine + rivals + outside);
    expectedDemand += anchor.weight * archetype.transitWeight * share;
  }

  // Competitors within 150m of the spot, for the UI
  let competitorsWithin150m = 0;
  for (const comp of competitors) {
    if (calculateDistanceM(lat, lng, comp.lat, comp.lng) <= 150) competitorsWithin150m += 1;
  }

  const rawScore = 100 * (1 - Math.exp(-expectedDemand / SATURATION_K));
  const clampedScore = Math.min(100, Math.max(MIN_SCORE, Math.round(rawScore)));

  // Ratings in Tagalog & English
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

/**
 * Recommendation Engine implementing the Huff Gravity Model across a wider district scope (1.5km - 3.5km).
 * Evaluates candidate zones based on:
 * Viability Score = sum(W_j / d_ij^beta) - lambda * (Competitor Density_i)
 * and matches with product archetype peak windows and customer attraction.
 */
export function getRecommendedZones(
  centerLat: number,
  centerLng: number,
  productType: string = 'taho',
  radiusM: number = 3500
): RecommendedZone[] {
  const normProduct = productType.toLowerCase();
  const archetype =
    BUSINESS_ARCHETYPES.find((a) => a.id === normProduct) ||
    BUSINESS_ARCHETYPES.find((a) => a.id === 'taho') ||
    BUSINESS_ARCHETYPES[0];

  interface CandidatePoint {
    id: string;
    name: string;
    nameTl: string;
    lat: number;
    lng: number;
    crowdEstimate: string;
    category: string;
  }

  const candidates: CandidatePoint[] = [];

  // 1. Transit anchors around center
  const localAnchors = generateAnchorsAround(centerLat, centerLng);
  localAnchors.forEach((a) => {
    candidates.push({
      id: a.id,
      name: a.name,
      nameTl: a.name,
      lat: a.lat,
      lng: a.lng,
      crowdEstimate: '~800 - 1,500 pasahero / oras',
      category: a.type,
    });
  });

  // 2. Metro Hubs if within radius
  PHILIPPINE_METRO_HUBS.forEach((hub) => {
    const d = calculateDistanceM(centerLat, centerLng, hub.lat, hub.lng);
    if (d <= radiusM) {
      candidates.push({
        id: hub.id,
        name: hub.name,
        nameTl: hub.name,
        lat: hub.lat,
        lng: hub.lng,
        crowdEstimate: '~1,200 - 2,500 commuter sa peak',
        category: 'transit',
      });
    }
  });

  // 3. Demand Hotspots
  const hotspots = getAllDemandHotspots(centerLat, centerLng);
  hotspots.forEach((h) => {
    const d = calculateDistanceM(centerLat, centerLng, h.lat, h.lng);
    if (d <= radiusM) {
      candidates.push({
        id: h.id,
        name: h.name,
        nameTl: h.nameTl,
        lat: h.lat,
        lng: h.lng,
        crowdEstimate: h.estimatedCrowd,
        category: h.category,
      });
    }
  });

  // Filter duplicates by approximate distance (< 80m apart)
  const uniqueCandidates: CandidatePoint[] = [];
  for (const cand of candidates) {
    const exists = uniqueCandidates.some(
      (u) => calculateDistanceM(cand.lat, cand.lng, u.lat, u.lng) < 80
    );
    if (!exists) {
      uniqueCandidates.push(cand);
    }
  }

  // 4. Evaluate each candidate using Huff Gravity model
  const scored = uniqueCandidates.map((cand) => {
    const distFromUser = calculateDistanceM(centerLat, centerLng, cand.lat, cand.lng);
    const candAnchors = generateAnchorsAround(cand.lat, cand.lng);
    const candCompetitors = generateCompetitorsAround(cand.lat, cand.lng);

    const viability = evaluateLocationViability(
      cand.lat,
      cand.lng,
      archetype,
      candAnchors,
      candCompetitors
    );

    let boost = 0;
    let rationaleTl = '';
    let rationaleEn = '';

    if (normProduct === 'taho') {
      if (cand.category === 'school' || cand.name.toLowerCase().includes('school') || cand.name.toLowerCase().includes('gate')) {
        boost += 12;
        rationaleTl = 'Perpekto sa umaga (6:00 - 8:30 AM). Dagsa ng mga mag-aaral at guro bago mag-flag ceremony.';
        rationaleEn = 'Optimal morning window (6:00 - 8:30 AM). Strong student and teacher morning traffic.';
      } else if (cand.category === 'jeepney' || cand.name.toLowerCase().includes('jeep') || cand.name.toLowerCase().includes('station')) {
        boost += 8;
        rationaleTl = 'Mataas na dagsa ng mga nagmamadaling commuter papuntang opisina na bibili ng mainit na agahan.';
        rationaleEn = 'High rush-hour commuter volume seeking a quick warm breakfast on the go.';
      } else {
        rationaleTl = 'Sariwang residential at walking corridor na may tuloy-tuloy na mamimili.';
        rationaleEn = 'Continuous walking corridor with steady neighborhood morning traffic.';
      }
    } else if (normProduct === 'siomai') {
      if (cand.category === 'jeepney' || cand.category === 'train' || cand.name.toLowerCase().includes('terminal')) {
        boost += 14;
        rationaleTl = 'Paboritong tawiran sa tanghali at uwian (11:30 AM - 7:30 PM). Gutom ang mga sumasakay.';
        rationaleEn = 'Prime lunch and after-work commuter bottleneck. High demand for hot siomai rice.';
      } else {
        rationaleTl = 'Aktibong tawiran na may kaunting kalabang siomai sa loob ng 150m.';
        rationaleEn = 'Active pedestrian crossing with minimal direct siomai competition.';
      }
    } else if (normProduct === 'balut' || normProduct === 'balot') {
      if (cand.category === 'tricycle' || cand.name.toLowerCase().includes('toda') || cand.name.toLowerCase().includes('terminal')) {
        boost += 15;
        rationaleTl = 'Pangunahing hintayan sa gabi (6:00 PM - 10:30 PM). Matatanaw agad ang iyong bilao o kariton.';
        rationaleEn = 'Nighttime hub (6:00 PM - 10:30 PM). High visibility for evening commuters and riders.';
      } else {
        rationaleTl = 'Maliwanag na kanto sa gabi na dinadaanan ng mga pauwing empleyado.';
        rationaleEn = 'Well-lit evening corner frequented by commuters heading home.';
      }
    } else {
      boost += 6;
      rationaleTl = 'Mataas na bulto ng naglalakad buong araw na may sapat na espasyo sa sidewalk.';
      rationaleEn = 'Consistent all-day foot traffic with convenient sidewalk waiting space.';
    }

    const matchPercentage = Math.min(98, Math.max(50, Math.round(viability.score * 0.85 + boost)));

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
  return scored.slice(0, 3);
}
