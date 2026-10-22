export type Language = 'tl' | 'en';

export type ViewMode = 'pwesto' | 'radar' | 'tinda';

export interface BusinessArchetype {
  id: string;
  name: string;
  nameTl: string;
  icon: string;
  typicalPrice: number;
  transitWeight: number; // Sensitivity to transit anchors
  competitorPenalty: number; // Penalty weight for nearby competition
  idealWalkingRadiusM: number;
  peakHours: string;
  peakHoursTl: string;
}

export interface TransitAnchor {
  id: string;
  name: string;
  type: 'jeepney' | 'train' | 'tricycle' | 'school';
  lat: number;
  lng: number;
  weight: number;
}

export interface CompetitorNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
}

export interface ViabilityResult {
  score: number; // 0 - 100
  ratingTl: string;
  ratingEn: string;
  nearestAnchorName: string;
  nearestAnchorDistM: number;
  anchorCountWithin300m: number;
  competitorCountWithin150m: number;
  peakHoursTl: string;
  peakHoursEn: string;
}

export interface LiveVendor {
  id: string;
  name: string;
  item: string;
  itemTl: string;
  icon: string;
  lat: number;
  lng: number;
  status: 'active' | 'moving' | 'sold_out';
  distanceM: number;
  etaMins: number;
  lastUpdated: string;
}
