import type { BusinessArchetype, CompetitorNode, ProductType, TaggedVendor, TransitAnchor } from '../types';

export interface MetroHubPreset {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  icon: string;
}

export const PHILIPPINE_METRO_HUBS: MetroHubPreset[] = [
  { id: 'manila-espana', name: 'España / Sampaloc', region: 'Manila', lat: 14.6091, lng: 120.9898, icon: 'map-pin' },
  { id: 'qc-cubao', name: 'Araneta City / Cubao', region: 'Quezon City', lat: 14.6200, lng: 121.0530, icon: 'bus' },
  { id: 'makati-ayala', name: 'Ayala / Poblacion', region: 'Makati', lat: 14.5547, lng: 121.0244, icon: 'map-pin' },
  { id: 'taguig-bgc', name: 'Bonifacio Global City', region: 'Taguig', lat: 14.5490, lng: 121.0495, icon: 'map-pin' },
  { id: 'pasig-ortigas', name: 'Ortigas Center', region: 'Pasig / Mandaluyong', lat: 14.5866, lng: 121.0610, icon: 'bus' },
  { id: 'caloocan-monumento', name: 'Monumento Circle', region: 'Caloocan', lat: 14.6575, lng: 120.9836, icon: 'bus' },
  { id: 'cebu-itpark', name: 'Cebu IT Park / Colon', region: 'Cebu City', lat: 10.3283, lng: 123.9061, icon: 'map-pin' },
  { id: 'davao-roxas', name: 'Roxas Night Market', region: 'Davao City', lat: 7.0673, lng: 125.6083, icon: 'flame' },
];

export const BUSINESS_ARCHETYPES: BusinessArchetype[] = [
  {
    id: 'siomai',
    name: '₱45 Siomai Rice Cart',
    nameTl: '₱45 Siomai Rice Cart',
    icon: 'siomai',
    typicalPrice: 45,
    transitWeight: 1.4,
    competitorPenalty: 1.2,
    idealWalkingRadiusM: 180,
    peakHours: '11:30 AM – 1:30 PM & 5:00 PM – 8:00 PM',
    peakHoursTl: '11:30 AM – 1:30 PM & 5:00 PM – 8:00 PM (Tanghalian at Uwian)',
  },
  {
    id: 'coffee',
    name: '₱120 Iced Coffee Stand',
    nameTl: '₱120 Iced Coffee Stand',
    icon: 'coffee',
    typicalPrice: 120,
    transitWeight: 1.1,
    competitorPenalty: 1.5,
    idealWalkingRadiusM: 250,
    peakHours: '7:30 AM – 10:00 AM & 1:00 PM – 4:00 PM',
    peakHoursTl: '7:30 AM – 10:00 AM & 1:00 PM – 4:00 PM (Pang-gising at Meryenda)',
  },
  {
    id: 'taho',
    name: '₱30 Taho Peddler',
    nameTl: '₱30 Kuya Taho',
    icon: 'bowl',
    typicalPrice: 30,
    transitWeight: 0.9,
    competitorPenalty: 0.8,
    idealWalkingRadiusM: 200,
    peakHours: '6:00 AM – 9:00 AM',
    peakHoursTl: '6:00 AM – 9:00 AM (Almusal at Umaga)',
  },
  {
    id: 'balot',
    name: '₱25 Balot & Penoy',
    nameTl: '₱25 Balot & Penoy',
    icon: 'egg',
    typicalPrice: 25,
    transitWeight: 1.2,
    competitorPenalty: 0.7,
    idealWalkingRadiusM: 220,
    peakHours: '6:00 PM – 10:30 PM',
    peakHoursTl: '6:00 PM – 10:30 PM (Gabi at Inuman/Hapunan)',
  },
];

export const PRODUCT_LEGEND: { type: ProductType; labelTl: string; labelEn: string; icon: string; color: string }[] = [
  { type: 'taho', labelTl: 'Taho', labelEn: 'Taho', icon: 'bowl', color: '#D97706' },
  { type: 'siomai', labelTl: 'Siomai', labelEn: 'Siomai', icon: 'siomai', color: '#B45309' },
  { type: 'balot', labelTl: 'Balot', labelEn: 'Balut', icon: 'egg', color: '#78350F' },
  { type: 'other', labelTl: 'Iba Pa', labelEn: 'Others', icon: 'star', color: '#4A2E1B' },
];

