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
    labelTl: 'Mataas na Potensyal',
    labelEn: 'High Potential',
    badgeColor: '#DC2626',
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    mapStroke: '#DC2626',
    mapFill: '#EF4444',
    iconEmoji: 'dot-high',
  },
  medium: {
    labelTl: 'Katamtamang Potensyal',
    labelEn: 'Medium Potential',
    badgeColor: '#D97706',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    mapStroke: '#EA580C',
    mapFill: '#F97316',
    iconEmoji: 'dot-medium',
  },
  low: {
    labelTl: 'Mababang Potensyal',
    labelEn: 'Low Potential',
    badgeColor: '#CA8A04',
    badgeBg: 'rgba(234, 179, 8, 0.15)',
    mapStroke: '#CA8A04',
    mapFill: '#EAB308',
    iconEmoji: 'dot-low',
  },
};

export function getPotentialLevel(score: number): DemandPotentialLevel {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
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

  // 3. Ayala / Poblacion, Makati
  {
    id: 'makati-ayala',
    name: 'Ayala / Poblacion, Makati',
    lat: 14.5547,
    lng: 121.0244,
    hotspots: [
      {
        id: 'hotspot-ayala-one-ayala',
        name: 'One Ayala & MRT-3 Ayala Intermodal Terminal',
        nameTl: 'One Ayala & MRT-3 Ayala Terminal',
        category: 'commuter',
        lat: 14.5505,
        lng: 121.0280,
        radiusM: 210,
        opportunityScore: 97,
        potentialLevel: 'high',
        expectedBusyTime: '5:00 PM – 9:00 PM',
        expectedBusyTimeTl: '5:00 PM – 9:00 PM (Panggabing Rush ng mga Empleyado sa Makati CBD)',
        daysActive: 'Lunes hanggang Biyernes',
        explanationTl: 'Pangunahing sakayan ng libo-libong office workers ng Makati CBD pauwi ng Cavite, Laguna, Rizal, at southern Metro Manila.',
        explanationEn: 'Central transit terminal connecting Makati CBD employees heading south and east with very high foot traffic.',
        estimatedCrowd: '~9,800 commuters per hour',
        dataSourceLabel: 'CBD Transit Hub Monitor (Tantiyang Datos)',
      },
      {
        id: 'hotspot-makati-high',
        name: 'Makati High School & Gen. Luna St. Gates',
        nameTl: 'Makati High School & Gen. Luna St. Gates',
        category: 'school',
        lat: 14.5620,
        lng: 121.0310,
        radiusM: 180,
        opportunityScore: 90,
        potentialLevel: 'high',
        expectedBusyTime: '11:30 AM – 1:00 PM & 4:30 PM – 6:30 PM',
        expectedBusyTimeTl: '11:30 AM – 1:00 PM & 4:30 PM – 6:30 PM (Tanghalian at Uwian)',
        daysActive: 'Lunes hanggang Biyernes',
        explanationTl: 'Mataas na populasyon ng mga mag-aaral sa mataas na paaralan na naghahanap ng abot-kayang merienda.',
        explanationEn: 'Public high school dismissals creating high demand for budget-friendly merienda and cold refreshments.',
        estimatedCrowd: '~3,100 estudyante',
        isSchoolSchedule: true,
        schoolGrades: 'Junior & Senior High',
        dataSourceLabel: 'School Dismissal Schedule (Tantiyang Datos)',
      },
      {
        id: 'hotspot-makati-poblacion-plaza',
        name: 'Poblacion Heritage District & Church Plaza',
        nameTl: 'Poblacion Heritage Plaza & Street Market',
        category: 'barangay',
        lat: 14.5670,
        lng: 121.0335,
        radiusM: 160,
        opportunityScore: 86,
        potentialLevel: 'high',
        expectedBusyTime: '6:00 PM – 11:00 PM',
        expectedBusyTimeTl: '6:00 PM – 11:00 PM (Poblacion Night Food & Community Stalls)',
        daysActive: 'Miyerkules hanggang Linggo',
        explanationTl: 'Sentro ng mga komunidad, turista, at mga lokal na residente. Sikat para sa mga nagtitinda ng mainit na balot, isaw, at barbecue.',
        explanationEn: 'Lively heritage square and popular night district with steady stream of evening diners and tourists.',
        estimatedCrowd: '~1,800 katao',
        dataSourceLabel: 'Barangay Cultural Bulletin (Tantiyang Datos)',
      },
      {
        id: 'hotspot-makati-valenzuela-court',
        name: 'Barangay Valenzuela Covered Basketball Court',
        nameTl: 'Brgy. Valenzuela Covered Court (Liga ng Kabataan)',
        category: 'basketball',
        lat: 14.5645,
        lng: 121.0225,
        radiusM: 150,
        opportunityScore: 83,
        potentialLevel: 'high',
        expectedBusyTime: '5:30 PM – 9:30 PM',
        expectedBusyTimeTl: '5:30 PM – 9:30 PM (Palarong Liga at Exhibition Games)',
        daysActive: 'Biyernes hanggang Linggo',
        explanationTl: 'Regular na paliga sa barangay. Mabilis maubos ang malamig na inumin at pampalamig pagkatapos ng bawat quarter.',
        explanationEn: 'Neighborhood basketball tournament with active spectators and players purchasing snacks and iced drinks.',
        estimatedCrowd: '~480 manonood',
        dataSourceLabel: 'Barangay Sports Bulletin (Tantiyang Datos)',
      },
      {
        id: 'hotspot-makati-buendia-bus',
        name: 'Buendia (Gil Puyat) Bus & Jeepney Interchange',
        nameTl: 'Buendia Bus & Jeepney Interchange',
        category: 'commuter',
        lat: 14.5595,
        lng: 121.0180,
        radiusM: 190,
        opportunityScore: 88,
        potentialLevel: 'high',
        expectedBusyTime: '6:00 AM – 9:00 AM & 5:00 PM – 8:30 PM',
        expectedBusyTimeTl: '6:00 AM – 9:00 AM & 5:00 PM – 8:30 PM (Buendia Transit Hub)',
        daysActive: 'Lunes hanggang Sabado',
        explanationTl: 'Interchange ng mga bus papuntang Alabang at Pasay LRT. Mataas ang demand para sa almusal at gabing pagkain.',
        explanationEn: 'Busiest east-west thoroughfare transit node in Makati serving thousands of transit transfers.',
        estimatedCrowd: '~4,600 pasahero',
        dataSourceLabel: 'Commuter Rush Window (Tantiyang Datos)',
      },
    ],
  },

  // 4. Bonifacio Global City, Taguig
  {
    id: 'taguig-bgc',
    name: 'Bonifacio Global City, Taguig',
    lat: 14.5490,
    lng: 121.0495,
    hotspots: [
      {
        id: 'hotspot-bgc-market-market',
        name: 'Market! Market! Central Jeepney & Bus Terminal',
        nameTl: 'Market! Market! Central Transport Terminal',
        category: 'commuter',
        lat: 14.5495,
        lng: 121.0550,
        radiusM: 200,
        opportunityScore: 96,
        potentialLevel: 'high',
        expectedBusyTime: '5:00 PM – 9:00 PM',
        expectedBusyTimeTl: '5:00 PM – 9:00 PM (Uwian ng mga Kawani sa BGC)',
        daysActive: 'Lunes hanggang Sabado',
        explanationTl: 'Pangunahing sakayan ng mga BPO workers at retail staff papuntang Pasig, Taguig, Pateros, at Makati.',
        explanationEn: 'Major public transit terminal for BGC workers connecting to surrounding residential cities.',
        estimatedCrowd: '~8,000 commuters per hour',
        dataSourceLabel: 'Transit Terminal Log (Tantiyang Datos)',
      },
      {
        id: 'hotspot-bgc-fort-high',
        name: 'Fort Bonifacio High School & 32nd St.',
        nameTl: 'Fort Bonifacio High School & Tawiran',
        category: 'school',
        lat: 14.5535,
        lng: 121.0540,
        radiusM: 180,
        opportunityScore: 89,
        potentialLevel: 'high',
        expectedBusyTime: '12:00 PM – 1:30 PM & 4:30 PM – 6:30 PM',
        expectedBusyTimeTl: '12:00 PM – 1:30 PM & 4:30 PM – 6:30 PM (Uwian ng mga Estudyante)',
        daysActive: 'Lunes hanggang Biyernes',
        explanationTl: 'Malaking pampublikong paaralan sa gilid ng BGC na may libo-libong estudyanteng bumibili ng meryenda.',
        explanationEn: 'Public high school dismissals bordering BGC with heavy afternoon foot traffic for street food.',
        estimatedCrowd: '~2,900 estudyante',
        isSchoolSchedule: true,
        schoolGrades: 'Grades 7–12',
        dataSourceLabel: 'School Calendar (Tantiyang Datos)',
      },
      {
        id: 'hotspot-bgc-kalayaan-trike',
        name: 'Kalayaan Ave. Tricycle & Jeep Interchange',
        nameTl: 'Kalayaan Ave. & Guadalupe Tricycle Hub',
        category: 'commuter',
        lat: 14.5575,
        lng: 121.0480,
        radiusM: 170,
        opportunityScore: 91,
        potentialLevel: 'high',
        expectedBusyTime: '6:00 AM – 9:00 AM & 5:00 PM – 8:30 PM',
        expectedBusyTimeTl: '6:00 AM – 9:00 AM & 5:00 PM – 8:30 PM (Sakayan papuntang Guadalupe MRT)',
        daysActive: 'Araw-araw',
        explanationTl: 'Pangunahing tawiran at sakayan ng mga nagtatrabaho sa BGC na nagmumula sa Guadalupe at Makati.',
        explanationEn: 'High-density commuter pinch point where thousands walk between BGC and Guadalupe transit.',
        estimatedCrowd: '~5,200 pasahero',
        dataSourceLabel: 'Commuter Flow Radar (Tantiyang Datos)',
      },
      {
        id: 'hotspot-bgc-south-cembo-court',
        name: 'Barangay South Cembo Covered Basketball Court',
        nameTl: 'Brgy. South Cembo Covered Court (Liga ng Barangay)',
        category: 'basketball',
        lat: 14.5560,
        lng: 121.0535,
        radiusM: 150,
        opportunityScore: 84,
        potentialLevel: 'high',
        expectedBusyTime: '5:30 PM – 9:30 PM',
        expectedBusyTimeTl: '5:30 PM – 9:30 PM (Panggabing Paliga)',
        daysActive: 'Biyernes, Sabado, at Linggo',
        explanationTl: 'Masiglang paliga ng purok na may maraming manonood at manlalaro na sabik sa malamig na inumin at meryenda.',
        explanationEn: 'Dense neighborhood court hosting evening games with strong spectator appetite for street foods.',
        estimatedCrowd: '~550 katao',
        dataSourceLabel: 'Barangay Sports Bulletin (Tantiyang Datos)',
      },
    ],
  },

  // 5. Ortigas Center, Pasig / Mandaluyong
  {
    id: 'pasig-ortigas',
    name: 'Ortigas Center, Pasig / Mandaluyong',
    lat: 14.5866,
    lng: 121.0610,
    hotspots: [
      {
        id: 'hotspot-ortigas-mrt',
        name: 'MRT-3 Ortigas & SM Megamall Terminal',
        nameTl: 'MRT-3 Ortigas & SM Megamall Terminal',
        category: 'commuter',
        lat: 14.5845,
        lng: 121.0575,
        radiusM: 200,
        opportunityScore: 95,
        potentialLevel: 'high',
        expectedBusyTime: '5:00 PM – 9:00 PM',
        expectedBusyTimeTl: '5:00 PM – 9:00 PM (EDSA Panggabing Rush)',
        daysActive: 'Lunes hanggang Sabado',
        explanationTl: 'Isa sa pinaka-abalang istasyon ng MRT sa EDSA kung saan nagtatagpo ang libo-libong manggagawa sa Ortigas.',
        explanationEn: 'Major MRT-3 station and mall transit interchange with constant commuter movement.',
        estimatedCrowd: '~7,800 pasahero bawat oras',
        dataSourceLabel: 'Transit Flow Monitor (Tantiyang Datos)',
      },
      {
        id: 'hotspot-ortigas-poveda',
        name: 'St. Pedro Poveda College & EDSA Gate',
        nameTl: 'St. Pedro Poveda College & Tawiran Gate',
        category: 'school',
        lat: 14.5890,
        lng: 121.0595,
        radiusM: 170,
        opportunityScore: 87,
        potentialLevel: 'high',
        expectedBusyTime: '3:00 PM – 5:30 PM',
        expectedBusyTimeTl: '3:00 PM – 5:30 PM (Uwian ng mga Mag-aaral)',
        daysActive: 'Lunes hanggang Biyernes',
        explanationTl: 'Uwian ng mga mag-aaral at mga tagasundo sa may EDSA-Ortigas corridor.',
        explanationEn: 'Private school dismissal generating heavy foot traffic and snack demand along EDSA service roads.',
        estimatedCrowd: '~2,100 estudyante at sundo',
        isSchoolSchedule: true,
        schoolGrades: 'Basic Education',
        dataSourceLabel: 'School Schedule (Tantiyang Datos)',
      },
      {
        id: 'hotspot-ortigas-meralco-uv',
        name: 'Meralco Ave. UV Express Loading Area',
        nameTl: 'Meralco Ave. UV Express & Bus Bay',
        category: 'commuter',
        lat: 14.5855,
        lng: 121.0655,
        radiusM: 180,
        opportunityScore: 91,
        potentialLevel: 'high',
        expectedBusyTime: '5:00 PM – 8:30 PM',
        expectedBusyTimeTl: '5:00 PM – 8:30 PM (Pila ng UV papuntang Rizal at Pasig)',
        daysActive: 'Lunes hanggang Biyernes',
        explanationTl: 'Mahahabang pila ng UV Express papuntang Cainta, Taytay, at Antipolo. Mataas ang benta ng mani, balot, at inumin.',
        explanationEn: 'Heavy commuter queues waiting for UV Express vans heading to eastern Rizal towns.',
        estimatedCrowd: '~4,200 pasahero',
        dataSourceLabel: 'Commuter Rush Window (Tantiyang Datos)',
      },
      {
        id: 'hotspot-ortigas-san-antonio-court',
        name: 'Barangay San Antonio Multi-Purpose Covered Court',
        nameTl: 'Brgy. San Antonio Covered Court (Liga ng Komunidad)',
        category: 'basketball',
        lat: 14.5820,
        lng: 121.0640,
        radiusM: 150,
        opportunityScore: 81,
        potentialLevel: 'high',
        expectedBusyTime: '5:30 PM – 9:30 PM',
        expectedBusyTimeTl: '5:30 PM – 9:30 PM (Inter-Purok Basketball)',
        daysActive: 'Biyernes at Sabado',
        explanationTl: 'Barangay covered court na may palarong panggabi at tuloy-tuloy na foot traffic mula sa mga residente.',
        explanationEn: 'Community court hosting leagues and pickup games with strong beverage and snack demand.',
        estimatedCrowd: '~420 katao',
        dataSourceLabel: 'Barangay Sports Bulletin (Tantiyang Datos)',
      },
    ],
  },

  // 6. Monumento Circle, Caloocan
  {
    id: 'caloocan-monumento',
    name: 'Monumento Circle, Caloocan',
    lat: 14.6575,
    lng: 120.9836,
    hotspots: [
      {
        id: 'hotspot-monumento-lrt',
        name: 'LRT-1 Monumento Station & MCU Footbridge',
        nameTl: 'LRT-1 Monumento Station & MCU Tawiran',
        category: 'commuter',
        lat: 14.6570,
        lng: 120.9830,
        radiusM: 200,
        opportunityScore: 96,
        potentialLevel: 'high',
        expectedBusyTime: '6:00 AM – 9:00 AM & 5:00 PM – 9:00 PM',
        expectedBusyTimeTl: '6:00 AM – 9:00 AM & 5:00 PM – 9:00 PM (LRT & Bus Transit Peak)',
        daysActive: 'Araw-araw',
        explanationTl: 'Pangunahing transport gateway ng Hilagang Kalakhang Maynila (Caloocan, Malabon, Navotas, Valenzuela).',
        explanationEn: 'Major northern Metro Manila transit gateway with massive daily pedestrian transfer volumes.',
        estimatedCrowd: '~8,900 pasahero bawat oras',
        dataSourceLabel: 'Transit Flow Monitor (Tantiyang Datos)',
      },
      {
        id: 'hotspot-monumento-mcu',
        name: 'Manila Central University (MCU) Campus Gates',
        nameTl: 'MCU Campus Gates & EDSA Crosswalk',
        category: 'school',
        lat: 14.6590,
        lng: 120.9860,
        radiusM: 180,
        opportunityScore: 92,
        potentialLevel: 'high',
        expectedBusyTime: '12:00 PM – 1:30 PM & 4:30 PM – 6:30 PM',
        expectedBusyTimeTl: '12:00 PM – 1:30 PM & 4:30 PM – 6:30 PM (Tanghalian at Uwian)',
        daysActive: 'Lunes hanggang Sabado',
        explanationTl: 'Dagsaan ng mga mag-aaral ng medisina, nursing, at college batches na naghahanap ng mabilisang makakain.',
        explanationEn: 'Large university campus gate with continuous flow of hungry students and medical staff.',
        estimatedCrowd: '~3,600 estudyante',
        isSchoolSchedule: true,
        schoolGrades: 'Higher Education & SHS',
        dataSourceLabel: 'University Dismissal Log (Tantiyang Datos)',
      },
      {
        id: 'hotspot-monumento-brgy73-court',
        name: 'Barangay 73 Covered Basketball Court',
        nameTl: 'Brgy. 73 Covered Court (Paliga ng Kabataan)',
        category: 'basketball',
        lat: 14.6550,
        lng: 120.9875,
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

  // 7. Cebu IT Park / Colon, Cebu City
  {
    id: 'cebu-itpark',
    name: 'Cebu IT Park / Colon, Cebu City',
    lat: 10.3283,
    lng: 123.9061,
    hotspots: [
      {
        id: 'hotspot-cebu-it-terminal',
        name: 'Cebu IT Park Transport Terminal & Garden Bloc',
        nameTl: 'Cebu IT Park Transport Terminal & Garden Bloc',
        category: 'commuter',
        lat: 10.3295,
        lng: 123.9065,
        radiusM: 200,
        opportunityScore: 95,
        potentialLevel: 'high',
        expectedBusyTime: '5:00 PM – 9:30 PM',
        expectedBusyTimeTl: '5:00 PM – 9:30 PM (BPO Shift Turnover at Jeepney Terminal)',
        daysActive: 'Araw-araw',
        explanationTl: 'Sentro ng mga BPO workers at commuters sa Cebu City. Mataas ang demand para sa streetfood merienda at inumin.',
        explanationEn: 'Central BPO and transit terminal in Cebu with continuous 24/7 commuter traffic for snacks.',
        estimatedCrowd: '~6,500 commuters per hour',
        dataSourceLabel: 'Cebu Transit Monitor (Tantiyang Datos)',
      },
      {
        id: 'hotspot-cebu-colon-hub',
        name: 'Colon Street & Metro Colon Jeepney Hub',
        nameTl: 'Colon Street & Metro Colon Jeepney Hub',
        category: 'commuter',
        lat: 10.2985,
        lng: 123.9000,
        radiusM: 190,
        opportunityScore: 94,
        potentialLevel: 'high',
        expectedBusyTime: '4:30 PM – 8:30 PM',
        expectedBusyTimeTl: '4:30 PM – 8:30 PM (Makasaysayang Sakayan ng Colon)',
        daysActive: 'Lunes hanggang Sabado',
        explanationTl: 'Pinakamatandang kalye sa Pilipinas na sentro pa rin ng libo-libong pasahero ng jeep papuntang Mandaue, Talisay, at Pardo.',
        explanationEn: 'Historic commercial center and massive jeepney corridor with high pedestrian volume.',
        estimatedCrowd: '~5,800 pasahero',
        dataSourceLabel: 'Downtown Transit Log (Tantiyang Datos)',
      },
      {
        id: 'hotspot-cebu-usc',
        name: 'University of San Carlos (USC) Downtown Campus Gate',
        nameTl: 'USC Downtown Campus Gate & P. Del Rosario St.',
        category: 'school',
        lat: 10.3005,
        lng: 123.8990,
        radiusM: 180,
        opportunityScore: 93,
        potentialLevel: 'high',
        expectedBusyTime: '3:30 PM – 6:30 PM',
        expectedBusyTimeTl: '3:30 PM – 6:30 PM (Uwian ng mga Mag-aaral)',
        daysActive: 'Lunes hanggang Biyernes',
        explanationTl: 'Dagsaan ng mga estudyante ng San Carlos papuntang Colon jeepney stops.',
        explanationEn: 'Major downtown university campus generating intense snack demand during dismissal.',
        estimatedCrowd: '~4,100 estudyante',
        isSchoolSchedule: true,
        schoolGrades: 'College & Senior High',
        dataSourceLabel: 'University Schedule (Tantiyang Datos)',
      },
      {
        id: 'hotspot-cebu-kamagayan-court',
        name: 'Barangay Kamagayan Sports Complex & Court',
        nameTl: 'Brgy. Kamagayan Sports Complex (Liga sa Barangay)',
        category: 'basketball',
        lat: 10.3030,
        lng: 123.8980,
        radiusM: 150,
        opportunityScore: 82,
        potentialLevel: 'high',
        expectedBusyTime: '5:30 PM – 9:30 PM',
        expectedBusyTimeTl: '5:30 PM – 9:30 PM (Panggabing Palaro)',
        daysActive: 'Biyernes hanggang Linggo',
        explanationTl: 'Masiglang paliga sa sentro ng siyudad na dinudumog ng mga lokal na manlalaro at manonood.',
        explanationEn: 'Central city sports court hosting evening leagues with high cold refreshment demand.',
        estimatedCrowd: '~450 katao',
        dataSourceLabel: 'Barangay Sports Bulletin (Tantiyang Datos)',
      },
    ],
  },

  // 8. Roxas Night Market, Davao City
  {
    id: 'davao-roxas',
    name: 'Roxas Night Market, Davao City',
    lat: 7.0673,
    lng: 125.6083,
    hotspots: [
      {
        id: 'hotspot-davao-roxas-market',
        name: 'Roxas Avenue Night Market Main Entrance',
        nameTl: 'Roxas Avenue Night Market Main Entrance',
        category: 'commuter',
        lat: 7.0680,
        lng: 125.6080,
        radiusM: 200,
        opportunityScore: 97,
        potentialLevel: 'high',
        expectedBusyTime: '6:00 PM – 11:30 PM',
        expectedBusyTimeTl: '6:00 PM – 11:30 PM (Gabi ng Pagkain at Tiangge)',
        daysActive: 'Araw-araw ng Gabi',
        explanationTl: 'Pinakatanyag na night market sa Mindanao. Libo-libong lokal at turista ang nagtitipon para sa masasarap na streetfood, inumin, at hapunan.',
        explanationEn: 'Premier open-air evening street food strip drawing thousands of hungry diners nightly.',
        estimatedCrowd: '~7,200 katao gabi-gabi',
        dataSourceLabel: 'Davao Tourism & Market Bulletin (Tantiyang Datos)',
      },
      {
        id: 'hotspot-davao-addu',
        name: 'Ateneo de Davao University (ADDU) Roxas Gate',
        nameTl: 'Ateneo de Davao Roxas Gate & Pedestrian Walkway',
        category: 'school',
        lat: 7.0695,
        lng: 125.6095,
        radiusM: 180,
        opportunityScore: 92,
        potentialLevel: 'high',
        expectedBusyTime: '11:30 AM – 1:30 PM & 4:30 PM – 6:30 PM',
        expectedBusyTimeTl: '11:30 AM – 1:30 PM & 4:30 PM – 6:30 PM (Tanghalian at Uwian)',
        daysActive: 'Lunes hanggang Biyernes',
        explanationTl: 'Uwian ng mga mag-aaral ng Ateneo de Davao. Maraming tumatambay at bumibili ng miryenda bago sumakay ng jeep o tricycle.',
        explanationEn: 'University campus gate generating strong afternoon snack and iced drink purchases.',
        estimatedCrowd: '~3,900 mag-aaral',
        isSchoolSchedule: true,
        schoolGrades: 'Higher Education & SHS',
        dataSourceLabel: 'University Dismissal Log (Tantiyang Datos)',
      },
      {
        id: 'hotspot-davao-peoples-park',
        name: 'People’s Park Davao & Community Plaza',
        nameTl: 'People’s Park Davao & Rizal Park Plaza',
        category: 'barangay',
        lat: 7.0715,
        lng: 125.6050,
        radiusM: 160,
        opportunityScore: 84,
        potentialLevel: 'high',
        expectedBusyTime: '4:00 PM – 8:30 PM',
        expectedBusyTimeTl: '4:00 PM – 8:30 PM (Pampublikong Liwasan at Pasyalan)',
        daysActive: 'Araw-araw',
        explanationTl: 'Malawak na pasyalan ng mga pamilya, bata, at joggers. Mabilis maubos ang taho, palamig, at finger foods.',
        explanationEn: 'Major civic park and family recreation grounds with steady afternoon and evening snack seekers.',
        estimatedCrowd: '~2,100 katao',
        dataSourceLabel: 'City Parks Notice (Tantiyang Datos)',
      },
      {
        id: 'hotspot-davao-brgy32-court',
        name: 'Barangay 32-D Covered Basketball Court',
        nameTl: 'Brgy. 32-D Covered Court (Inter-Purok Cup)',
        category: 'basketball',
        lat: 7.0650,
        lng: 125.6110,
        radiusM: 150,
        opportunityScore: 80,
        potentialLevel: 'high',
        expectedBusyTime: '5:30 PM – 9:30 PM',
        expectedBusyTimeTl: '5:30 PM – 9:30 PM (Paliga ng Komunidad)',
        daysActive: 'Biyernes hanggang Linggo',
        explanationTl: 'Palaro ng basketball na dinudumog ng mga kabataan at pamilya sa purok.',
        explanationEn: 'Neighborhood basketball games attracting local residents for evening refreshments.',
        estimatedCrowd: '~430 katao',
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
  bounds?: ViewportBounds
): DemandHotspot[] {
  // Determine coordinate span to distribute hotspots nicely within view
  const latSpan = bounds ? Math.abs(bounds.north - bounds.south) : 0.012;
  const lngSpan = bounds ? Math.abs(bounds.east - bounds.west) : 0.014;

  // Clamped offsets so hotspots appear naturally in the neighborhood
  const dLat = Math.min(0.005, Math.max(0.0012, latSpan * 0.25));
  const dLng = Math.min(0.006, Math.max(0.0014, lngSpan * 0.25));

  // Spatial grid key for stable IDs
  const gridKey = `${Math.round(centerLat * 100)}_${Math.round(centerLng * 100)}`;

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
    lat: Number((centerLat + t.latOff).toFixed(5)),
    lng: Number((centerLng + t.lngOff).toFixed(5)),
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

  // 1. Always include user-added custom hotspots that fall within the visible viewport bounds
  for (const c of custom) {
    if (isCoordWithinBounds(c.lat, c.lng, bounds, 0.2)) {
      candidates.push(c);
    }
  }

  // 2. Find any known preset hubs located within 3.5km of center OR inside the viewport bounds
  let foundPreset = false;
  for (const hub of PRESET_HUBS) {
    const distToHub = distanceInMeters(centerLat, centerLng, hub.lat, hub.lng);
    const hubInBounds = isCoordWithinBounds(hub.lat, hub.lng, bounds, 0.2);

    if (distToHub <= 3500 || hubInBounds) {
      foundPreset = true;
      for (const h of hub.hotspots) {
        if (isCoordWithinBounds(h.lat, h.lng, bounds, 0.25)) {
          candidates.push(h);
        }
      }
    }
  }

  // 3. If no preset hub is in view (or if very few candidates were found in the visible area),
  // generate geographically localized demo hotspots positioned within the visible viewport.
  if (!foundPreset || candidates.length < 3) {
    const demoHotspots = generateDynamicDemoHotspots(centerLat, centerLng, bounds);
    for (const d of demoHotspots) {
      if (isCoordWithinBounds(d.lat, d.lng, bounds, 0.1)) {
        candidates.push(d);
      }
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
