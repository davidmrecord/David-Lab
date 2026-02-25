const API_URL = 'https://archive-api.open-meteo.com/v1/archive';

export interface WeatherResult {
  temp_f: number | null;
  condition: string | null;
  wind_mph: number | null;
  precipitation_in: number | null;
}

// WMO weather interpretation codes → human-readable condition
function describeWeatherCode(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 49) return 'Foggy';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

export async function fetchHistoricalWeather(
  latitude: number,
  longitude: number,
  isoDatetime: string
): Promise<WeatherResult> {
  const date = isoDatetime.slice(0, 10); // YYYY-MM-DD

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: date,
    end_date: date,
    daily: 'temperature_2m_max,windspeed_10m_max,precipitation_sum,weathercode',
    temperature_unit: 'fahrenheit',
    windspeed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'auto',
  });

  const response = await fetch(`${API_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`Open-Meteo error: ${response.status}`);
  }

  const data = await response.json();
  const daily = data.daily;

  return {
    temp_f: daily?.temperature_2m_max?.[0] ?? null,
    condition: daily?.weathercode?.[0] != null
      ? describeWeatherCode(daily.weathercode[0])
      : null,
    wind_mph: daily?.windspeed_10m_max?.[0] ?? null,
    precipitation_in: daily?.precipitation_sum?.[0] ?? null,
  };
}