export function generateTaggedVendorsAround(centerLat: number, centerLng: number): TaggedVendor[] {
  return [
    {
      id: 'v-taho-1',
      name: 'Kuya Boyet',
      productType: 'taho',
      productName: 'Mainit na Taho',
      productNameTl: 'Mainit na Taho',
      icon: 'bowl',
      price: '₱30 / baso',
      lat: centerLat + 0.0009,
      lng: centerLng - 0.0008,
      distanceM: 130,
      etaMins: 2,
      status: 'live',
      verifiedPhoto: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'v-siomai-1',
      name: 'Ate Tess Siomai Rice',
      productType: 'siomai',
      productName: 'Pork & Beef Siomai Rice',
      productNameTl: 'Siomai Rice + Gulaman',
      icon: 'siomai',
      price: '₱45 / order',
      lat: centerLat - 0.0011,
      lng: centerLng + 0.0012,
      distanceM: 190,
      etaMins: 3,
      status: 'live',
      verifiedPhoto: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'v-balut-1',
      name: 'Mang Jun Balot',
      productType: 'balut',
      productName: 'Balut, Penoy, Chicharon',
      productNameTl: 'Mainit na Balut 16 Days',
      icon: 'egg',
      price: '₱25 / piraso',
      lat: centerLat + 0.0016,
      lng: centerLng + 0.0014,
      distanceM: 260,
      etaMins: 4,
      status: 'live',
      verifiedPhoto: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'v-other-1',
      name: 'Mang Roger Kape & Merienda',
      productType: 'other',
      productName: 'Malamig na Kape & Turon',
      productNameTl: 'Barako Kape & Turon',
      icon: 'star',
      price: '₱35 / cup',
      lat: centerLat - 0.0017,
      lng: centerLng - 0.0015,
      distanceM: 320,
      etaMins: 5,
      status: 'stopped',
      verifiedPhoto: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'v-taho-2',
      name: 'Kuya Manny',
      productType: 'taho',
      productName: 'Taho Extra Arnibal',
      productNameTl: 'Taho (Extra Arnibal & Sago)',
      icon: 'bowl',
      price: '₱35 / baso',
      lat: centerLat - 0.0022,
      lng: centerLng + 0.0004,
      distanceM: 290,
      etaMins: 4,
      status: 'live',
      verifiedPhoto: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'v-siomai-2',
      name: 'Master Siomai Cart',
      productType: 'siomai',
      productName: 'Japanese & Sharksfin Siomai',
      productNameTl: 'Fried & Steamed Siomai',
      icon: 'siomai',
      price: '₱50 / 4pcs',
      lat: centerLat + 0.0024,
      lng: centerLng - 0.0019,
      distanceM: 380,
      etaMins: 6,
      status: 'live',
      verifiedPhoto: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=400&q=80',
    },
  ];
}

