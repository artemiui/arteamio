import type { TaggedVendor, DemandHotspot, ViabilityResult, ProductType } from './types';
import { generateTaggedVendorsAround, PRODUCT_LEGEND } from './data/spots';
import { calculateDistanceM } from './gravity';

const API_BASE = '/api/v1';

export interface BackendVendor {
  id: string;
  name: string;
  product_type: ProductType;
  product_name: string;
  price?: string;
  lat: number;
  lng: number;
  status: 'live' | 'stopped' | 'sold_out';
  verified_photo?: string;
  created_at?: string;
  updated_at?: string;
}

/** Convert a backend vendor model to the frontend TaggedVendor interface. */
export function formatBackendVendor(v: BackendVendor, userLat: number, userLng: number): TaggedVendor {
  const dist = calculateDistanceM(userLat, userLng, v.lat, v.lng);
  const eta = Math.max(1, Math.round(dist / 67));
  const legend = PRODUCT_LEGEND.find((item) => item.type === v.product_type) || {
    icon: 'star',
    labelTl: v.product_name,
  };

  return {
    id: v.id,
    name: v.name,
    productType: v.product_type,
    productName: v.product_name,
    productNameTl: legend.labelTl,
    icon: legend.icon,
    price: v.price || '₱30',
    lat: v.lat,
    lng: v.lng,
    distanceM: dist,
    etaMins: eta,
    status: v.status,
    verifiedPhoto: v.verified_photo,
  };
}

/** Fetch live vendors from FastAPI backend with fallback to simulated data. */
export async function getLiveVendors(lat: number, lng: number, radiusM = 3000): Promise<TaggedVendor[]> {
  try {
    const res = await fetch(`${API_BASE}/vendors?lat=${lat}&lng=${lng}&radius_m=${radiusM}`);
    if (res.ok) {
      const data: BackendVendor[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((v) => formatBackendVendor(v, lat, lng));
      }
    }
  } catch (err) {
    console.warn('Backend API unreachable, using local fallback:', err);
  }
  // Fallback to local procedural generator if backend is not running
  return generateTaggedVendorsAround(lat, lng);
}

/** Register a new vendor on the FastAPI backend. */
export async function registerVendorOnBackend(vendor: {
  name: string;
  product_type: ProductType;
  product_name: string;
  price?: string;
  lat: number;
  lng: number;
  status?: 'live' | 'stopped' | 'sold_out';
  verified_photo?: string;
}): Promise<BackendVendor | null> {
  try {
    const res = await fetch(`${API_BASE}/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vendor),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to register vendor on backend:', err);
  }
  return null;
}

/** Stream live GPS updates from vendor to backend. */
export async function updateVendorLocationOnBackend(
  vendorId: string,
  lat: number,
  lng: number,
  status?: 'live' | 'stopped' | 'sold_out'
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/vendors/${vendorId}/location`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, status }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to stream vendor location to backend:', err);
    return false;
  }
}

/** Evaluate Huff Gravity Model viability on the backend. */
export async function evaluateViabilityOnBackend(
  lat: number,
  lng: number,
  productType: string
): Promise<ViabilityResult | null> {
  try {
    const res = await fetch(`${API_BASE}/viability/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, product_type: productType }),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        score: data.score,
        ratingTl: data.rating_tl,
        ratingEn: data.rating_en,
        nearestAnchorName: data.nearest_anchor_name,
        nearestAnchorDistM: data.nearest_anchor_dist_m,
        anchorCountWithin300m: data.anchor_count_within_300m,
        competitorCountWithin150m: data.competitor_count_within_150m,
        peakHoursTl: data.peak_hours_tl,
        peakHoursEn: data.peak_hours_en,
      };
    }
  } catch (err) {
    console.warn('Failed to evaluate viability on backend:', err);
  }
  return null;
}

/** Connect to the real-time live radar WebSocket. */
export function connectLiveRadarWebSocket(
  onVendorUpdate: (data: any) => void
): () => void {
  let ws: WebSocket | null = null;
  let isClosed = false;

  function connect() {
    if (isClosed || typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/radar`;

    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.data) {
            onVendorUpdate(payload.data);
          }
        } catch {
          // heartbeat or non-json message
        }
      };

      ws.onclose = () => {
        if (!isClosed) {
          // Reconnect after 3 seconds
          setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    } catch (err) {
      console.warn('WebSocket connection error:', err);
    }
  }

  connect();

  return () => {
    isClosed = true;
    ws?.close();
  };
}
