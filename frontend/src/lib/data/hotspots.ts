import type { DemandHotspot, DemandHotspotCategory, DemandPotentialLevel, SchoolDismissalConfig, CommunityEventConfig } from '../types';

export const HOTSPOT_CATEGORY_META: Record<
  DemandHotspotCategory,
  { icon: string; labelTl: string; labelEn: string; color: string; bgLight: string; bgDark: string }
> = {
  school: {
    icon: 'school',
    labelTl: 'Uwian ng Estudyante',
    labelEn: 'School Dismissals',
    color: '#2563EB',
    bgLight: '#DBEAFE',
    bgDark: '#1E3A8A',
  },
  basketball: {
    icon: 'trophy',
    labelTl: 'Palaro / Liga sa Court',
    labelEn: 'Basketball Games',
    color: '#EA580C',
    bgLight: '#FFEDD5',
    bgDark: '#7C2D12',
  },
  barangay: {
    icon: 'tent',
    labelTl: 'Kaganapan sa Barangay',
    labelEn: 'Barangay Events',
    color: '#059669',
    bgLight: '#D1FAE5',
    bgDark: '#064E3B',
  },
  commuter: {
    icon: 'bus',
    labelTl: 'Rush Hour sa Sakayan',
    labelEn: 'Commuter Rush Hours',
    color: '#7C3AED',
    bgLight: '#EDE9FE',
    bgDark: '#4C1D95',
  },
};

export const HOTSPOT_LEVEL_META: Record<
  DemandPotentialLevel,
  {
    ratingLabel: 'GOOD' | 'AVERAGE' | 'LOW';
    labelTl: string;
    labelEn: string;
    badgeColor: string;
    badgeBg: string;
    mapStroke: string;
    mapFill: string;
    iconEmoji: string;
  }
> = {
  high: {
    ratingLabel: 'GOOD',
    labelTl: 'GOOD',
    labelEn: 'GOOD',
    badgeColor: '#16A34A',
    badgeBg: 'rgba(22, 163, 74, 0.12)',
    mapStroke: '#16A34A',
    mapFill: '#16A34A',
    iconEmoji: 'dot-high',
  },
  medium: {
    ratingLabel: 'AVERAGE',
    labelTl: 'AVERAGE',
    labelEn: 'AVERAGE',
    badgeColor: '#D97706',
    badgeBg: 'rgba(217, 119, 6, 0.12)',
    mapStroke: '#D97706',
    mapFill: '#F59E0B',
    iconEmoji: 'dot-medium',
  },
  low: {
    ratingLabel: 'LOW',
    labelTl: 'LOW',
    labelEn: 'LOW',
    badgeColor: '#DC2626',
    badgeBg: 'rgba(220, 38, 38, 0.12)',
    mapStroke: '#DC2626',
    mapFill: '#DC2626',
    iconEmoji: 'dot-low',
  },
};

