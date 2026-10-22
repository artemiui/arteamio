import type { BusinessArchetype, CompetitorNode, TransitAnchor, ViabilityResult } from './types';

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
