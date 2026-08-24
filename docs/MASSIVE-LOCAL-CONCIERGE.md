# ShellByTheShore internal local concierge

## Current corpus

- Canonical local-place Q&A: **5,000**.
- Localized answers (EN, IT, ES, FR, DE): **25,000**.
- Natural entity-aware question variants: **100,000**.
- Premium curated Local Guide POIs: **62**, retained and ranked first when relevant.
- Internal OpenStreetMap places: **12,664** named traveler-useful records at the recorded import snapshot.

The large corpus is server-only. It is not serialized into the initial public page. The public client receives only the selected answer and up to five compact map destinations.

## Coverage and attribution

The bounded import covers the coastal corridor containing El Porto, Manhattan Beach, Hermosa Beach, Redondo Beach, El Segundo, Playa del Rey, Marina del Rey, Venice, Santa Monica, Malibu, LAX, South Bay and useful Westside destinations. Geographic data is © OpenStreetMap contributors and is used under ODbL 1.0. ShellByTheShore does not claim authorship of third-party map data.

## Retrieval

The deterministic retrieval layer extracts primary category intent, area, proximity, audience, preferences, transport mode and directions intent. Geographic words remain qualifiers when a stronger category exists. Ranking combines category relevance, entity matching, area, Haversine proximity, preferences and a premium curated-POI boost. Haversine values are always described as straight-line distances, never road distance or travel time.

## Map and directions behavior

Answers containing destinations return a compact map payload to the existing MapLibre/OpenFreeMap experience. It supports one or multiple pins, selected-destination highlighting, bounds fitting, useful public addresses and general El Porto origin context without exposing a private property address. No turn-by-turn engine is currently configured; the UI therefore maps the accurate destination and explicitly avoids claiming a route or travel time.

## Update process

1. Run `npm run places:import` to refresh the bounded OpenStreetMap snapshot. This is a maintenance import, not a per-question runtime call.
2. Run `npm run knowledge:massive` to generate the server-side localized entity library.
3. Run `npm run knowledge:validate-massive` to fail on malformed records, duplicates, missing locales, language markers, mojibake, unsupported grounding or bad coordinates.
4. Run the concierge tests, TypeScript check and production build before review.

No Google Places, Google Maps API, paid LLM, paid POI API, Apify or runtime paid service is used.