export function getPotentialLevel(score: number): DemandPotentialLevel {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

export function getOpportunityRating(score: number): {
  rating: 'GOOD' | 'AVERAGE' | 'LOW';
  level: DemandPotentialLevel;
  textClass: string;
  bgClass: string;
  borderClass: string;
} {
  const level = getPotentialLevel(score);
  if (level === 'high') {
    return {
      rating: 'GOOD',
      level,
      textClass: 'text-green-600 dark:text-green-400',
      bgClass: 'bg-green-50 dark:bg-green-950/40',
      borderClass: 'border-green-200 dark:border-green-800/50',
    };
  }
  if (level === 'medium') {
    return {
      rating: 'AVERAGE',
      level,
      textClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-950/40',
      borderClass: 'border-amber-200 dark:border-amber-800/50',
    };
  }
  return {
    rating: 'LOW',
    level,
    textClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-950/40',
    borderClass: 'border-red-200 dark:border-red-800/50',
  };
}

/**
 * Calculates a realistic opportunity score (0-100) based on category, crowd volume,
 * timing alignment with street food demand, and proximity factors.
 */
export function calculateOpportunityScore(
  category: DemandHotspotCategory,
  crowdEstimate: number,
  isPeakFoodWindow: boolean = true
): { score: number; potentialLevel: DemandPotentialLevel } {
  // 1. Base propensity by category
  let baseScore = 40;
  if (category === 'school') baseScore = 50; // students have highest immediate snack appetite
  else if (category === 'commuter') baseScore = 48; // commuters in queues need quick nourishment
  else if (category === 'basketball') baseScore = 42; // spectators and sweaty players want iced drinks & snacks
  else if (category === 'barangay') baseScore = 36; // assemblies & health missions

  // 2. Crowd factor (logarithmic scaling)
  let crowdBonus = 0;
  if (crowdEstimate >= 4000) crowdBonus = 35;
  else if (crowdEstimate >= 2500) crowdBonus = 28;
  else if (crowdEstimate >= 1000) crowdBonus = 20;
  else if (crowdEstimate >= 400) crowdBonus = 14;
  else if (crowdEstimate >= 150) crowdBonus = 8;
  else crowdBonus = 4;

  // 3. Timing bonus (afternoon merienda 3pm-7pm or morning breakfast rush)
  const timeBonus = isPeakFoodWindow ? 12 : 5;

  const rawScore = baseScore + crowdBonus + timeBonus;
  const clampedScore = Math.min(98, Math.max(25, Math.round(rawScore)));
  return {
    score: clampedScore,
    potentialLevel: getPotentialLevel(clampedScore),
  };
}

// Distance helper
function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function isCoordWithinBounds(lat: number, lng: number, bounds: ViewportBounds, marginRatio: number = 0.15): boolean {
  const latSpan = Math.abs(bounds.north - bounds.south) || 0.01;
  const lngSpan = Math.abs(bounds.east - bounds.west) || 0.01;
  const minLat = Math.min(bounds.south, bounds.north) - latSpan * marginRatio;
  const maxLat = Math.max(bounds.south, bounds.north) + latSpan * marginRatio;
  const minLng = Math.min(bounds.west, bounds.east) - lngSpan * marginRatio;
  const maxLng = Math.max(bounds.west, bounds.east) + lngSpan * marginRatio;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

// ============================================================================
// CURATED PRESET HUBS DATA (Authentic landmarks for major Philippine hubs)
// ============================================================================
interface PresetHubDefinition {
  id: string;
  name: string;
  lat: number;
  lng: number;
  hotspots: DemandHotspot[];
}

const PRESET_HUBS: PresetHubDefinition[] = [
  // 1. España / Sampaloc, Manila
  {
    id: 'manila-espana',
    name: 'España / Sampaloc, Manila',
    lat: 14.6091,
    lng: 120.9898,
    hotspots: [
      {
        id: 'hotspot-ust-gates',
        name: 'UST España & Dapitan Campus Gates',
        nameTl: 'UST España at Dapitan Campus Gates',
        category: 'school',
        lat: 14.6097,
        lng: 120.9894,
        radiusM: 190,
        opportunityScore: 95,
        potentialLevel: 'high',
        expectedBusyTime: '3:30 PM – 6:30 PM',
        expectedBusyTimeTl: '3:30 PM – 6:30 PM (Sunod-sunod na Uwian ng JHS, SHS, at Kolehiyo)',
        daysActive: 'Lunes hanggang Biyernes',
        explanationTl: 'Sabay-sabay na dismissal ng mga mag-aaral mula sa España, Noval, at Dapitan gates. Pagod at gutom ang mga estudyante bago sumakay ng jeep o UV, kaya mabilis maubos ang taho, siomai rice, at pampalamig.',
        explanationEn: 'Staggered dismissal of Junior High, Senior High, and College students. High student density flowing toward España jeepney and UV queues with strong appetite for afternoon snacks.',
        estimatedCrowd: '~5,200 estudyante at guro',
        isSchoolSchedule: true,
        schoolGrades: 'JHS, SHS, at College Batches',
        dataSourceLabel: 'Iskedyul ng Klase (Tantiyang Datos)',
      },
      {
        id: 'hotspot-espana-terminal',
        name: 'España Lacson UV Express & Jeepney Loading Hub',
        nameTl: 'España Lacson UV Express & Jeepney Loading Hub',
        category: 'commuter',
        lat: 14.6080,
        lng: 120.9914,
        radiusM: 170,
        opportunityScore: 92,
        potentialLevel: 'high',
        expectedBusyTime: '5:00 PM – 8:30 PM',
        expectedBusyTimeTl: '5:00 PM – 8:30 PM (Panggabing Rush Hour sa Pag-uwi)',
        daysActive: 'Araw-araw (Lunes hanggang Sabado)',
        explanationTl: 'Pangunahing sakayan ng mga manggagawa at estudyante pauwi ng Quezon City, Fairview, at San Jose Del Monte. Mahahabang pila sa sakayan kung saan mataas ang demand sa mabilisang kain gaya ng mainit na balot, siomai, at mani.',
        explanationEn: 'Heavy commuter interchange connecting Manila to Quezon City and Fairview. Long transit queues create high purchase impulse for portable finger foods and balut.',
        estimatedCrowd: '~4,500 pasahero bawat oras',
        dataSourceLabel: 'Commuter Rush Window (Tantiyang Datos)',
      },
      {
        id: 'hotspot-rmhs-school',
        name: 'Ramon Magsaysay High School & Footbridge',
        nameTl: 'Ramon Magsaysay High School & Tawiran',
        category: 'school',
        lat: 14.6056,
        lng: 120.9920,
        radiusM: 180,
        opportunityScore: 88,
        potentialLevel: 'high',
        expectedBusyTime: '11:45 AM – 1:15 PM & 4:30 PM – 6:00 PM',
        expectedBusyTimeTl: '11:45 AM – 1:15 PM & 4:30 PM – 6:00 PM (Shift Turnover & Dismissal)',
        daysActive: 'Lunes hanggang Biyernes',
        explanationTl: 'Palitan ng pang-umaga at panggabing shift ng libo-libong high school students. Bulto ng kabataan ay nagtitipon sa tapat ng gate at footbridge para sa abot-kayang merienda.',
        explanationEn: 'Morning and afternoon shift dismissal of public high school students converging around the pedestrian footbridge seeking budget-friendly snacks.',
        estimatedCrowd: '~2,800 estudyante bawat shift',
        isSchoolSchedule: true,
        schoolGrades: 'Grades 7–12 (Pang-umaga at Panggabi)',
        dataSourceLabel: 'DepEd Shift Calendar (Tantiyang Datos)',
      },
      {
        id: 'hotspot-brgy398-court',
        name: 'Barangay 398 Covered Court (Inter-Purok Basketball Liga)',
        nameTl: 'Brgy. 398 Covered Basketball Court (Inter-Purok Cup)',
        category: 'basketball',
        lat: 14.6119,
        lng: 120.9877,
        radiusM: 150,
        opportunityScore: 84,
        potentialLevel: 'high',
        expectedBusyTime: '5:30 PM – 9:30 PM',
        expectedBusyTimeTl: '5:30 PM – 9:30 PM (Palarong Liga at Exhibition Games)',
        daysActive: 'Biyernes, Sabado, at Linggo ng Gabi',
        explanationTl: 'Barangay basketball championship tournament. Ang mga manonood, kapitbahay, at manlalaro ay tuloy-tuloy ang pagbili ng pampalamig na gulaman, balot, chicharon, at siomai habang umiinit ang laban.',
        explanationEn: 'Weekend inter-purok basketball tournament drawing local neighborhood crowds and sports fans seeking cold refreshments and hot evening snacks.',
        estimatedCrowd: '~450 - 650 manonood at manlalaro',
        dataSourceLabel: 'Barangay Sports Bulletin (Sample Community Event)',
      },
      {
        id: 'hotspot-brgy412-plaza',
        name: 'Barangay 412 Community Hall & Plaza (Asembleya & Kadiwa)',
        nameTl: 'Brgy. 412 Hall & Plaza (Asembleya ng Komunidad)',
        category: 'barangay',
        lat: 14.6069,
        lng: 120.9870,
        radiusM: 140,
        opportunityScore: 74,
        potentialLevel: 'medium',
        expectedBusyTime: '8:00 AM – 11:30 AM & 2:00 PM – 5:00 PM',
        expectedBusyTimeTl: '8:00 AM – 11:30 AM & 2:00 PM – 5:00 PM (Asembleya at Ayuda Distribution)',
        daysActive: 'Tuwing Unang Linggo at Miyerkules',
        explanationTl: 'Asembleya ng barangay at pamamahagi ng tulong pangkalusugan. Maraming nanay at lolo/lola na kasama ang mga bata. Magandang pwesto para sa mainit na taho sa umaga o merienda sa hapon.',
        explanationEn: 'Community general assembly and civic services bringing families and seniors into the plaza area with steady morning and mid-afternoon snack appetite.',
        estimatedCrowd: '~650 residente',
        dataSourceLabel: 'Barangay Community Notice (Sample Community Event)',
      },
      {
        id: 'hotspot-noval-pickup',
        name: 'P. Noval Covered Half-Court Pickup Games',
        nameTl: 'P. Noval Half-Court (Paliga ng Kabataan)',
        category: 'basketball',
        lat: 14.6077,
        lng: 120.9880,
        radiusM: 120,
        opportunityScore: 68,
        potentialLevel: 'medium',
        expectedBusyTime: '4:00 PM – 7:30 PM',
        expectedBusyTimeTl: '4:00 PM – 7:30 PM (After-School 3-on-3 Pickup Games)',
        daysActive: 'Lunes hanggang Sabado ng Hapon',
        explanationTl: 'Araw-araw na 3-on-3 pickup basketball games ng mga estudyante pagkatapos ng klase. Uhaw at gutom ang mga manlalaro pagkatapos ng laro, malakas ang benta ng inumin at merienda.',
        explanationEn: 'Daily casual half-court basketball pickup games with student dormers and local youth looking for drinks and merienda right after playing.',
        estimatedCrowd: '~180 - 260 kabataan',
        dataSourceLabel: 'Sample Community Sports Log',
      },
      {
        id: 'hotspot-trabajo-toda',
        name: 'Trabajo Public Market & Lacson TODA Terminal',
        nameTl: 'Trabajo Public Market & TODA Terminal',
        category: 'commuter',
        lat: 14.6060,
        lng: 120.9940,
        radiusM: 160,
        opportunityScore: 65,
        potentialLevel: 'medium',
        expectedBusyTime: '6:00 AM – 9:00 AM & 4:30 PM – 7:00 PM',
        expectedBusyTimeTl: '6:00 AM – 9:00 AM & 4:30 PM – 7:00 PM (Palengke & Tricycle Rush)',
        daysActive: 'Araw-araw',
        explanationTl: 'Terminal ng mga traysikel papuntang mga panloob na kalye ng Sampaloc kasabay ng mga namamalengke. May tuloy-tuloy na foot traffic.',
        explanationEn: 'Neighborhood wet market and tricycle terminal servicing interior residential alleys with steady morning marketgoers and evening commuters.',
        estimatedCrowd: '~1,300 pasahero at mamimili',
        dataSourceLabel: 'Sample Transport Terminal Log',
      },
      {
        id: 'hotspot-cayco-pocket',
        name: 'F. Cayco St. Purok Pocket Plaza & Waiting Shed',
        nameTl: 'F. Cayco St. Purok Waiting Area',
        category: 'barangay',
        lat: 14.6113,
        lng: 120.9932,
        radiusM: 110,
        opportunityScore: 45,
        potentialLevel: 'low',
        expectedBusyTime: '1:00 PM – 3:30 PM',
        expectedBusyTimeTl: '1:00 PM – 3:30 PM (Tahimik na Oras sa Loobang Purok)',
        daysActive: 'Araw-araw',
        explanationTl: 'Panloob na kalye ng purok. Mababa ang mabilisang bugso ng tao kumpara sa mga sakayan, ngunit madaling maging suki ang mga kapitbahay.',
        explanationEn: 'Quiet interior residential pocket alley with modest casual foot traffic. Suitable for steady neighborhood suki.',
        estimatedCrowd: '~90 residente',
        dataSourceLabel: 'Sample Purok Assessment (Estimated Demand)',
      },
    ],
  },

  // 2. Araneta City / Cubao, Quezon City
  {
    id: 'qc-cubao',
    name: 'Araneta City / Cubao, Quezon City',
    lat: 14.6200,
    lng: 121.0530,
    hotspots: [
      {
        id: 'hotspot-cubao-mrt',
        name: 'MRT-3 Cubao & Farmer’s Plaza Transit Terminal',
        nameTl: 'MRT-3 Cubao & Farmer’s Plaza Terminal',
        category: 'commuter',
        lat: 14.6195,
        lng: 121.0520,
        radiusM: 200,
        opportunityScore: 96,
        potentialLevel: 'high',
        expectedBusyTime: '5:00 PM – 9:00 PM',
        expectedBusyTimeTl: '5:00 PM – 9:00 PM (EDSA Panggabing Rush Hour)',
        daysActive: 'Lunes hanggang Sabado',
        explanationTl: 'Napakalaking intersection ng MRT-3, EDSA carousel buses, at mga provincial bus terminals. Libo-libong manggagawa ang dumaraan at naghahanap ng mabilisang makakain.',
        explanationEn: 'High-volume commuter intersection of MRT-3, EDSA bus carousel, and provincial terminals with massive foot traffic for on-the-go snacks.',
        estimatedCrowd: '~8,500 pasahero bawat oras',
        dataSourceLabel: 'Transit Flow Analysis (Tantiyang Datos)',
      },
      {
        id: 'hotspot-cubao-stella',
        name: 'Stella Maris College & Cambridge St. Gates',
        nameTl: 'Stella Maris College & Cambridge St. Gates',
        category: 'school',
        lat: 14.6235,
        lng: 121.0545,
        radiusM: 180,
        opportunityScore: 91,
        potentialLevel: 'high',
        expectedBusyTime: '3:30 PM – 6:00 PM',
        expectedBusyTimeTl: '3:30 PM – 6:00 PM (Uwian ng mga Mag-aaral)',
        daysActive: 'Lunes hanggang Biyernes',
        explanationTl: 'Uwian ng libo-libong mag-aaral mula Grade School hanggang Senior High. Maraming nag-aabang ng sundo at sumasakay ng traysikel na bibili ng meryenda.',
        explanationEn: 'Student dismissal window where students and waiting parents purchase afternoon snacks and iced beverages.',
        estimatedCrowd: '~3,200 mag-aaral at magulang',
        isSchoolSchedule: true,
        schoolGrades: 'Basic Education & SHS',
        dataSourceLabel: 'School Dismissal Schedule (Tantiyang Datos)',
      },
      {
        id: 'hotspot-cubao-araneta-gateway',
        name: 'Smart Araneta Coliseum & Gateway Walkway',
        nameTl: 'Smart Araneta Coliseum & Gateway Walkway',
        category: 'commuter',
        lat: 14.6215,
        lng: 121.0535,
        radiusM: 190,
        opportunityScore: 89,
        potentialLevel: 'high',
        expectedBusyTime: '4:30 PM – 9:00 PM',
        expectedBusyTimeTl: '4:30 PM – 9:00 PM (Palarong PBA at Konsyerto Crowd)',
        daysActive: 'Miyerkules hanggang Linggo',
        explanationTl: 'Dagsaan ng mga tagapanood ng liga, konsyerto, at mga shoppers sa Gateway Mall corridor. Mataas ang benta ng streetfood at pampalamig bago at pagkatapos ng laro.',
        explanationEn: 'Event crowds attending sports leagues, concerts, and mall-goers converging along pedestrian corridors looking for snacks.',
        estimatedCrowd: '~4,200 tao',
        dataSourceLabel: 'Coliseum Event Radar (Tantiyang Datos)',
      },
      {
        id: 'hotspot-cubao-brgy-court',
        name: 'Barangay San Martin de Porres Covered Court',
        nameTl: 'Brgy. San Martin de Porres Covered Court',
        category: 'basketball',
        lat: 14.6175,
        lng: 121.0560,
        radiusM: 150,
        opportunityScore: 82,
        potentialLevel: 'high',
        expectedBusyTime: '5:30 PM – 9:30 PM',
        expectedBusyTimeTl: '5:30 PM – 9:30 PM (Inter-Barangay Basketball Cup)',
        daysActive: 'Biyernes at Sabado ng Gabi',
        explanationTl: 'Palaro ng barangay liga na dinudumog ng mga residente sa purok. Tuloy-tuloy ang order ng kape, gulaman, siomai, at balot.',
        explanationEn: 'Barangay tournament bringing neighborhood youth and families with brisk demand for drinks and hot meals.',
        estimatedCrowd: '~500 manonood at manlalaro',
        dataSourceLabel: 'Barangay Sports Bulletin (Tantiyang Datos)',
      },
      {
        id: 'hotspot-cubao-expo',
        name: 'Cubao Expo Cultural & Food Alley',
        nameTl: 'Cubao Expo Art & Food Walkway',
        category: 'barangay',
        lat: 14.6225,
        lng: 121.0568,
        radiusM: 140,
        opportunityScore: 78,
        potentialLevel: 'medium',
        expectedBusyTime: '6:00 PM – 10:30 PM',
        expectedBusyTimeTl: '6:00 PM – 10:30 PM (Gabi ng mga Komunidad at Art Night)',
        daysActive: 'Huwebes hanggang Linggo',
        explanationTl: 'Popular na tambayan ng mga kabataan, artista, at mga manggagawa sa gabi. Paborito ang streetfood merienda at inumin.',
        explanationEn: 'Popular evening hangout district with creative community foot traffic seeking casual street snacks.',
        estimatedCrowd: '~900 katao',
        dataSourceLabel: 'Community District Notice (Tantiyang Datos)',
      },
      {
        id: 'hotspot-cubao-aurora-jeep',
        name: 'Aurora Blvd & EDSA Jeepney Loading Bay',
        nameTl: 'Aurora Blvd Jeepney & UV Loading Hub',
        category: 'commuter',
        lat: 14.6208,
        lng: 121.0512,
        radiusM: 170,
        opportunityScore: 85,
        potentialLevel: 'high',
        expectedBusyTime: '6:00 AM – 9:00 AM & 5:00 PM – 8:30 PM',
        expectedBusyTimeTl: '6:00 AM – 9:00 AM & 5:00 PM – 8:30 PM (Sakayan papuntang Marikina & Rizal)',
        daysActive: 'Araw-araw',
        explanationTl: 'Terminal ng mga jeep at UV Express patungong Marikina, Antipolo, at San Mateo. Mahabang pila ng mga pasahero.',
        explanationEn: 'Key transport bottleneck serving eastern Metro Manila commuters awaiting rides.',
        estimatedCrowd: '~3,800 pasahero',
        dataSourceLabel: 'Transport Terminal Log (Tantiyang Datos)',
      },
    ],
  },

  // 3. Welcome Rotonda, Quezon City / Manila
  {
    id: 'qc-welcome',
    name: 'Welcome Rotonda, Quezon City / Manila',
    lat: 14.6177,
    lng: 121.0006,
    hotspots: [
      {
        id: 'hotspot-welcome-footbridge',
        name: 'Welcome Rotonda Footbridge & Jeepney Loading Bay',
        nameTl: 'Welcome Rotonda Overpass & Jeepney Loading Hub',
        category: 'commuter',
        lat: 14.6179,
        lng: 121.0008,
        radiusM: 200,
        opportunityScore: 96,
        potentialLevel: 'high',
        expectedBusyTime: '6:00 AM – 9:30 AM & 5:00 PM – 9:00 PM',
        expectedBusyTimeTl: '6:00 AM – 9:30 AM & 5:00 PM – 9:00 PM (Rush Hour sa Pagitan ng Maynila at QC)',
        daysActive: 'Araw-araw',
        explanationTl: 'Pangunahing lagusan ng mga pasahero ng jeep, UV Express, at bus sa pagitan ng España, Quezon Avenue, at E. Rodriguez. Napakataas ng foot traffic sa ibaba ng overpass.',
        explanationEn: 'Major commuter choke point connecting España, Quezon Avenue, and E. Rodriguez Sr. Avenue with heavy transfer foot traffic.',
        estimatedCrowd: '~7,800 pasahero bawat oras',
        dataSourceLabel: 'Commuter Rush Window (Tantiyang Datos)',
      },
      {
        id: 'hotspot-welcome-udm-plaza',
        name: 'Blumentritt & Mayon St. Tricycle TODA Terminal',
        nameTl: 'Blumentritt at Mayon St. Tricycle TODA Terminal',
        category: 'commuter',
        lat: 14.6194,
        lng: 120.9992,
        radiusM: 170,
        opportunityScore: 89,
        potentialLevel: 'high',
        expectedBusyTime: '4:30 PM – 8:30 PM',
        expectedBusyTimeTl: '4:30 PM – 8:30 PM (Sakayan papasok ng La Loma at Sta. Mesa Heights)',
        daysActive: 'Lunes hanggang Sabado',
        explanationTl: 'Sakayan ng mga empleyado at estudyante papasok sa mga kabahayan sa Mayon, Kanlaon, at La Loma.',
        explanationEn: 'High-turnover neighborhood tricycle terminal serving residential commuters returning home.',
        estimatedCrowd: '~3,200 pasahero',
        dataSourceLabel: 'Transport Terminal Log (Tantiyang Datos)',
      },
      {
        id: 'hotspot-welcome-st-theresa',
        name: 'St. Theresa’s College & D. Tuazon Gates',
        nameTl: 'St. Theresa’s College & D. Tuazon School Gates',
        category: 'school',
        lat: 14.6205,
        lng: 121.0032,
        radiusM: 180,
        opportunityScore: 88,
        potentialLevel: 'high',
        expectedBusyTime: '3:00 PM – 5:30 PM',
        expectedBusyTimeTl: '3:00 PM – 5:30 PM (Uwian ng mga Mag-aaral at Sundo)',
        daysActive: 'Lunes hanggang Biyernes',
        explanationTl: 'Uwian ng mga estudyante at mga naghihintay na magulang at tagasundo sa paligid ng D. Tuazon at Quezon Ave.',
        explanationEn: 'Afternoon school dismissal drawing students and guardians looking for snacks and cold drinks.',
        estimatedCrowd: '~2,400 estudyante at tagasundo',
        isSchoolSchedule: true,
        schoolGrades: 'Grade School & High School',
        dataSourceLabel: 'School Dismissal Schedule (Tantiyang Datos)',
      },
      {
        id: 'hotspot-welcome-brgy-don-manuel',
        name: 'Barangay Don Manuel Covered Basketball Court',
        nameTl: 'Brgy. Don Manuel Covered Court (Paliga sa Gabi)',
        category: 'basketball',
        lat: 14.6158,
        lng: 121.0025,
        radiusM: 150,
        opportunityScore: 81,
        potentialLevel: 'high',
        expectedBusyTime: '5:30 PM – 9:30 PM',
        expectedBusyTimeTl: '5:30 PM – 9:30 PM (Inter-Barangay Basketball Liga)',
        daysActive: 'Biyernes hanggang Linggo',
        explanationTl: 'Gabi-gabing laro at liga sa covered court. Mabenta ang palamig, siomai, at balot sa mga manonood.',
        explanationEn: 'Evening neighborhood basketball games generating steady demand for cold drinks and street snacks.',
        estimatedCrowd: '~460 katao',
        dataSourceLabel: 'Barangay Sports Bulletin (Tantiyang Datos)',
      },
    ],
  },

  // 4. PHILCOA / Commonwealth, Quezon City
  {
    id: 'qc-philcoa',
    name: 'PHILCOA / Commonwealth, Quezon City',
    lat: 14.6518,
    lng: 121.0493,
    hotspots: [
      {
        id: 'hotspot-philcoa-terminal',
        name: 'PHILCOA Commonwealth Bus, UV & UP Ikot Jeepney Hub',
        nameTl: 'PHILCOA Commonwealth & UP Jeepney Terminal',
        category: 'commuter',
        lat: 14.6516,
        lng: 121.0495,
        radiusM: 210,
        opportunityScore: 97,
        potentialLevel: 'high',
        expectedBusyTime: '6:00 AM – 9:30 AM & 4:30 PM – 9:00 PM',
        expectedBusyTimeTl: '6:00 AM – 9:30 AM & 4:30 PM – 9:00 PM (Sakayan pa-UP Diliman at Fairview)',
        daysActive: 'Araw-araw',
        explanationTl: 'Pangunahing babaan at sakayan ng libo-libong estudyante ng UP Diliman, kawani ng gobyerno sa Elliptical Road, at commuters pa-Fairview at Litex.',
        explanationEn: 'Major Commonwealth Avenue transit hub connecting UP Diliman, Quezon Memorial Circle, and Fairview commuters.',
        estimatedCrowd: '~9,200 pasahero bawat oras',
        dataSourceLabel: 'Commonwealth Transit Monitor (Tantiyang Datos)',
      },
      {
        id: 'hotspot-philcoa-knl-arch',
        name: 'Krus na Ligas Welcome Arch & Maginhawa Tricycle TODA',
        nameTl: 'Krus na Ligas Arch & Maginhawa TODA Terminal',
        category: 'commuter',
        lat: 14.6488,
        lng: 121.0528,
        radiusM: 170,
        opportunityScore: 91,
        potentialLevel: 'high',
        expectedBusyTime: '4:30 PM – 9:00 PM',
        expectedBusyTimeTl: '4:30 PM – 9:00 PM (Dagsaan ng mga Estudyante at Boarders)',
        daysActive: 'Araw-araw',
        explanationTl: 'Makipot at siksikang pasukan ng Krus na Ligas kung saan nakatira ang libo-libong UP students at manggagawa. Napakalakas ng benta ng kwek-kwek, siomai rice, at taho.',
        explanationEn: 'High-density student dormitory and residential gateway with intense evening street food demand.',
        estimatedCrowd: '~4,800 residente at estudyante',
        dataSourceLabel: 'Commuter Flow Radar (Tantiyang Datos)',
      },
      {
        id: 'hotspot-philcoa-knl-high',
        name: 'Krus na Ligas High School & Elementary Gates',
        nameTl: 'Krus na Ligas High School & Elementary Gates',
        category: 'school',
        lat: 14.6472,
        lng: 121.0550,
        radiusM: 180,
        opportunityScore: 89,
        potentialLevel: 'high',
        expectedBusyTime: '11:30 AM – 1:00 PM & 4:00 PM – 6:00 PM',
        expectedBusyTimeTl: '11:30 AM – 1:00 PM & 4:00 PM – 6:00 PM (Tanghalian at Uwian)',
        daysActive: 'Lunes hanggang Biyernes',
        explanationTl: 'Sabay-sabay na labasan ng mga estudyante sa pampublikong paaralan na naghahanap ng abot-kayang meryenda.',
        explanationEn: 'Public school shift turnover and afternoon dismissal with heavy snack demand.',
        estimatedCrowd: '~2,900 estudyante',
        isSchoolSchedule: true,
        schoolGrades: 'Elementary & Grades 7–12',
        dataSourceLabel: 'School Calendar (Tantiyang Datos)',
      },
      {
        id: 'hotspot-philcoa-san-vicente-court',
        name: 'Barangay San Vicente Covered Basketball Court',
        nameTl: 'Brgy. San Vicente Covered Court (Liga sa Purok)',
        category: 'basketball',
        lat: 14.6538,
        lng: 121.0472,
        radiusM: 150,
        opportunityScore: 82,
        potentialLevel: 'high',
        expectedBusyTime: '5:30 PM – 9:30 PM',
        expectedBusyTimeTl: '5:30 PM – 9:30 PM (Panggabing Paliga)',
        daysActive: 'Biyernes, Sabado, at Linggo',
        explanationTl: 'Aktibong basketball court malapit sa PHILCOA alleyways na dinudumog ng mga kabataan at manonood.',
        explanationEn: 'Dense neighborhood court hosting evening games with strong spectator appetite for street foods.',
        estimatedCrowd: '~500 katao',
        dataSourceLabel: 'Barangay Sports Bulletin (Tantiyang Datos)',
      },
    ],
  },

  // 5. Quezon Avenue (MRT-3 / Centris), Quezon City
  {
    id: 'qc-quezon-ave',
    name: 'Quezon Avenue (MRT-3 / Centris), Quezon City',
    lat: 14.6425,
    lng: 121.0387,
    hotspots: [
      {
        id: 'hotspot-qave-mrt-centris',
        name: 'MRT-3 Quezon Avenue Station & Eton Centris Jeepney Terminal',
        nameTl: 'MRT-3 Quezon Ave & Centris Transport Terminal',
        category: 'commuter',
        lat: 14.6427,
        lng: 121.0386,
        radiusM: 210,
        opportunityScore: 96,
        potentialLevel: 'high',
        expectedBusyTime: '5:00 PM – 9:30 PM',
        expectedBusyTimeTl: '5:00 PM – 9:30 PM (EDSA Carousel, MRT-3, at BPO Shift Turnover)',
        daysActive: 'Araw-araw',
        explanationTl: 'Sentro ng MRT-3 Quezon Ave, EDSA Bus Carousel, at UV/Jeepney terminal papuntang Fairview, Litex, at Manila, kasabay ng libo-libong BPO workers sa Centris.',
        explanationEn: 'Major MRT-3 station, BPO campus, and jeepney/UV interchange with round-the-clock commuter foot traffic.',
        estimatedCrowd: '~8,800 pasahero bawat oras',
        dataSourceLabel: 'Transit Flow Monitor (Tantiyang Datos)',
      },
      {
        id: 'hotspot-qave-panay-toda',
        name: 'Panay Ave. & Mother Ignacia Tricycle TODA Hub',
        nameTl: 'Panay Ave. at Mother Ignacia TODA Terminal',
        category: 'commuter',
        lat: 14.6402,
        lng: 121.0365,
        radiusM: 170,
        opportunityScore: 88,
        potentialLevel: 'high',
        expectedBusyTime: '6:30 AM – 9:30 AM & 5:00 PM – 8:30 PM',
        expectedBusyTimeTl: '6:30 AM – 9:30 AM & 5:00 PM – 8:30 PM (Sakayan sa South Triangle)',
        daysActive: 'Lunes hanggang Sabado',
        explanationTl: 'Pila ng mga traysikel at babaan ng mga nagtatrabaho sa media networks, opisina, at kainan sa South Triangle.',
        explanationEn: 'Busy tricycle and commuter queue serving office workers and residents in South Triangle.',
        estimatedCrowd: '~3,500 pasahero',
        dataSourceLabel: 'Commuter Rush Window (Tantiyang Datos)',
      },
      {
        id: 'hotspot-qave-qcshs',
        name: 'Quezon City Science High School & Misamis St. Gate',
        nameTl: 'Quezon City Science High School (Kisay) Gate',
        category: 'school',
        lat: 14.6458,
        lng: 121.0352,
        radiusM: 180,
        opportunityScore: 90,
        potentialLevel: 'high',
        expectedBusyTime: '3:30 PM – 6:00 PM',
        expectedBusyTimeTl: '3:30 PM – 6:00 PM (Uwian ng mga Mag-aaral)',
        daysActive: 'Lunes hanggang Biyernes',
        explanationTl: 'Dagsaan ng mga estudyante papuntang Quezon Ave at SM North sakayan pagkatapos ng klase.',
        explanationEn: 'High school dismissal generating steady student foot traffic toward EDSA and Quezon Avenue.',
        estimatedCrowd: '~2,600 estudyante',
        isSchoolSchedule: true,
        schoolGrades: 'Grades 7–12',
        dataSourceLabel: 'School Schedule (Tantiyang Datos)',
      },
      {
        id: 'hotspot-qave-piy-margal-court',
        name: 'Barangay Pinyahan Multi-Purpose Covered Court',
        nameTl: 'Brgy. Pinyahan Covered Court (Liga ng Komunidad)',
        category: 'basketball',
        lat: 14.6395,
        lng: 121.0422,
        radiusM: 150,
        opportunityScore: 81,
        potentialLevel: 'high',
        expectedBusyTime: '5:30 PM – 9:30 PM',
        expectedBusyTimeTl: '5:30 PM – 9:30 PM (Inter-Purok Basketball)',
        daysActive: 'Biyernes at Sabado',
        explanationTl: 'Barangay covered court na may palarong panggabi at tuloy-tuloy na foot traffic mula sa mga residente.',
        explanationEn: 'Community court hosting leagues and pickup games with strong beverage and snack demand.',
        estimatedCrowd: '~440 katao',
        dataSourceLabel: 'Barangay Sports Bulletin (Tantiyang Datos)',
      },
    ],
  },

  // 6. Monumento (LRT-1 Station), Caloocan
  {
    id: 'caloocan-monumento',
    name: 'Monumento (LRT-1 Station), Caloocan',
    lat: 14.6548,
    lng: 120.9839,
    hotspots: [
      {
        id: 'hotspot-monumento-lrt',
        name: 'LRT-1 Monumento Station & Rizal Ave. Footbridge',
        nameTl: 'LRT-1 Monumento Station & Rizal Ave. Tawiran',
        category: 'commuter',
        lat: 14.6548,
        lng: 120.9839,
        radiusM: 200,
        opportunityScore: 96,
        potentialLevel: 'high',
        expectedBusyTime: '6:00 AM – 9:00 AM & 5:00 PM – 9:00 PM',
        expectedBusyTimeTl: '6:00 AM – 9:00 AM & 5:00 PM – 9:00 PM (LRT-1 & Bus Carousel Peak)',
        daysActive: 'Araw-araw',
        explanationTl: 'Pangunahing transport gateway ng Hilagang Kalakhang Maynila (Caloocan, Malabon, Navotas, Valenzuela).',
        explanationEn: 'Major northern Metro Manila LRT-1 and bus carousel gateway with massive daily pedestrian transfer volumes.',
        estimatedCrowd: '~8,900 pasahero bawat oras',
        dataSourceLabel: 'Transit Flow Monitor (Tantiyang Datos)',
      },
      {
        id: 'hotspot-monumento-mcu',
        name: 'Manila Central University (MCU) & EDSA Bus Carousel Stop',
        nameTl: 'MCU Campus Gates & EDSA Carousel Footbridge',
        category: 'school',
        lat: 14.6578,
        lng: 120.9855,
        radiusM: 180,
        opportunityScore: 92,
        potentialLevel: 'high',
        expectedBusyTime: '12:00 PM – 1:30 PM & 4:30 PM – 6:30 PM',
        expectedBusyTimeTl: '12:00 PM – 1:30 PM & 4:30 PM – 6:30 PM (Tanghalian at Uwian)',
        daysActive: 'Lunes hanggang Sabado',
        explanationTl: 'Dagsaan ng mga mag-aaral ng medisina, nursing, at college batches kasabay ng mga pasahero sa EDSA Carousel.',
        explanationEn: 'Large university campus gate and EDSA bus stop with continuous flow of hungry students and commuters.',
        estimatedCrowd: '~4,100 estudyante at pasahero',
        isSchoolSchedule: true,
        schoolGrades: 'Higher Education & SHS',
        dataSourceLabel: 'University Dismissal Log (Tantiyang Datos)',
      },
      {
        id: 'hotspot-monumento-samson-jeep',
        name: 'Samson Road Jeepney & Sangandaan UV Terminal',
        nameTl: 'Samson Road Jeepney & Sangandaan Terminal',
        category: 'commuter',
        lat: 14.6568,
        lng: 120.9812,
        radiusM: 170,
        opportunityScore: 89,
        potentialLevel: 'high',
        expectedBusyTime: '5:00 PM – 9:00 PM',
        expectedBusyTimeTl: '5:00 PM – 9:00 PM (Sakayan pa-Malabon at Navotas)',
        daysActive: 'Araw-araw',
        explanationTl: 'Sakayan ng libo-libong pasahero at estudyante ng UE Caloocan pauwi ng Malabon, Sangandaan, at Navotas.',
        explanationEn: 'High-volume jeepney terminal serving Malabon, Navotas, and Samson Road university commuters.',
        estimatedCrowd: '~4,500 pasahero',
        dataSourceLabel: 'Commuter Rush Window (Tantiyang Datos)',
      },
      {
        id: 'hotspot-monumento-brgy73-court',
        name: 'Barangay 73 Covered Basketball Court',
        nameTl: 'Brgy. 73 Covered Court (Paliga ng Kabataan)',
        category: 'basketball',
        lat: 14.6535,
        lng: 120.9868,
        radiusM: 150,
        opportunityScore: 83,
        potentialLevel: 'high',
        expectedBusyTime: '5:30 PM – 9:30 PM',
        expectedBusyTimeTl: '5:30 PM – 9:30 PM (Inter-Purok Cup)',
        daysActive: 'Biyernes hanggang Linggo',
        explanationTl: 'Paliga ng kabataan sa mataong purok. Mataas ang benta ng gulaman, palamig, at mainit na meryenda.',
        explanationEn: 'Dense neighborhood basketball tournament with active spectators and steady food purchases.',
        estimatedCrowd: '~520 manonood',
        dataSourceLabel: 'Barangay Sports Bulletin (Tantiyang Datos)',
      },
    ],
  },

  // 7. LRT-1 Doroteo Jose / LRT-2 Recto, Manila
  {
    id: 'manila-recto',
    name: 'LRT-1 Doroteo Jose / LRT-2 Recto, Manila',
    lat: 14.6054,
    lng: 120.9822,
    hotspots: [
      {
        id: 'hotspot-recto-lrt-transfer',
        name: 'LRT-1 Doroteo Jose & LRT-2 Recto Transfer Walkway',
        nameTl: 'LRT-1 Doroteo Jose at LRT-2 Recto Transfer Bridge',
        category: 'commuter',
        lat: 14.6054,
        lng: 120.9822,
        radiusM: 210,
        opportunityScore: 97,
        potentialLevel: 'high',
        expectedBusyTime: '6:00 AM – 9:30 AM & 4:30 PM – 9:00 PM',
        expectedBusyTimeTl: '6:00 AM – 9:30 AM & 4:30 PM – 9:00 PM (Pinakamalaking LRT Transfer Hub)',
        daysActive: 'Araw-araw',
        explanationTl: 'Pangunahing lipatan ng libo-libong pasahero sa pagitan ng LRT-1 (Rizal Ave) at LRT-2 (Recto Ave), kasama ang mga provincial bus terminals sa Avenida.',
        explanationEn: 'Busiest rail transfer junction in Manila linking LRT-1, LRT-2, and Avenida bus terminals.',
        estimatedCrowd: '~9,500 pasahero bawat oras',
        dataSourceLabel: 'LRT Transfer Monitor (Tantiyang Datos)',
      },
      {
        id: 'hotspot-recto-feu-morayta',
        name: 'FEU Morayta (Nicanor Reyes St.) & Lerma Gates',
        nameTl: 'FEU Morayta at Lerma University Belt Gates',
        category: 'school',
        lat: 14.6042,
        lng: 120.9862,
        radiusM: 190,
        opportunityScore: 94,
        potentialLevel: 'high',
        expectedBusyTime: '11:30 AM – 1:30 PM & 4:00 PM – 7:00 PM',
        expectedBusyTimeTl: '11:30 AM – 1:30 PM & 4:00 PM – 7:00 PM (Uwian sa U-Belt)',
        daysActive: 'Lunes hanggang Sabado',
        explanationTl: 'Sentro ng University Belt (FEU, UE, PSBA) kung saan siksikan ang mga estudyanteng naghahanap ng siomai rice, taho, kwek-kwek, at palamig.',
        explanationEn: 'Heart of the University Belt with massive student foot traffic heading toward Recto and España.',
        estimatedCrowd: '~6,200 estudyante',
        isSchoolSchedule: true,
        schoolGrades: 'College & Senior High',
        dataSourceLabel: 'University Schedule (Tantiyang Datos)',
      },
      {
        id: 'hotspot-recto-divisoria-jeep',
        name: 'Recto Ave. – Divisoria & Cubao Jeepney Loading Bay',
        nameTl: 'Recto Ave. Jeepney Loading Hub (Divisoria – Cubao)',
        category: 'commuter',
        lat: 14.6038,
        lng: 120.9805,
        radiusM: 170,
        opportunityScore: 90,
        potentialLevel: 'high',
        expectedBusyTime: '4:30 PM – 8:30 PM',
        expectedBusyTimeTl: '4:30 PM – 8:30 PM (Sakayan pa-Divisoria, San Juan, at Cubao)',
        daysActive: 'Araw-araw',
        explanationTl: 'Walang-patid na sakayan at babaan ng mga mamimili at manggagawa sa kahabaan ng Claro M. Recto Avenue.',
        explanationEn: 'Non-stop east-west jeepney loading corridor serving Divisoria shoppers, students, and workers.',
        estimatedCrowd: '~4,900 pasahero',
        dataSourceLabel: 'Downtown Transit Log (Tantiyang Datos)',
      },
      {
        id: 'hotspot-recto-sta-cruz-court',
        name: 'Barangay 310 Sta. Cruz Covered Basketball Court',
        nameTl: 'Brgy. 310 Sta. Cruz Covered Court (Liga sa Barangay)',
        category: 'basketball',
        lat: 14.6075,
        lng: 120.9838,
        radiusM: 150,
        opportunityScore: 82,
        potentialLevel: 'high',
        expectedBusyTime: '5:30 PM – 9:30 PM',
        expectedBusyTimeTl: '5:30 PM – 9:30 PM (Panggabing Palaro)',
        daysActive: 'Biyernes hanggang Linggo',
        explanationTl: 'Masiglang paliga sa sentro ng Sta. Cruz na dinudumog ng mga lokal na manlalaro, dormers, at manonood.',
        explanationEn: 'Inner-city neighborhood court hosting evening leagues with high cold refreshment demand.',
        estimatedCrowd: '~470 katao',
        dataSourceLabel: 'Barangay Sports Bulletin (Tantiyang Datos)',
      },
    ],
  },

  // 8. LRT-1 Baclaran / EDSA Taft, Pasay / Parañaque
  {
    id: 'pasay-baclaran',
    name: 'LRT-1 Baclaran / EDSA Taft, Pasay / Parañaque',
    lat: 14.5343,
    lng: 120.9983,
    hotspots: [
      {
        id: 'hotspot-baclaran-lrt-church',
        name: 'LRT-1 Baclaran Station & Redemptorist Church Walkway',
        nameTl: 'LRT-1 Baclaran Station at Simbahan ng Baclaran',
        category: 'commuter',
        lat: 14.5343,
        lng: 120.9983,
        radiusM: 210,
        opportunityScore: 97,
        potentialLevel: 'high',
        expectedBusyTime: '5:30 AM – 10:00 AM & 4:30 PM – 9:30 PM',
        expectedBusyTimeTl: '5:30 AM – 10:00 AM & 4:30 PM – 9:30 PM (LRT-1 Terminal, Tiangge, at Simbahan)',
        daysActive: 'Araw-araw (Pinakamalakas tuwing Miyerkules at Linggo)',
        explanationTl: 'Dagsaan ng libo-libong pasahero ng LRT-1, mga deboto sa Baclaran Church, at mamimili sa tiangge. Napakabilis maubos ng taho, palamig, siomai, at balot.',
        explanationEn: 'Southern LRT-1 terminal, pilgrimage church, and bustling street market drawing massive crowds all day.',
        estimatedCrowd: '~9,400 pasahero at mamimili',
        dataSourceLabel: 'Transit & Market Bulletin (Tantiyang Datos)',
      },
      {
        id: 'hotspot-edsa-taft-rotonda',
        name: 'EDSA-Taft Rotonda (MRT-3 Taft & LRT-1 EDSA Transfer)',
        nameTl: 'EDSA-Taft Rotonda (MRT-3 at LRT-1 Lipatan)',
        category: 'commuter',
        lat: 14.5376,
        lng: 121.0014,
        radiusM: 200,
        opportunityScore: 96,
        potentialLevel: 'high',
        expectedBusyTime: '6:00 AM – 9:30 AM & 5:00 PM – 9:30 PM',
        expectedBusyTimeTl: '6:00 AM – 9:30 AM & 5:00 PM – 9:30 PM (Lipatan ng MRT-3, LRT-1, at Jeep pa-MOA/Cavite)',
        daysActive: 'Araw-araw',
        explanationTl: 'Isa sa pinakasiksikang commuter intersections sa Metro Manila kung saan nagtatagpo ang MRT-3, LRT-1, EDSA Bus Carousel, at mga sakayan pa-Cavite at MOA.',
        explanationEn: 'Major southern Metro Manila multimodal interchange connecting MRT-3, LRT-1, EDSA Carousel, and Cavite-bound transit.',
        estimatedCrowd: '~9,100 pasahero bawat oras',
        dataSourceLabel: 'Commuter Rush Window (Tantiyang Datos)',
      },
      {
        id: 'hotspot-pasay-west-high',
        name: 'Pasay City West High School & FB Harrison Gate',
        nameTl: 'Pasay City West High School Gate',
        category: 'school',
        lat: 14.5392,
        lng: 120.9948,
        radiusM: 180,
        opportunityScore: 88,
        potentialLevel: 'high',
        expectedBusyTime: '11:30 AM – 1:00 PM & 4:00 PM – 6:00 PM',
        expectedBusyTimeTl: '11:30 AM – 1:00 PM & 4:00 PM – 6:00 PM (Uwian ng mga Estudyante)',
        daysActive: 'Lunes hanggang Biyernes',
        explanationTl: 'Uwian ng mga mag-aaral sa Pasay na naghahanap ng abot-kayang meryenda at palamig.',
        explanationEn: 'Public high school dismissal generating strong afternoon demand for affordable snacks.',
        estimatedCrowd: '~2,700 mag-aaral',
        isSchoolSchedule: true,
        schoolGrades: 'Grades 7–12',
        dataSourceLabel: 'School Dismissal Log (Tantiyang Datos)',
      },
      {
        id: 'hotspot-baclaran-brgy-court',
        name: 'Barangay Baclaran Covered Basketball Court & Plaza',
        nameTl: 'Brgy. Baclaran Covered Court (Paliga ng Komunidad)',
        category: 'basketball',
        lat: 14.5318,
        lng: 120.9968,
        radiusM: 150,
        opportunityScore: 81,
        potentialLevel: 'high',
        expectedBusyTime: '5:30 PM – 9:30 PM',
        expectedBusyTimeTl: '5:30 PM – 9:30 PM (Paliga ng Komunidad)',
        daysActive: 'Biyernes hanggang Linggo',
        explanationTl: 'Palaro ng basketball na dinudumog ng mga kabataan, tindero, at pamilya sa Baclaran.',
        explanationEn: 'Neighborhood basketball games attracting local residents and market workers for evening refreshments.',
        estimatedCrowd: '~460 katao',
        dataSourceLabel: 'Barangay Sports Bulletin (Tantiyang Datos)',
      },
    ],
  },
];

// ============================================================================
// DYNAMIC DEMO HOTSPOT GENERATOR FOR ARBITRARY MAP LOCATIONS
// ============================================================================

/**
 * Generates clearly labeled demo hotspots distributed evenly across the visible
 * viewport or around the center coordinates. Uses spatial hashing so IDs and
 * positions are consistent and duplicate-free.
 */
export function generateDynamicDemoHotspots(
  centerLat: number,
  centerLng: number,
  _bounds?: ViewportBounds
): DemandHotspot[] {
  // Snap to a fixed geographic grid (~1.6km cell) so demo hotspots stay pinned
  // to exact real-world coordinates and never move when panning or zooming the map.
  const GRID_STEP = 0.015;
  const anchorLat = Math.round(centerLat / GRID_STEP) * GRID_STEP;
  const anchorLng = Math.round(centerLng / GRID_STEP) * GRID_STEP;

  // Fixed geographic offsets independent of zoom / viewport bounds
  const dLat = 0.0025;
  const dLng = 0.0028;

  // Spatial grid key for stable IDs
  const gridKey = `${Math.round(anchorLat * 1000)}_${Math.round(anchorLng * 1000)}`;

  const templates: Array<{
    suffix: string;
    name: string;
    nameTl: string;
    category: DemandHotspotCategory;
    latOff: number;
    lngOff: number;
    radiusM: number;
    score: number;
    busyTime: string;
    busyTimeTl: string;
    days: string;
    explanationTl: string;
    explanationEn: string;
    crowd: string;
    isSchool?: boolean;
  }> = [
    {
      suffix: 'sch-1',
      name: 'Pampublikong Mataas na Paaralan (Demo Hotspot)',
      nameTl: 'Lokal na Mataas na Paaralan (Demo Hotspot)',
      category: 'school',
      latOff: dLat * 1.1,
      lngOff: -dLng * 0.9,
      radiusM: 180,
      score: 91,
      busyTime: '11:45 AM – 1:15 PM & 4:00 PM – 6:15 PM',
      busyTimeTl: '11:45 AM – 1:15 PM & 4:00 PM – 6:15 PM (Tanghalian at Uwian)',
      days: 'Lunes hanggang Biyernes',
      explanationTl: 'Pang-hapon na uwian ng mga mag-aaral. Malakas ang benta ng meryenda gaya ng siomai rice, kwek-kwek, taho, at malamig na inumin.',
      explanationEn: 'Afternoon student dismissal. Strong demand for street food, rice snacks, and cold refreshments.',
      crowd: '~2,800 mag-aaral (Tantiyang Datos)',
      isSchool: true,
    },
    {
      suffix: 'com-1',
      name: 'TODA & Sakayan ng Jeep (Demo Hotspot)',
      nameTl: 'TODA Tricycle & Jeep Loading Hub (Demo Hotspot)',
      category: 'commuter',
      latOff: -dLat * 0.8,
      lngOff: dLng * 1.2,
      radiusM: 190,
      score: 93,
      busyTime: '6:00 AM – 9:00 AM & 5:00 PM – 8:30 PM',
      busyTimeTl: '6:00 AM – 9:00 AM & 5:00 PM – 8:30 PM (Rush Hour sa Sakayan)',
      days: 'Araw-araw',
      explanationTl: 'Mahahabang pila ng mga pasahero sa terminal papasok at pauwi sa trabaho. Mataas ang benta ng balot, mani, at pampalamig.',
      explanationEn: 'Heavy commuter queues waiting for tricycle and jeepney connections with steady finger food purchases.',
      crowd: '~3,400 pasahero bawat oras (Tantiyang Datos)',
    },
    {
      suffix: 'bb-1',
      name: 'Barangay Covered Basketball Court (Demo Hotspot)',
      nameTl: 'Barangay Covered Basketball Court (Demo Hotspot)',
      category: 'basketball',
      latOff: -dLat * 1.2,
      lngOff: -dLng * 1.1,
      radiusM: 150,
      score: 83,
      busyTime: '5:30 PM – 9:30 PM',
      busyTimeTl: '5:30 PM – 9:30 PM (Inter-Purok Paliga sa Court)',
      days: 'Biyernes, Sabado, at Linggo',
      explanationTl: 'Palaro ng basketball liga na dinudumog ng mga manonood at manlalaro. Tuloy-tuloy ang pagbili ng inumin, siomai, at chicharon.',
      explanationEn: 'Local inter-purok basketball tournament with active spectators buying drinks and evening merienda.',
      crowd: '~450 - 600 katao (Tantiyang Datos)',
    },
    {
      suffix: 'brgy-1',
      name: 'Barangay Hall & Community Plaza (Demo Hotspot)',
      nameTl: 'Barangay Hall & Community Plaza (Demo Hotspot)',
      category: 'barangay',
      latOff: dLat * 0.7,
      lngOff: dLng * 1.3,
      radiusM: 140,
      score: 75,
      busyTime: '8:30 AM – 11:30 AM & 2:00 PM – 5:00 PM',
      busyTimeTl: '8:30 AM – 11:30 AM & 2:00 PM – 5:00 PM (Asembleya at Pamilihan)',
      days: 'Martes, Huwebes, at Sabado',
      explanationTl: 'Asembleya ng komunidad at pamilihan. Maraming nanay at residente na dumadaan at naghahanap ng mainit na merienda o agahan.',
      explanationEn: 'Community civic center and assembly bringing residents and families for morning and mid-day snacks.',
      crowd: '~700 residente (Tantiyang Datos)',
    },
    {
      suffix: 'com-2',
      name: 'Pedestrian Overpass & Sakayan (Demo Hotspot)',
      nameTl: 'Tawiran Footbridge & Bus Waiting Stop (Demo Hotspot)',
      category: 'commuter',
      latOff: dLat * 1.4,
      lngOff: dLng * 0.4,
      radiusM: 160,
      score: 86,
      busyTime: '5:00 PM – 8:30 PM',
      busyTimeTl: '5:00 PM – 8:30 PM (Panggabing Rush Hour)',
      days: 'Lunes hanggang Sabado',
      explanationTl: 'Siksikang tawiran ng mga tao mula sa trabaho at eskwela. Mabilis makabenta ng street food na bitbitin.',
      explanationEn: 'High-density pedestrian footbridge convergence with high conversion rate for portable street food.',
      crowd: '~2,600 pasahero (Tantiyang Datos)',
    },
    {
      suffix: 'sch-2',
      name: 'Pang-elementaryang Paaralan (Demo Hotspot)',
      nameTl: 'Lokal na Mababang Paaralan (Demo Hotspot)',
      category: 'school',
      latOff: -dLat * 0.4,
      lngOff: -dLng * 1.4,
      radiusM: 160,
      score: 85,
      busyTime: '11:30 AM – 1:00 PM & 3:30 PM – 5:00 PM',
      busyTimeTl: '11:30 AM – 1:00 PM & 3:30 PM – 5:00 PM (Uwian ng mga Bata)',
      days: 'Lunes hanggang Biyernes',
      explanationTl: 'Sabay-sabay na uwian ng mga bata kasama ang mga magulang at tagasundo. Patok ang taho, waffle, at inumin.',
      explanationEn: 'Elementary dismissal with heavy foot traffic of students and fetching guardians seeking refreshments.',
      crowd: '~1,900 mag-aaral at tagasundo (Tantiyang Datos)',
      isSchool: true,
    },
    {
      suffix: 'bb-2',
      name: 'Purok Half-Court Pickup Games (Demo Hotspot)',
      nameTl: 'Purok Half-Court 3-on-3 (Demo Hotspot)',
      category: 'basketball',
      latOff: dLat * 0.2,
      lngOff: -dLng * 0.6,
      radiusM: 120,
      score: 67,
      busyTime: '4:00 PM – 7:30 PM',
      busyTimeTl: '4:00 PM – 7:30 PM (After-Work & School Pickup Games)',
      days: 'Araw-araw ng Hapon',
      explanationTl: 'Araw-araw na laro ng mga kabataan sa kalye. Uhaw at gutom pagkatapos maglaro, mabilis maubos ang inumin.',
      explanationEn: 'Daily casual basketball pickup games with local youth buying drinks and snacks immediately after games.',
      crowd: '~180 kabataan (Tantiyang Datos)',
    },
    {
      suffix: 'brgy-2',
      name: 'Purok Waiting Shed & Talipapa (Demo Hotspot)',
      nameTl: 'Purok Waiting Shed & Talipapa (Demo Hotspot)',
      category: 'barangay',
      latOff: -dLat * 0.9,
      lngOff: dLng * 0.3,
      radiusM: 120,
      score: 49,
      busyTime: '6:00 AM – 9:00 AM & 2:00 PM – 4:00 PM',
      busyTimeTl: '6:00 AM – 9:00 AM & 2:00 PM – 4:00 PM (Almusal at Merienda)',
      days: 'Araw-araw',
      explanationTl: 'Lokal na talipapa at hintayan sa purok. Payak ngunit may suking mga kapitbahay.',
      explanationEn: 'Quiet neighborhood corner and pocket market suitable for steady suki customer relationships.',
      crowd: '~120 residente (Tantiyang Datos)',
    },
  ];

  return templates.map((t) => ({
    id: `demo-${t.suffix}-${gridKey}`,
    name: t.name,
    nameTl: t.nameTl,
    category: t.category,
    lat: Number((anchorLat + t.latOff).toFixed(5)),
    lng: Number((anchorLng + t.lngOff).toFixed(5)),
    radiusM: t.radiusM,
    opportunityScore: t.score,
    potentialLevel: getPotentialLevel(t.score),
    expectedBusyTime: t.busyTime,
    expectedBusyTimeTl: t.busyTimeTl,
    daysActive: t.days,
    explanationTl: t.explanationTl,
    explanationEn: t.explanationEn,
    estimatedCrowd: t.crowd,
    isSchoolSchedule: !!t.isSchool,
    dataSourceLabel: 'Tantiyang Datos (Demo Hotspot)',
  }));
}

// ============================================================================
// LOCAL STORAGE PERSISTENCE (USER-ADDED HOTSPOTS)
// ============================================================================

const STORAGE_KEY = 'pwesto_custom_hotspots';

export function loadCustomHotspots(): DemandHotspot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('pwestoradar_custom_hotspots');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveCustomHotspot(hotspot: DemandHotspot): DemandHotspot[] {
  const current = loadCustomHotspots();
  const index = current.findIndex((h) => h.id === hotspot.id);
  if (index >= 0) {
    current[index] = hotspot;
  } else {
    current.unshift(hotspot);
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }
  return current;
}

export function deleteCustomHotspot(id: string): DemandHotspot[] {
  const current = loadCustomHotspots();
  const updated = current.filter((h) => h.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function resetHotspotsToDefault(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ============================================================================
// DYNAMIC VIEWPORT-AWARE DEMAND HOTSPOTS RETRIEVAL
// ============================================================================

/**
 * Returns relevant hotspots within the active map viewport bounds and center.
 * Ensures dynamically calculated hotspots, authentic landmarks when near preset hubs,
 * realistic demo hotspots when exploring other locations, and eliminates duplicates.
 */
export function getDemandHotspotsForViewport(
  bounds: ViewportBounds,
  centerLat: number,
  centerLng: number,
  _zoom: number = 16
): DemandHotspot[] {
  const custom = loadCustomHotspots();
  const candidates: DemandHotspot[] = [];

  // 1. Always include user-added custom hotspots near the area or within viewport bounds
  for (const c of custom) {
    if (distanceInMeters(centerLat, centerLng, c.lat, c.lng) <= 3500 || isCoordWithinBounds(c.lat, c.lng, bounds, 0.25)) {
      candidates.push(c);
    }
  }

  // 2. Find any known preset hubs located within 3.5km of center OR inside the viewport bounds
  let foundPreset = false;
  for (const hub of PRESET_HUBS) {
    const distToHub = distanceInMeters(centerLat, centerLng, hub.lat, hub.lng);
    const hubInBounds = isCoordWithinBounds(hub.lat, hub.lng, bounds, 0.25);

    if (distToHub <= 3500 || hubInBounds) {
      foundPreset = true;
      for (const h of hub.hotspots) {
        candidates.push(h);
      }
    }
  }

  // 3. Only when exploring an area outside preset hubs, generate fixed-grid demo hotspots
  if (!foundPreset) {
    const demoHotspots = generateDynamicDemoHotspots(centerLat, centerLng, bounds);
    for (const d of demoHotspots) {
      candidates.push(d);
    }
  }

  // 4. Strict deduplication by ID and spatial coordinates (avoid duplicate markers within 40m)
  const seenIds = new Set<string>();
  const uniqueHotspots: DemandHotspot[] = [];

  for (const h of candidates) {
    if (seenIds.has(h.id)) continue;

    // Check if another hotspot with same category is already placed within 40 meters
    const isSpatialDuplicate = uniqueHotspots.some(
      (existing) => existing.category === h.category && distanceInMeters(existing.lat, existing.lng, h.lat, h.lng) < 40
    );

    if (!isSpatialDuplicate) {
      seenIds.add(h.id);
      uniqueHotspots.push(h);
    }
  }

  // 5. Sort by opportunity score descending
  return uniqueHotspots.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

/**
 * Merges realistic sample hotspots for a given coordinate center
 * with user-added custom community events and configured school dismissal schedules.
 * Kept backwards-compatible for settings and vendor pages.
 */
export function getAllDemandHotspots(centerLat: number, centerLng: number): DemandHotspot[] {
  // Approximate a 1.5km bounding box around the center coordinate
  const latDelta = 0.009;
  const lngDelta = 0.01;
  const bounds: ViewportBounds = {
    north: centerLat + latDelta,
    south: centerLat - latDelta,
    east: centerLng + lngDelta,
    west: centerLng - lngDelta,
  };

  return getDemandHotspotsForViewport(bounds, centerLat, centerLng, 16);
}

/**
 * Creates a new School Dismissal Hotspot from user configuration
 */
export function createSchoolHotspot(config: SchoolDismissalConfig): DemandHotspot {
  const { score, potentialLevel } = calculateOpportunityScore('school', config.estimatedStudents, true);
  const busyWindow = config.secondaryDismissalTime
    ? `${config.primaryDismissalTime} – ${config.secondaryDismissalTime}`
    : `${config.primaryDismissalTime} – 5:30 PM`;

  return {
    id: `school-${Date.now()}`,
    name: `${config.schoolName} (${config.gateLocation})`,
    nameTl: `${config.schoolName} (${config.gateLocation})`,
    category: 'school',
    lat: config.lat,
    lng: config.lng,
    radiusM: 180,
    opportunityScore: score,
    potentialLevel,
    expectedBusyTime: busyWindow,
    expectedBusyTimeTl: `${busyWindow} (Uwian ng mga Estudyante)`,
    daysActive: 'Lunes hanggang Biyernes',
    explanationTl: `Dismissal ng mga mag-aaral sa ${config.schoolName} sa may ${config.gateLocation}. Madalas maghanap ng ${config.favoriteMeriendaTl || 'taho, siomai, at malamig na inumin'} habang naghihintay ng sundo o sakayan.`,
    explanationEn: `Dismissal of students at ${config.schoolName} near ${config.gateLocation}. High demand for ${config.favoriteMeriendaEn || 'snacks and cold refreshments'} while waiting for rides.`,
    estimatedCrowd: `~${config.estimatedStudents.toLocaleString()} mag-aaral (Tantiyang Dami)`,
    isUserAdded: true,
    isSchoolSchedule: true,
    schoolGrades: 'Configured by User',
    dataSourceLabel: 'Inulat ng Gumagamit (Configured School Schedule)',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Creates a new Community Event Hotspot from user input
 */
export function createCommunityEventHotspot(config: CommunityEventConfig): DemandHotspot {
  const { score, potentialLevel } = calculateOpportunityScore(config.category, config.estimatedAttendees, true);
  const busyWindow = `${config.startTime} – ${config.endTime}`;

  return {
    id: `event-${Date.now()}`,
    name: config.title,
    nameTl: config.title,
    category: config.category,
    lat: config.lat,
    lng: config.lng,
    radiusM: 160,
    opportunityScore: score,
    potentialLevel,
    expectedBusyTime: busyWindow,
    expectedBusyTimeTl: `${busyWindow} (${config.scheduleDays})`,
    daysActive: config.scheduleDays,
    explanationTl: config.demandExplanationTl,
    explanationEn: config.demandExplanationEn,
    estimatedCrowd: `~${config.estimatedAttendees.toLocaleString()} katao (Tantiyang Dami)`,
    isUserAdded: true,
    isSchoolSchedule: false,
    dataSourceLabel: 'Inulat ng Gumagamit (User-Added Community Event)',
    createdAt: new Date().toISOString(),
  };
}
