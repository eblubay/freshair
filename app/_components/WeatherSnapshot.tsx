"use client"

import { useEffect, useState } from "react"

export function WeatherSnapshot() {
	const [forecast, setForecast] = useState<string | null>(null)
	useEffect(() => { void fetch("/api/weather").then((response) => response.ok ? response.json() : null).then((data) => { if (data?.shortForecast) setForecast(`${data.temperatureF ?? ""}° ${data.shortForecast}`.trim()) }).catch(() => undefined) }, [])
	return forecast ? <p className="mt-4 text-sm text-[#5d6b78]" aria-live="polite">Manhattan Beach now: {forecast}</p> : null
}
