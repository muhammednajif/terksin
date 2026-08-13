export interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
}

export async function fetchLocationName(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lng}&locality=en&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results?.[0]) {
      const r = data.results[0];
      return r.city || r.admin1 || r.admin2 || r.country || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=auto`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.current_weather) return null;
    const w = data.current_weather;
    const code = w.weathercode ?? 0;
    return {
      temperature: Math.round(w.temperature),
      condition: weatherCodeToString(code),
      icon: getWeatherIcon(code),
    };
  } catch {
    return null;
  }
}

function weatherCodeToString(code: number): string {
  if (code <= 3) return 'Clear';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain Showers';
  if (code <= 86) return 'Snow Showers';
  return 'Thunderstorm';
}

function getWeatherIcon(code: number): string {
  if (code === 0) return 'sun';
  if (code <= 2) return 'cloud-sun';
  if (code <= 3) return 'cloud';
  if (code <= 48) return 'fog';
  if (code <= 57) return 'drizzle';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'cloud-rain';
  if (code <= 86) return 'cloud-snow';
  return 'cloud-lightning';
}
