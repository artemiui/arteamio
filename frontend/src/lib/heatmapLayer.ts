import L from 'leaflet';
import type { CompetitorNode, DemandHotspot, TaggedVendor, TransitAnchor } from './types';
import { getProductAnchorAffinity } from './gravity';
import { generateCompetitorsAround } from './data/spots';
import { getDemandHotspotsForViewport } from './data/hotspots';

/**
 * Coastline & water mask for Manila Bay and major water bodies.
 * Ensures zero heatmap pixels ever bleed into the sea even near coastal districts.
 */
function isPointInManilaBayOrWater(lat: number, lng: number): boolean {
  if (lat >= 14.66 && lng < 120.952) return true;
  if (lat >= 14.60 && lat < 14.66) {
    const t = (14.66 - lat) / 0.06;
    const coastLng = 120.950 + t * 0.015;
    if (lng < coastLng) return true;
  }
  if (lat >= 14.582 && lat < 14.60) {
    if (lng < 120.975) return true;
  }
  if (lat >= 14.50 && lat < 14.582) {
    const t = (14.582 - lat) / 0.082;
    const coastLng = 120.978 + t * 0.012;
    if (lng < coastLng) return true;
  }
  return false;
}

/**
 * Inverted Green Viability LUT (per Team Leader spec):
 * - Bad / dead spots ("engot spot pangit magtinda"): 0 opacity (completely transparent)
 * - Gradually transitions from 0 opacity -> soft light green -> mild transparent rich green
 *   at the best spots ("yung dark lang yung maganda"), keeping map streets 100% legible underneath.
 */
function buildGreenViabilityLUT(isDarkMode: boolean): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 4);
  // Mild transparent max alpha (~42% in light mode, ~48% in dark mode) so map outlines stay crisp
  const maxAlpha = isDarkMode ? 122 : 108;

  for (let i = 0; i < 256; i++) {
    const idx = i * 4;
    // Deadspots / poor spots: strictly 0 opacity (no color)
    if (i < 18) {
      lut[idx] = 0;
      lut[idx + 1] = 0;
      lut[idx + 2] = 0;
      lut[idx + 3] = 0;
      continue;
    }

    const t = (i - 18) / (255 - 18); // 0..1
    let r = 0;
    let g = 0;
    let b = 0;

    if (t < 0.5) {
      // Outer halo / Moderate spot: Soft Mint Green (#6EE7B7) -> Vibrant Emerald (#22C55E)
      const lt = t / 0.5;
      r = Math.round(110 + (34 - 110) * lt);
      g = Math.round(231 + (197 - 231) * lt);
      b = Math.round(183 + (94 - 183) * lt);
    } else {
      // Good -> Very Good Spot: Vibrant Emerald (#22C55E) -> Rich Deep Forest Green (#15803D)
      const lt = (t - 0.5) / 0.5;
      r = Math.round(34 + (21 - 34) * lt);
      g = Math.round(197 + (128 - 197) * lt);
      b = Math.round(94 + (61 - 94) * lt);
    }

    // Gradual opacity ramp from 0% (bad spot) up to mild transparent green (very good spot)
    const alphaCurve = Math.pow(t, 1.12);
    const a = Math.round(alphaCurve * maxAlpha);

    lut[idx] = r;
    lut[idx + 1] = g;
    lut[idx + 2] = b;
    lut[idx + 3] = a;
  }

  return lut;
}

export interface ViabilityHeatmapOptions {
  centerLat: number;
  centerLng: number;
  productType: string;
  isDarkMode: boolean;
  activeVendors: TaggedVendor[];
  hotspots?: DemandHotspot[];
}

/**
 * World-pinned Geographic Huff Gravity Heatmap Layer.
 *
 * - Scale: 0% opacity on deadspots/bad spots -> gradually turning into a mild transparent
 *   green on very good spots (richer/darker green only on top spots).
 * - Renders exclusively on detected DemandHotspots (1-to-1 match with map hotspots).
 * - 100% location-locked when zooming in/out via geographic L.ImageOverlay.
 */
