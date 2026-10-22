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

// Huff Gravity Model calculation with spatial decay (beta=1.8) and competitor friction
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

  // Calculate cumulative gravitational attraction from anchors
  let attractionSum = 0;
  const beta = 1.7; // distance decay exponent

  for (const anchor of anchors) {
    const distM = calculateDistanceM(lat, lng, anchor.lat, anchor.lng);
    if (distM < minAnchorDist) {
      minAnchorDist = distM;
      nearestAnchor = anchor;
    }
    if (distM <= 300) {
      anchorsWithin300m += 1;
    }

    // Distance decay penalty (floor at 30m to avoid infinite pull)
    const effectiveDist = Math.max(distM, 30);
    // Normalized distance unit (per 50 meters)
    const normalizedDist = effectiveDist / 50;
    const anchorPull = (anchor.weight * archetype.transitWeight * 35) / Math.pow(normalizedDist, beta);
    attractionSum += anchorPull;
  }

  // Count competitors within 150m catchment
  let competitorsWithin150m = 0;
  for (const comp of competitors) {
    const compDist = calculateDistanceM(lat, lng, comp.lat, comp.lng);
    if (compDist <= 150) {
      competitorsWithin150m += 1;
    }
  }

  // Competitive friction penalty
  const competitorDeduction = competitorsWithin150m * archetype.competitorPenalty * 7;

  // Raw score calculation
  const rawScore = attractionSum - competitorDeduction;

  // Bound to 0 - 100
  const clampedScore = Math.min(100, Math.max(15, Math.round(rawScore)));

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
    nearestAnchorName: nearestAnchor ? nearestAnchor.name : 'España Blvd',
    nearestAnchorDistM: minAnchorDist === Infinity ? 100 : minAnchorDist,
    anchorCountWithin300m: anchorsWithin300m,
    competitorCountWithin150m: competitorsWithin150m,
    peakHoursTl: archetype.peakHoursTl,
    peakHoursEn: archetype.peakHours,
  };
}
