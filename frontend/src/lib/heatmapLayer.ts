import L from 'leaflet';
import type { CompetitorNode, TaggedVendor, TransitAnchor } from './types';
import {
  generateWideScopeAnchors,
  getProductAnchorAffinity,
} from './gravity';
import { BUSINESS_ARCHETYPES, generateCompetitorsAround } from './data/spots';

/**
 * Subtle, translucent 256-level RGBA Thermal LUT so underlying OpenStreetMap
 * roads, building outlines, and labels remain 100% sharp and legible,
 * while showing a rich spread of High (Red), Medium (Amber), and Light (Yellow) zones.
 */
function buildSubtleThermalLUT(isDarkMode: boolean): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 4);
  // Subtle max alpha: 36% in light mode, 44% in dark mode so map outlines always show through clearly
  const maxAlpha = isDarkMode ? 112 : 92;

  for (let i = 0; i < 256; i++) {
    const idx = i * 4;
    // Below threshold: transparent so empty streets/water stay clean
    if (i < 24) {
      lut[idx] = 0;
      lut[idx + 1] = 0;
      lut[idx + 2] = 0;
      lut[idx + 3] = 0;
      continue;
    }

    const t = (i - 24) / (255 - 24); // 0..1
    let r = 0;
    let g = 0;
    let b = 0;

    if (t < 0.36) {
      // Soft Warm Yellow (#FACC15) -> Golden Amber (#F59E0B)
      const lt = t / 0.36;
      r = Math.round(250 + (245 - 250) * lt);
      g = Math.round(204 + (158 - 204) * lt);
      b = Math.round(21 + (11 - 21) * lt);
    } else if (t < 0.70) {
      // Golden Amber (#F59E0B) -> Warm Coral Orange (#EA580C)
      const lt = (t - 0.36) / 0.34;
      r = Math.round(245 + (234 - 245) * lt);
      g = Math.round(158 + (88 - 158) * lt);
      b = Math.round(11 + (12 - 11) * lt);
    } else {
      // Warm Coral Orange (#EA580C) -> Soft Rose-Crimson Core (#DC2626)
      const lt = (t - 0.70) / 0.30;
      r = Math.round(234 + (220 - 234) * lt);
      g = Math.round(88 + (38 - 88) * lt);
      b = Math.round(12 + (38 - 12) * lt);
    }

    // Smooth alpha curve starting gently at 12% and capping at maxAlpha
    const alphaCurve = 0.14 + 0.86 * Math.pow(t, 0.92);
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
}