function distM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function generateAnchorsAround(centerLat: number, centerLng: number): TransitAnchor[] {
  let nearestHub: MetroHubPreset | null = null;
  let minDistance = Infinity;

  for (const hub of PHILIPPINE_METRO_HUBS) {
    const d = distM(centerLat, centerLng, hub.lat, hub.lng);
    if (d < minDistance) {
      minDistance = d;
      nearestHub = hub;
    }
  }

  // Anchor naming profiles by hub
  if (nearestHub && minDistance <= 3500) {
    if (nearestHub.id === 'qc-cubao') {
      return [
        { id: 'anchor-jeep-1', name: 'MRT-3 Cubao & Aurora Blvd Jeepney Bay', type: 'jeepney', lat: centerLat + 0.0007, lng: centerLng - 0.0008, weight: 1.0 },
        { id: 'anchor-trike-1', name: 'Farmer’s Plaza Tricycle TODA', type: 'tricycle', lat: centerLat - 0.0008, lng: centerLng - 0.0006, weight: 0.85 },
        { id: 'anchor-bridge-1', name: 'EDSA-Cubao Commuter Footbridge', type: 'school', lat: centerLat + 0.0012, lng: centerLng + 0.0005, weight: 0.95 },
        { id: 'anchor-train-1', name: 'Gateway Bus & Transit Terminal', type: 'train', lat: centerLat - 0.0013, lng: centerLng + 0.0009, weight: 1.2 },
      ];
    }
    if (nearestHub.id === 'makati-ayala') {
      return [
        { id: 'anchor-jeep-1', name: 'One Ayala & MRT-3 UV Express Bay', type: 'jeepney', lat: centerLat + 0.0006, lng: centerLng + 0.0005, weight: 1.0 },
        { id: 'anchor-trike-1', name: 'Poblacion Tricycle TODA Terminal', type: 'tricycle', lat: centerLat - 0.0008, lng: centerLng - 0.0005, weight: 0.85 },
        { id: 'anchor-bridge-1', name: 'Paseo de Roxas Commuter Overpass', type: 'school', lat: centerLat + 0.0011, lng: centerLng - 0.0004, weight: 0.95 },
        { id: 'anchor-train-1', name: 'Buendia Bus & Jeepney Interchange', type: 'train', lat: centerLat - 0.0014, lng: centerLng + 0.0008, weight: 1.2 },
      ];
    }
    if (nearestHub.id === 'taguig-bgc') {
      return [
        { id: 'anchor-jeep-1', name: 'Market! Market! Central Jeepney Bay', type: 'jeepney', lat: centerLat + 0.0008, lng: centerLng + 0.0006, weight: 1.0 },
        { id: 'anchor-trike-1', name: 'Kalayaan Ave Tricycle Terminal', type: 'tricycle', lat: centerLat - 0.0007, lng: centerLng - 0.0006, weight: 0.85 },
        { id: 'anchor-bridge-1', name: '32nd St. Pedestrian Crosswalk Hub', type: 'school', lat: centerLat + 0.0012, lng: centerLng - 0.0003, weight: 0.95 },
        { id: 'anchor-train-1', name: 'BGC Bus Central Depot', type: 'train', lat: centerLat - 0.0013, lng: centerLng + 0.0010, weight: 1.2 },
      ];
    }
    if (nearestHub.id === 'pasig-ortigas') {
      return [
        { id: 'anchor-jeep-1', name: 'MRT-3 Ortigas & Megamall Terminal', type: 'jeepney', lat: centerLat + 0.0007, lng: centerLng - 0.0007, weight: 1.0 },
        { id: 'anchor-trike-1', name: 'San Antonio TODA Terminal', type: 'tricycle', lat: centerLat - 0.0008, lng: centerLng + 0.0006, weight: 0.85 },
        { id: 'anchor-bridge-1', name: 'Ortigas MRT Footbridge', type: 'school', lat: centerLat + 0.0011, lng: centerLng + 0.0004, weight: 0.95 },
        { id: 'anchor-train-1', name: 'Meralco Ave UV Express Gate', type: 'train', lat: centerLat - 0.0014, lng: centerLng - 0.0008, weight: 1.2 },
      ];
    }
    if (nearestHub.id === 'caloocan-monumento') {
      return [
        { id: 'anchor-jeep-1', name: 'Monumento LRT-1 & MCU Bus Bay', type: 'jeepney', lat: centerLat + 0.0007, lng: centerLng + 0.0004, weight: 1.0 },
        { id: 'anchor-trike-1', name: 'Samson Road TODA Terminal', type: 'tricycle', lat: centerLat - 0.0008, lng: centerLng - 0.0006, weight: 0.85 },
        { id: 'anchor-bridge-1', name: 'Monumento Pedestrian Footbridge', type: 'school', lat: centerLat + 0.0012, lng: centerLng - 0.0003, weight: 0.95 },
        { id: 'anchor-train-1', name: '10th Ave Jeepney Terminal', type: 'train', lat: centerLat - 0.0013, lng: centerLng + 0.0008, weight: 1.2 },
      ];
    }
    if (nearestHub.id === 'cebu-itpark') {
      return [
        { id: 'anchor-jeep-1', name: 'Colon Metro Cebu Jeepney Hub', type: 'jeepney', lat: centerLat + 0.0007, lng: centerLng + 0.0005, weight: 1.0 },
        { id: 'anchor-trike-1', name: 'Pelaez St. Tricycle Terminal', type: 'tricycle', lat: centerLat - 0.0008, lng: centerLng - 0.0006, weight: 0.85 },
        { id: 'anchor-bridge-1', name: 'Downtown Pedestrian Footbridge', type: 'school', lat: centerLat + 0.0012, lng: centerLng - 0.0004, weight: 0.95 },
        { id: 'anchor-train-1', name: 'Cebu IT Park Transport Terminal', type: 'train', lat: centerLat - 0.0014, lng: centerLng + 0.0009, weight: 1.2 },
      ];
    }
    if (nearestHub.id === 'davao-roxas') {
      return [
        { id: 'anchor-jeep-1', name: 'Roxas Night Market Jeepney Bay', type: 'jeepney', lat: centerLat + 0.0007, lng: centerLng + 0.0005, weight: 1.0 },
        { id: 'anchor-trike-1', name: 'Claveria Tricycle & Multicab Terminal', type: 'tricycle', lat: centerLat - 0.0008, lng: centerLng - 0.0006, weight: 0.85 },
        { id: 'anchor-bridge-1', name: 'Ateneo Overpass & Walkway', type: 'school', lat: centerLat + 0.0012, lng: centerLng - 0.0004, weight: 0.95 },
        { id: 'anchor-train-1', name: 'Recto Ave Transit Node', type: 'train', lat: centerLat - 0.0014, lng: centerLng + 0.0009, weight: 1.2 },
      ];
    }
    if (nearestHub.id === 'manila-espana') {
      return [
        { id: 'anchor-jeep-1', name: 'España Jeepney / UV Express Loading Bay', type: 'jeepney', lat: centerLat + 0.0007, lng: centerLng + 0.0005, weight: 1.0 },
        { id: 'anchor-trike-1', name: 'Lacson Tricycle TODA Terminal', type: 'tricycle', lat: centerLat - 0.0008, lng: centerLng - 0.0006, weight: 0.85 },
        { id: 'anchor-bridge-1', name: 'España Pedestrian Footbridge', type: 'school', lat: centerLat + 0.0012, lng: centerLng - 0.0004, weight: 0.95 },
        { id: 'anchor-train-1', name: 'PNR España Transit Gate', type: 'train', lat: centerLat - 0.0015, lng: centerLng + 0.0011, weight: 1.2 },
      ];
    }
  }

  // Generic localized transit anchors for any coordinate
  return [
    {
      id: 'anchor-jeep-1',
      name: 'Pangunahing Sakayan / UV & Jeepney Hub',
      type: 'jeepney',
      lat: centerLat + 0.0007,
      lng: centerLng + 0.0005,
      weight: 1.0,
    },
    {
      id: 'anchor-trike-1',
      name: 'Lokal na Barangay Tricycle TODA',
      type: 'tricycle',
      lat: centerLat - 0.0008,
      lng: centerLng - 0.0006,
      weight: 0.85,
    },
    {
      id: 'anchor-bridge-1',
      name: 'Pedestrian Overpass / Tawiran',
      type: 'school',
      lat: centerLat + 0.0012,
      lng: centerLng - 0.0004,
      weight: 0.95,
    },
    {
      id: 'anchor-train-1',
      name: 'Transit Terminal Waiting Area',
      type: 'train',
      lat: centerLat - 0.0015,
      lng: centerLng + 0.0011,
      weight: 1.2,
    },
  ];
}

export function generateCompetitorsAround(centerLat: number, centerLng: number): CompetitorNode[] {
  return [
    { id: 'comp-1', name: 'Karinderya Corner', lat: centerLat + 0.0005, lng: centerLng - 0.0003, category: 'food' },
    { id: 'comp-2', name: 'Sari-Sari Store & Drinks', lat: centerLat - 0.0006, lng: centerLng + 0.0008, category: 'convenience' },
  ];
}
