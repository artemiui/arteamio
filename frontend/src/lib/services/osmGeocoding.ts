export interface OSMSearchResult {
  name: string;
  subtitle: string;
  displayName: string;
  lat: number;
  lng: number;
}

/**
 * Searches for Philippine locations based on OpenStreetMap (OSM).
 * Uses Nominatim with fallback to Photon (OSM-based search engine with full CORS support).
 */
export async function searchOSM(query: string): Promise<OSMSearchResult[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  // 1. Try Nominatim (Official OpenStreetMap Geocoding)
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q
    )}&countrycodes=ph&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => {
          const parts = (item.display_name || '').split(',').map((s: string) => s.trim());
          const name = parts[0] || item.name || q;
          const subtitle = parts.slice(1, 4).join(', ');
          return {
            name,
            subtitle,
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          };
        });
      }
    }
  } catch (e) {
    // Fall through to Photon
  }

  // 2. Fallback to Photon (OpenStreetMap data search engine with full CORS support)
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data?.features?.length > 0) {
        return data.features
          .filter((f: any) => f.geometry?.coordinates)
          .map((f: any) => {
            const props = f.properties || {};
            const name = props.name || props.street || q;
            const subtitle = [props.district, props.city, props.state, props.country]
              .filter(Boolean)
              .join(', ');
            return {
              name,
              subtitle,
              displayName: `${name}, ${subtitle}`,
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
            };
          });
      }
    }
  } catch (e) {
    console.error('OSM Geocode fallback failed:', e);
  }

  return [];
}
