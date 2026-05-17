export type GeocodingResult = {
    address: string;
    lat: number;
    lng: number;
  };

  export async function searchPlaces(query: string): Promise<GeocodingResult[]> {
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&format=json&limit=8&countrycodes=br&accept-language=pt-BR`;
    try {
      const resp = await fetch(url, { headers: { 'User-Agent': 'ZeroRiscoApp/1.0' } });
      const data: any[] = await resp.json();
      return data.map(item => ({
        address: item.display_name as string,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
    } catch {
      return [];
    }
  }

  export async function reverseGeocode(lat: number, lng: number): Promise<string> {
    const url =
      `https://nominatim.openstreetmap.org/reverse?` +
      `lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`;
    try {
      const resp = await fetch(url, { headers: { 'User-Agent': 'ZeroRiscoApp/1.0' } });
      const data = await resp.json();
      return (data.display_name as string) ?? 'Localização selecionada';
    } catch {
      return 'Localização selecionada';
    }
  }
  