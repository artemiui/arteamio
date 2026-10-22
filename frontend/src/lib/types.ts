export type Language = 'tl' | 'en';

export type UserRole = 'buyer' | 'vendor' | 'customer';

export type ViewMode = 'pwesto' | 'radar' | 'tinda';

export type ProductType = 'taho' | 'siomai' | 'balut' | 'balot' | 'other';

export interface UserSession {
  role: UserRole;
  locationName: string;
  lat: number;
  lng: number;
  product?: string;
  verifiedPhoto?: string;
  createdAt: string;
}

export interface UserLocationProfile {
  role: UserRole;
  lat: number;
  lng: number;
  locationName: string;
  source: 'gps' | 'manual';
  completedAt: string;
}

export interface TaggedVendor {
  id: string;
  name: string;
  productType: ProductType;
  productName: string;
  productNameTl: string;
  icon: string;
  price: string;
  lat: number;
  lng: number;
  distanceM: number;
  etaMins: number;
  status: 'live' | 'stopped' | 'sold_out';
  verifiedPhoto?: string;
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

export interface BusinessArchetype {
  id: string;
  name: string;
  nameTl: string;
  icon: string;
  typicalPrice: number;
  transitWeight: number;
  competitorPenalty: number;
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
  score: number;
  ratingTl: string;
  ratingEn: string;
  nearestAnchorName: string;
  nearestAnchorDistM: number;
  anchorCountWithin300m: number;
  competitorCountWithin150m: number;
  peakHoursTl: string;
  peakHoursEn: string;
}

export type DemandHotspotCategory = 'school' | 'barangay' | 'basketball' | 'commuter';

export type DemandPotentialLevel = 'high' | 'medium' | 'low';

export interface DemandHotspot {
  id: string;
  name: string;
  nameTl: string;
  category: DemandHotspotCategory;
  lat: number;
  lng: number;
  radiusM: number;
  opportunityScore: number; // 0-100
  potentialLevel: DemandPotentialLevel; // 'high' (80-100), 'medium' (50-79), 'low' (20-49)
  expectedBusyTime: string;
  expectedBusyTimeTl: string;
  daysActive?: string;
  explanationTl: string;
  explanationEn: string;
  estimatedCrowd: string; // Clearly labeled as estimated demand
  isUserAdded?: boolean;
  isSchoolSchedule?: boolean;
  schoolGrades?: string;
  dataSourceLabel: string; // e.g. "Tantiyang Iskedyul / Configured Schedule"
  createdAt?: string;
}

export interface SchoolDismissalConfig {
  schoolName: string;
  gateLocation: string;
  lat: number;
  lng: number;
  primaryDismissalTime: string; // e.g. "15:30"
  secondaryDismissalTime?: string; // e.g. "17:00"
  estimatedStudents: number;
  favoriteMeriendaTl: string;
  favoriteMeriendaEn: string;
}

export interface CommunityEventConfig {
  title: string;
  category: DemandHotspotCategory;
  venueName: string;
  lat: number;
  lng: number;
  startTime: string; // e.g. "17:30"
  endTime: string; // e.g. "21:30"
  scheduleDays: string; // e.g. "Biyernes at Sabado"
  estimatedAttendees: number;
  demandExplanationTl: string;
  demandExplanationEn: string;
}
