#!/usr/bin/env node
const location = process.argv.slice(2).join(' ') || 'Flic en Flac, Mauritius';

function describeWeatherCode(code, isDay) {
  const suffix = isDay ? '' : ' at night';
  switch (code) {
    case 0: return `clear sky${suffix}`;
    case 1: return `mainly clear${suffix}`;
    case 2: return `partly cloudy${suffix}`;
    case 3: return `overcast${suffix}`;
    case 45:
    case 48: return `foggy${suffix}`;
    case 51:
    case 53:
    case 55: return `light drizzle${suffix}`;
    case 56:
    case 57: return `freezing drizzle${suffix}`;
    case 61:
    case 63:
    case 65: return `rainy${suffix}`;
    case 66:
    case 67: return `freezing rain${suffix}`;
    case 71:
    case 73:
    case 75:
    case 77: return `snowing${suffix}`;
    case 80:
    case 81:
    case 82: return `rain showers${suffix}`;
    case 85:
    case 86: return `snow showers${suffix}`;
    case 95: return `thunderstorms${suffix}`;
    case 96:
    case 99: return `thunderstorms with hail${suffix}`;
    default: return `weather code ${code}${suffix}`;
  }
}

(async function main(){
  try {
    const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
    geocodeUrl.search = new URLSearchParams({ name: location, count: '1', language: 'en', format: 'json' }).toString();
    const gRes = await fetch(geocodeUrl.toString());
    if (!gRes.ok) throw new Error(`Geocode failed: ${gRes.status}`);
    const g = await gRes.json();
    const place = g.results?.[0];
    if (!place) throw new Error(`No geocode result for "${location}"`);

    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
    forecastUrl.search = new URLSearchParams({ latitude: String(place.latitude), longitude: String(place.longitude), current_weather: 'true', timezone: 'auto', forecast_days: '1' }).toString();
    const fRes = await fetch(forecastUrl.toString());
    if (!fRes.ok) throw new Error(`Forecast failed: ${fRes.status}`);
    const f = await fRes.json();
    const current = f.current_weather;
    if (!current) throw new Error('No current weather');

    const placeLabel = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
    const condition = describeWeatherCode(current.weathercode ?? -1, current.is_day === 1);

    console.log('--- Weather Test Result ---');
    console.log(`Location: ${placeLabel || location}`);
    console.log(`Temperature: ${current.temperature ?? 'unknown'}°C`);
    console.log(`Condition: ${condition}`);
    console.log(`Wind: ${current.windspeed ?? 'unknown'} km/h`);
    if (current.time) console.log(`Observed at: ${current.time}`);
    console.log('Source: Open-Meteo');
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exitCode = 2;
  }
})();
