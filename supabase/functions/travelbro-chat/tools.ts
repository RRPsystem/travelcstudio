export interface Restaurant {
  name: string;
  address: string;
  distance_meters: number;
  rating?: number;
  price_level?: number;
  cuisine_types: string[];
  is_open_now: boolean | null;
  google_maps_url: string;
}

export interface RouteInfo {
  distance_km: number;
  duration_minutes: number;
  google_maps_url: string;
}

export class GooglePlacesTool {
  constructor(private apiKey: string) {}

  async findRestaurantsNearby(location: string, radius = 1500): Promise<{ restaurants: Restaurant[], source: string }> {
    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${this.apiKey}`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();

      if (!geocodeData.results?.[0]) {
        return { restaurants: [], source: 'geocode_failed' };
      }

      const { lat, lng } = geocodeData.results[0].geometry.location;

      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=restaurant&key=${this.apiKey}`;
      const placesResponse = await fetch(placesUrl);
      const placesData = await placesResponse.json();

      if (!placesData.results?.length) {
        return { restaurants: [], source: 'no_results' };
      }

      const restaurants: Restaurant[] = placesData.results.slice(0, 5).map((place: any) => ({
        name: place.name,
        address: place.vicinity,
        distance_meters: this.calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng),
        rating: place.rating,
        price_level: place.price_level,
        cuisine_types: place.types?.filter((t: string) => t.includes('restaurant') || t.includes('food')) || [],
        is_open_now: place.opening_hours?.open_now ?? null,
        google_maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
      }));

      return { restaurants, source: 'google_places_api' };
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      return { restaurants: [], source: 'error' };
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export class GoogleDirectionsTool {
  constructor(private apiKey: string) {}

  async getRoute(origin: string, destination: string): Promise<RouteInfo | null> {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.routes?.[0]) {
        return null;
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        distance_km: Math.round(leg.distance.value / 1000),
        duration_minutes: Math.round(leg.duration.value / 60),
        google_maps_url: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
      };
    } catch (error) {
      console.error('Error fetching route:', error);
      return null;
    }
  }
}

export class WebSearchTool {
  constructor(
    private apiKey: string,
    private searchEngineId: string
  ) {}

  async search(query: string, location?: string): Promise<any[]> {
    try {
      const searchQuery = location ? `${query} ${location}` : query;
      const url = `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${this.searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=5`;
      
      const response = await fetch(url);
      const data = await response.json();

      return data.items || [];
    } catch (error) {
      console.error('Error performing web search:', error);
      return [];
    }
  }
}