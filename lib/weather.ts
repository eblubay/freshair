import "server-only"

const MANHATTAN_BEACH = { latitude: 33.9052, longitude: -118.4196 }
const cache = new Map<string, { expiresAt: number; value: WeatherSummary | null }>()
export type WeatherSummary = { temperatureF: number | null; shortForecast: string; fetchedAt: string; source: "NWS" }

export async function getPropertyWeather(): Promise<WeatherSummary | null> {
	const key = "manhattan-beach"
	const cached = cache.get(key)
	if (cached && cached.expiresAt > Date.now()) return cached.value
	try {
		const headers = { "User-Agent": process.env.WEATHER_USER_AGENT || "ShellByTheShore/1.0 contact@localhost" }
		const point = await fetch(`https://api.weather.gov/points/${MANHATTAN_BEACH.latitude},${MANHATTAN_BEACH.longitude}`, { headers, next: { revalidate: 900 } })
		if (!point.ok) throw new Error("NWS point lookup failed")
		const pointData = await point.json() as { properties?: { forecast?: string } }
		if (!pointData.properties?.forecast) throw new Error("NWS forecast endpoint unavailable")
		const forecast = await fetch(pointData.properties.forecast, { headers, next: { revalidate: 900 } })
		if (!forecast.ok) throw new Error("NWS forecast lookup failed")
		const data = await forecast.json() as { properties?: { periods?: Array<{ temperature?: number; shortForecast?: string }> } }
		const current = data.properties?.periods?.[0]
		const value = current ? { temperatureF: current.temperature ?? null, shortForecast: current.shortForecast ?? "Forecast unavailable", fetchedAt: new Date().toISOString(), source: "NWS" as const } : null
		cache.set(key, { value, expiresAt: Date.now() + 15 * 60_000 })
		return value
	} catch { cache.set(key, { value: null, expiresAt: Date.now() + 5 * 60_000 }); return null }
}
