/**
 * City lookup via OpenStreetMap Nominatim (replaces Google Maps Geocoder,
 * which is only available inside Apps Script).
 *
 * Nominatim usage policy requires a descriptive User-Agent and low request
 * rates — fine for our per-user onboarding volume.
 */
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'CineMindBot/1.0 (https://github.com/; telegram movie bot)';

interface NominatimResult {
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

export interface GeocodeResult {
  /** Human-readable place name to store/show. */
  formatted: string;
}

export async function geocodeCity(query: string): Promise<GeocodeResult | null> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&accept-language=ru&limit=1`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return null;

    const data = (await res.json()) as NominatimResult[];
    const top = data[0];
    if (!top) return null;

    const a = top.address ?? {};
    const city = a.city ?? a.town ?? a.village;
    const formatted = city
      ? [city, a.country].filter(Boolean).join(', ')
      : top.display_name;

    return { formatted };
  } catch {
    return null;
  }
}