/**
 * World-pinned Geographic Huff Gravity Heatmap Layer.
 *
 * Uses a native Leaflet `L.ImageOverlay` locked to fixed geographic LatLngBounds
 * so the heatmap NEVER shifts, stretches, or changes when zooming in or out,
 * and scales in 100% pixel-perfect sync with OpenStreetMap street tiles.
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

    const { centerLat, centerLng, productType, isDarkMode, activeVendors } = this.opts;
    const normProd = (productType || 'taho').toLowerCase();

    // Only re-render when product, theme, vendor statuses, or base location changes (NEVER on zoom!)
    const vendorSig = activeVendors
      .map((v) => `${v.id}:${v.status}:${v.lat.toFixed(4)},${v.lng.toFixed(4)}`)
      .join('|');
    const stateKey = `${centerLat.toFixed(3)},${centerLng.toFixed(3)}|${normProd}|${isDarkMode}|${vendorSig}`;

    if (stateKey === this.lastKey && this.imageOverlay) {
      return;
    }
    this.lastKey = stateKey;

    // Cover a wide ~13.5km x 13.5km geographic bounding box around the session center
    const LAT_SPAN_HALF = 0.060; // ~6.6km north/south
    const LNG_SPAN_HALF = 0.062; // ~6.7km east/west

    const south = centerLat - LAT_SPAN_HALF;
    const north = centerLat + LAT_SPAN_HALF;
    const west = centerLng - LNG_SPAN_HALF;
    const east = centerLng + LNG_SPAN_HALF;
    const bounds = L.latLngBounds([south, west], [north, east]);

    const anchors: TransitAnchor[] = generateWideScopeAnchors(centerLat, centerLng, 8500);
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

    const archetype =
      BUSINESS_ARCHETYPES.find((a) => normProd.includes(a.id)) ||
      BUSINESS_ARCHETYPES[2];

    const cosLat = Math.cos((centerLat * Math.PI) / 180);
    const mPerDegLat = 110540;
    const mPerDegLng = 111320 * cosLat;

    const preparedAnchors = anchors.map((a) => {
      const affinity = getProductAnchorAffinity(normProd, a.type);
      return {
        lat: a.lat,
        lng: a.lng,
        effectiveWeight: a.weight * affinity * archetype.transitWeight,
      };
    });

    const preparedCompetitors = allCompetitors.map((c) => {
      const isSame =
        c.category.toLowerCase() === normProd || normProd.includes(c.category.toLowerCase());
      return {
        lat: c.lat,
        lng: c.lng,
        lambda: isSame ? 0.50 : 0.18,
      };
    });

    // 360 x 360 geographic grid across the box
    const GRID_SIZE = 360;
    const offscreen = document.createElement('canvas');
    offscreen.width = GRID_SIZE;
    offscreen.height = GRID_SIZE;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const imgData = offCtx.createImageData(GRID_SIZE, GRID_SIZE);
    const data = imgData.data;
    const lut = buildSubtleThermalLUT(isDarkMode);

    // Balanced street-corridor reach (~340m max reach, ~150m sigma)
    // so neighboring zones form natural corridors while residential interiors stay clear
    const MAX_ANCHOR_DIST_SQ = 340 * 340;
    const GAUSSIAN_DENOM = 2 * 150 * 150;
    const COMP_RADIUS_SQ = 170 * 170;
    const COMP_GAUSSIAN_DENOM = 2 * 80 * 80;

    for (let gy = 0; gy < GRID_SIZE; gy++) {
      const lat = north - ((gy + 0.5) / GRID_SIZE) * (north - south);
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const lng = west + ((gx + 0.5) / GRID_SIZE) * (east - west);

        let totalPull = 0;
        let nearbyCount = 0;

        for (let i = 0; i < preparedAnchors.length; i++) {
          const a = preparedAnchors[i];
          const dy = (lat - a.lat) * mPerDegLat;
          if (dy > 350 || dy < -350) continue;
          const dx = (lng - a.lng) * mPerDegLng;
          if (dx > 350 || dx < -350) continue;

          const distSq = dx * dx + dy * dy;
          if (distSq > MAX_ANCHOR_DIST_SQ) continue;

          const gaussPull = a.effectiveWeight * Math.exp(-distSq / GAUSSIAN_DENOM);
          totalPull += gaussPull;
          if (distSq <= 220 * 220) {
            nearbyCount += 1;
          }
        }

        const pIdx = (gy * GRID_SIZE + gx) * 4;
        if (totalPull < 0.08) {
          data[pIdx + 3] = 0;
          continue;
        }

        if (nearbyCount >= 2) {
          totalPull *= 1.10;
        }

        // Subtract same-product competitor saturation
        let compPenalty = 0;
        for (let j = 0; j < preparedCompetitors.length; j++) {
          const c = preparedCompetitors[j];
          const dy = (lat - c.lat) * mPerDegLat;
          const dx = (lng - c.lng) * mPerDegLng;
          const distSq = dx * dx + dy * dy;
          if (distSq <= COMP_RADIUS_SQ) {
            compPenalty += c.lambda * Math.exp(-distSq / COMP_GAUSSIAN_DENOM);
          }
        }

        const netField = Math.max(0, totalPull - compPenalty);
        const intensity = Math.min(1, 1 - Math.exp(-netField / 0.85));
        const lutIndex = Math.min(255, Math.max(0, Math.round(intensity * 255))) * 4;

        data[pIdx] = lut[lutIndex];
        data[pIdx + 1] = lut[lutIndex + 1];
        data[pIdx + 2] = lut[lutIndex + 2];
        data[pIdx + 3] = lut[lutIndex + 3];
      }
    }

    offCtx.putImageData(imgData, 0, 0);

    // Smooth upscale to 720x720 texture with gentle Gaussian blur
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 720;
    finalCanvas.height = 720;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) return;

    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.filter = 'blur(5px)';
    finalCtx.drawImage(offscreen, 0, 0, GRID_SIZE, GRID_SIZE, 0, 0, 720, 720);

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