export class ViabilityHeatmapLayer extends L.Layer {
  private imageOverlay: L.ImageOverlay | null = null;
  private opts: ViabilityHeatmapOptions;
  private lastKey = '';

  constructor(options: ViabilityHeatmapOptions) {
    super();
    this.opts = options;
  }

  public setHeatmapState(options: Partial<ViabilityHeatmapOptions>): void {
    this.opts = { ...this.opts, ...options };
    this.renderGeographicOverlay();
  }

  override onAdd(map: L.Map): this {
    this._map = map;
    this.lastKey = '';
    this.renderGeographicOverlay();
    return this;
  }

  override onRemove(map: L.Map): this {
    if (this.imageOverlay) {
      map.removeLayer(this.imageOverlay);
      this.imageOverlay = null;
    }
    this.lastKey = '';
    return this;
  }

  private renderGeographicOverlay(): void {
    const map = this._map;
    if (!map) return;

    const { centerLat, centerLng, productType, isDarkMode, activeVendors, hotspots } = this.opts;
    const normProd = (productType || 'taho').toLowerCase();

    const vendorSig = activeVendors
      .map((v) => `${v.id}:${v.status}:${v.lat.toFixed(4)},${v.lng.toFixed(4)}`)
      .join('|');
    const hotspotSig = hotspots ? hotspots.map((h) => `${h.id}:${h.opportunityScore}`).join(',') : 'default';
    const stateKey = `${centerLat.toFixed(3)},${centerLng.toFixed(3)}|${normProd}|${isDarkMode}|${vendorSig}|${hotspotSig}`;

    if (stateKey === this.lastKey && this.imageOverlay) {
      return;
    }
    this.lastKey = stateKey;

    const LAT_SPAN_HALF = 0.095;
    const LNG_SPAN_HALF = 0.095;

    const south = centerLat - LAT_SPAN_HALF;
    const north = centerLat + LAT_SPAN_HALF;
    const west = centerLng - LNG_SPAN_HALF;
    const east = centerLng + LNG_SPAN_HALF;
    const bounds = L.latLngBounds([south, west], [north, east]);

    const detectedHotspots: DemandHotspot[] =
      hotspots && hotspots.length > 0
        ? hotspots
        : getDemandHotspotsForViewport({ north, south, east, west }, centerLat, centerLng, 14);

    const baseCompetitors = generateCompetitorsAround(centerLat, centerLng);
    const allCompetitors: CompetitorNode[] = [...baseCompetitors];
    for (const v of activeVendors) {
      if (v.status !== 'sold_out') {
        allCompetitors.push({
          id: `live-${v.id}`,
          name: v.name,
          lat: v.lat,
          lng: v.lng,
          category: v.productType,
        });
      }
    }

    const cosLat = Math.cos((centerLat * Math.PI) / 180);
    const mPerDegLat = 110540;
    const mPerDegLng = 111320 * cosLat;

    // Prepare ONLY the detected hotspots:
    // - High hotspots (score >= 80, GOOD): rich mild transparent green core (up to 0.96)
    // - Medium hotspots (score 50-79, AVERAGE): lighter translucent green (up to 0.56)
    // - Low hotspots (score < 50, LOW): faintest whisper of green (up to 0.22) or near-transparent
    const preparedHotspots = detectedHotspots
      .filter((h) => !isPointInManilaBayOrWater(h.lat, h.lng))
      .map((h) => {
        const mappedType: TransitAnchor['type'] =
          h.category === 'school'
            ? 'school'
            : h.category === 'commuter'
              ? 'jeepney'
              : 'tricycle';
        const affinity = getProductAnchorAffinity(normProd, mappedType);

        const maxCap =
          h.potentialLevel === 'high'
            ? 0.96
            : h.potentialLevel === 'medium'
              ? 0.56
              : 0.22;

        const basePeak =
          h.potentialLevel === 'high'
            ? 0.90
            : h.potentialLevel === 'medium'
              ? 0.50
              : 0.18;

        const radiusM = Math.max(150, h.radiusM || 180);
        return {
          lat: h.lat,
          lng: h.lng,
          sigmaSq2: 2 * (radiusM * 0.82) * (radiusM * 0.82),
          maxDistSq: (radiusM * 2.0) * (radiusM * 2.0),
          strength: Math.min(maxCap, basePeak * (0.85 + 0.15 * affinity)),
          maxCap,
        };
      });

    const preparedCompetitors = allCompetitors.map((c) => {
      const isSame =
        c.category.toLowerCase() === normProd || normProd.includes(c.category.toLowerCase());
      return {
        lat: c.lat,
        lng: c.lng,
        lambda: isSame ? 0.34 : 0.10,
      };
    });

    const GRID_SIZE = 380;
    const offscreen = document.createElement('canvas');
    offscreen.width = GRID_SIZE;
    offscreen.height = GRID_SIZE;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const imgData = offCtx.createImageData(GRID_SIZE, GRID_SIZE);
    const data = imgData.data;
    const lut = buildGreenViabilityLUT(isDarkMode);

    const COMP_RADIUS_SQ = 160 * 160;
    const COMP_GAUSS_DENOM = 2 * 75 * 75;

    for (let gy = 0; gy < GRID_SIZE; gy++) {
      const lat = north - ((gy + 0.5) / GRID_SIZE) * (north - south);
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const lng = west + ((gx + 0.5) / GRID_SIZE) * (east - west);
        const pIdx = (gy * GRID_SIZE + gx) * 4;

        if (isPointInManilaBayOrWater(lat, lng)) {
          data[pIdx + 3] = 0;
          continue;
        }

        let hotspotIntensity = 0;
        for (let i = 0; i < preparedHotspots.length; i++) {
          const h = preparedHotspots[i];
          const dy = (lat - h.lat) * mPerDegLat;
          if (dy > 440 || dy < -440) continue;
          const dx = (lng - h.lng) * mPerDegLng;
          if (dx > 440 || dx < -440) continue;

          const distSq = dx * dx + dy * dy;
          if (distSq > h.maxDistSq) continue;

          const pull = Math.min(h.maxCap, h.strength * Math.exp(-distSq / h.sigmaSq2));
          if (pull > hotspotIntensity) {
            hotspotIntensity = pull;
          } else if (pull > 0.06) {
            hotspotIntensity = Math.min(
              Math.max(hotspotIntensity, h.maxCap),
              hotspotIntensity + pull * 0.24
            );
          }
        }

        if (hotspotIntensity < 0.07) {
          data[pIdx + 3] = 0;
          continue;
        }

        // Subtract same-product live competitor saturation (reduces green opacity where saturated)
        let compPenalty = 0;
        for (let j = 0; j < preparedCompetitors.length; j++) {
          const c = preparedCompetitors[j];
          const dy = (lat - c.lat) * mPerDegLat;
          const dx = (lng - c.lng) * mPerDegLng;
          const distSq = dx * dx + dy * dy;
          if (distSq <= COMP_RADIUS_SQ) {
            compPenalty += c.lambda * Math.exp(-distSq / COMP_GAUSS_DENOM);
          }
        }

        const netIntensity = Math.max(0, Math.min(1, hotspotIntensity - compPenalty));
        const lutIndex = Math.min(255, Math.max(0, Math.round(netIntensity * 255))) * 4;

        data[pIdx] = lut[lutIndex];
        data[pIdx + 1] = lut[lutIndex + 1];
        data[pIdx + 2] = lut[lutIndex + 2];
        data[pIdx + 3] = lut[lutIndex + 3];
      }
    }

    offCtx.putImageData(imgData, 0, 0);

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 760;
    finalCanvas.height = 760;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) return;

    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.filter = 'blur(4px)';
    finalCtx.drawImage(offscreen, 0, 0, GRID_SIZE, GRID_SIZE, 0, 0, 760, 760);

    const dataUrl = finalCanvas.toDataURL('image/png');

    if (this.imageOverlay) {
      this.imageOverlay.setUrl(dataUrl);
      this.imageOverlay.setBounds(bounds);
    } else {
      this.imageOverlay = L.imageOverlay(dataUrl, bounds, {
        opacity: 1,
        interactive: false,
        zIndex: 220,
      }).addTo(map);
    }
  }
}
