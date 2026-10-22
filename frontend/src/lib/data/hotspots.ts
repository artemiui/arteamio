import type { DemandHotspot, DemandHotspotCategory, DemandPotentialLevel, SchoolDismissalConfig, CommunityEventConfig } from '../types';

export const HOTSPOT_CATEGORY_META: Record<
  DemandHotspotCategory,
  { icon: string; labelTl: string; labelEn: string; color: string; bgLight: string; bgDark: string }
> = {
  school: {
    icon: '🎓',
    labelTl: 'Uwian ng Estudyante',
    labelEn: 'School Dismissals',
    color: '#2563EB',
    bgLight: '#DBEAFE',
    bgDark: '#1E3A8A',
  },
  basketball: {
    icon: '🏀',
    labelTl: 'Palaro / Liga sa Court',
    labelEn: 'Basketball Games',
    color: '#EA580C',
    bgLight: '#FFEDD5',
    bgDark: '#7C2D12',
  },
  barangay: {
    icon: '🎪',
    labelTl: 'Kaganapan sa Barangay',
    labelEn: 'Barangay Events',
    color: '#059669',
    bgLight: '#D1FAE5',
    bgDark: '#064E3B',
  },
  commuter: {
    icon: '🚌',
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
    iconEmoji: '🔴',
  },
  medium: {
    labelTl: 'Katamtamang Potensyal',
    labelEn: 'Medium Potential',
    badgeColor: '#D97706',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    mapStroke: '#EA580C',
    mapFill: '#F97316',
    iconEmoji: '🟠',
  },
  low: {
    labelTl: 'Mababang Potensyal',
    labelEn: 'Low Potential',
    badgeColor: '#CA8A04',
    badgeBg: 'rgba(234, 179, 8, 0.15)',
    mapStroke: '#CA8A04',
    mapFill: '#EAB308',
    iconEmoji: '🟡',
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

/**
 * Default realistic hotspots anchored around España / Sampaloc, Manila (Lat: 14.6091, Lng: 120.9898)
 * Clearly labeled as estimated demand and sample/community-configured schedules.
 */
export function getBaseHotspotsAround(centerLat: number, centerLng: number): DemandHotspot[] {
  return [
    {
      id: 'hotspot-ust-gates',
      name: 'UST España & Dapitan Campus Gates',
      nameTl: 'UST España at Dapitan Campus Gates',
      category: 'school',
      lat: centerLat + 0.0006,
      lng: centerLng - 0.0004,
      radiusM: 190,
      opportunityScore: 95,
      potentialLevel: 'high',
      expectedBusyTime: '3:30 PM – 6:30 PM',
      expectedBusyTimeTl: '3:30 PM – 6:30 PM (Sunod-sunod na Uwian ng JHS, SHS, at Kolehiyo)',
      daysActive: 'Lunes hanggang Biyernes',
      explanationTl:
        'Sabay-sabay na dismissal ng mga mag-aaral mula sa España, Noval, at Dapitan gates. Pagod at gutom ang mga estudyante bago sumakay ng jeep o UV, kaya mabilis maubos ang taho, siomai rice, at pampalamig.',
      explanationEn:
        'Staggered dismissal of Junior High, Senior High, and College students. High student density flowing toward España jeepney and UV queues with strong appetite for afternoon snacks.',
      estimatedCrowd: '~5,200 estudyante at guro (Tantiyang Dami)',
      isSchoolSchedule: true,
      schoolGrades: 'JHS, SHS, at College Batches',
      dataSourceLabel: 'Iskedyul ng Klase (Tantiyang Datos)',
    },
    {
      id: 'hotspot-espana-terminal',
      name: 'España Lacson UV Express & Jeepney Loading Hub',
      nameTl: 'España Lacson UV Express & Jeepney Loading Hub',
      category: 'commuter',
      lat: centerLat - 0.0011,
      lng: centerLng + 0.0016,
      radiusM: 170,
      opportunityScore: 92,
      potentialLevel: 'high',
      expectedBusyTime: '5:00 PM – 8:30 PM',
      expectedBusyTimeTl: '5:00 PM – 8:30 PM (Panggabing Rush Hour sa Pag-uwi)',
      daysActive: 'Araw-araw (Lunes hanggang Sabado)',
      explanationTl:
        'Pangunahing sakayan ng mga manggagawa at estudyante pauwi ng Quezon City, Fairview, at San Jose Del Monte. Mahahabang pila sa sakayan kung saan mataas ang demand sa mabilisang kain gaya ng mainit na balot, siomai, at mani.',
      explanationEn:
        'Heavy commuter interchange connecting Manila to Quezon City and Fairview. Long transit queues create high purchase impulse for portable finger foods and balut.',
      estimatedCrowd: '~4,500 pasahero bawat oras (Tantiyang Dami)',
      dataSourceLabel: 'Commuter Rush Window (Tantiyang Datos)',
    },
    {
      id: 'hotspot-rmhs-school',
      name: 'Ramon Magsaysay High School & Footbridge',
      nameTl: 'Ramon Magsaysay High School & Tawiran',
      category: 'school',
      lat: centerLat - 0.0035,
      lng: centerLng + 0.0022,
      radiusM: 180,
      opportunityScore: 88,
      potentialLevel: 'high',
      expectedBusyTime: '11:45 AM – 1:15 PM & 4:30 PM – 6:00 PM',
      expectedBusyTimeTl: '11:45 AM – 1:15 PM & 4:30 PM – 6:00 PM (Shift Turnover & Dismissal)',
      daysActive: 'Lunes hanggang Biyernes',
      explanationTl:
        'Palitan ng pang-umaga at panggabing shift ng libo-libong high school students. Bulto ng kabataan ay nagtitipon sa tapat ng gate at footbridge para sa abot-kayang merienda.',
      explanationEn:
        'Morning and afternoon shift dismissal of public high school students converging around the pedestrian footbridge seeking budget-friendly snacks.',
      estimatedCrowd: '~2,800 estudyante bawat shift (Tantiyang Dami)',
      isSchoolSchedule: true,
      schoolGrades: 'Grades 7–12 (Pang-umaga at Panggabi)',
      dataSourceLabel: 'DepEd Shift Calendar (Tantiyang Datos)',
    },
    {
      id: 'hotspot-brgy398-court',
      name: 'Barangay 398 Covered Court (Inter-Purok Basketball Liga)',
      nameTl: 'Brgy. 398 Covered Basketball Court (Inter-Purok Cup)',
      category: 'basketball',
      lat: centerLat + 0.0028,
      lng: centerLng - 0.0021,
      radiusM: 150,
      opportunityScore: 84,
      potentialLevel: 'high',
      expectedBusyTime: '5:30 PM – 9:30 PM',
      expectedBusyTimeTl: '5:30 PM – 9:30 PM (Palarong Liga at Exhibition Games)',
      daysActive: 'Biyernes, Sabado, at Linggo ng Gabi',
      explanationTl:
        'Barangay basketball championship tournament. Ang mga manonood, kapitbahay, at manlalaro ay tuloy-tuloy ang pagbili ng pampalamig na gulaman, balot, chicharon, at siomai habang umiinit ang laban.',
      explanationEn:
        'Weekend inter-purok basketball tournament drawing local neighborhood crowds and sports fans seeking cold refreshments and hot evening snacks.',
      estimatedCrowd: '~450 - 650 manonood at manlalaro (Tantiyang Dami)',
      dataSourceLabel: 'Barangay Sports Bulletin (Sample Community Event)',
    },
    {
      id: 'hotspot-brgy412-plaza',
      name: 'Barangay 412 Community Hall & Plaza (Asembleya & Kadiwa)',
      nameTl: 'Brgy. 412 Hall & Plaza (Asembleya ng Komunidad)',
      category: 'barangay',
      lat: centerLat - 0.0022,
      lng: centerLng - 0.0028,
      radiusM: 140,
      opportunityScore: 74,
      potentialLevel: 'medium',
      expectedBusyTime: '8:00 AM – 11:30 AM & 2:00 PM – 5:00 PM',
      expectedBusyTimeTl: '8:00 AM – 11:30 AM & 2:00 PM – 5:00 PM (Asembleya at Ayuda Distribution)',
      daysActive: 'Tuwing Unang Linggo at Miyerkules',
      explanationTl:
        'Asembleya ng barangay at pamamahagi ng tulong pangkalusugan. Maraming nanay at lolo/lola na kasama ang mga bata. Magandang pwesto para sa mainit na taho sa umaga o merienda sa hapon.',
      explanationEn:
        'Community general assembly and civic services bringing families and seniors into the plaza area with steady morning and mid-afternoon snack appetite.',
      estimatedCrowd: '~650 residente (Tantiyang Dami)',
      dataSourceLabel: 'Barangay Community Notice (Sample Community Event)',
    },
    {
      id: 'hotspot-noval-pickup',
      name: 'P. Noval Covered Half-Court Pickup Games',
      nameTl: 'P. Noval Half-Court (Paliga ng Kabataan)',
      category: 'basketball',
      lat: centerLat - 0.0014,
      lng: centerLng - 0.0018,
      radiusM: 120,
      opportunityScore: 68,
      potentialLevel: 'medium',
      expectedBusyTime: '4:00 PM – 7:30 PM',
      expectedBusyTimeTl: '4:00 PM – 7:30 PM (After-School 3-on-3 Pickup Games)',
      daysActive: 'Lunes hanggang Sabado ng Hapon',
      explanationTl:
        'Araw-araw na 3-on-3 pickup basketball games ng mga estudyante pagkatapos ng klase. Uhaw at gutom ang mga manlalaro pagkatapos ng laro, malakas ang benta ng inumin at merienda.',
      explanationEn:
        'Daily casual half-court basketball pickup games with student dormers and local youth looking for drinks and merienda right after playing.',
      estimatedCrowd: '~180 - 260 kabataan (Tantiyang Dami)',
      dataSourceLabel: 'Sample Community Sports Log',
    },
    {
      id: 'hotspot-trabajo-toda',
      name: 'Trabajo Public Market & Lacson TODA Terminal',
      nameTl: 'Trabajo Public Market & TODA Terminal',
      category: 'commuter',
      lat: centerLat - 0.0031,
      lng: centerLng + 0.0042,
      radiusM: 160,
      opportunityScore: 65,
      potentialLevel: 'medium',
      expectedBusyTime: '6:00 AM – 9:00 AM & 4:30 PM – 7:00 PM',
      expectedBusyTimeTl: '6:00 AM – 9:00 AM & 4:30 PM – 7:00 PM (Palengke & Tricycle Rush)',
      daysActive: 'Araw-araw',
      explanationTl:
        'Terminal ng mga traysikel papuntang mga panloob na kalye ng Sampaloc kasabay ng mga namamalengke. May tuloy-tuloy na foot traffic.',
      explanationEn:
        'Neighborhood wet market and tricycle terminal servicing interior residential alleys with steady morning marketgoers and evening commuters.',
      estimatedCrowd: '~1,300 pasahero at mamimili (Tantiyang Dami)',
      dataSourceLabel: 'Sample Transport Terminal Log',
    },
    {
      id: 'hotspot-cayco-pocket',
      name: 'F. Cayco St. Purok Pocket Plaza & Waiting Shed',
      nameTl: 'F. Cayco St. Purok Waiting Area',
      category: 'barangay',
      lat: centerLat + 0.0022,
      lng: centerLng + 0.0034,
      radiusM: 110,
      opportunityScore: 45,
      potentialLevel: 'low',
      expectedBusyTime: '1:00 PM – 3:30 PM',
      expectedBusyTimeTl: '1:00 PM – 3:30 PM (Tahimik na Oras sa Loobang Purok)',
      daysActive: 'Araw-araw',
      explanationTl:
        'Panloob na kalye ng purok. Mababa ang mabilisang bugso ng tao kumpara sa mga sakayan, ngunit dahil walang ibang nagtitinda ay madaling maging suki ang mga kapitbahay.',
      explanationEn:
        'Quiet interior residential pocket alley with modest casual foot traffic. Lower volume but zero competition makes it suitable for steady neighborhood suki.',
      estimatedCrowd: '~90 residente (Tantiyang Dami)',
      dataSourceLabel: 'Sample Purok Assessment (Estimated Demand)',
    },
  ];
}

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

/**
 * Merges base realistic sample hotspots for a given coordinate center
 * with user-added custom community events and configured school dismissal schedules.
 */
export function getAllDemandHotspots(centerLat: number, centerLng: number): DemandHotspot[] {
  const base = getBaseHotspotsAround(centerLat, centerLng);
  const custom = loadCustomHotspots();

  // Combine custom hotspots first, then base hotspots
  const all = [...custom, ...base];

  // Sort by opportunity score descending
  return all.sort((a, b) => b.opportunityScore - a.opportunityScore);
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
