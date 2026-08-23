# ShellByTheShore Concierge Knowledge Coverage

Generated and reviewed against repository sources on 2026-08-23.

## Totals

- Public knowledge records: **94**
- Canonical intents: **184**
- Guest-question/paraphrase cases: **435**
- Knowledge source files: **4**
- External paid services required: **none**

## Categories and geographic coverage

The generated index covers property facts, amenities, house rules, arrival/departure, booking policy, accessibility, parking, safety, transportation, beaches, food, coffee, breakfast, groceries, shopping, attractions, activities, and airports.

Approved Local Guide coverage includes Manhattan Beach/El Porto, Hermosa Beach, Redondo Beach, Venice, Santa Monica, Malibu, and LAX. POI records preserve internal IDs and `/guide` links. Venue hours, availability, prices, events, traffic, weather, and transportation schedules remain live-data gaps and are never inferred.

## Sources

- `property-data.json`: public listing structure, amenities, public rules, and photo captions.
- `app/_components/LocalGuideMap.tsx`: approved POIs, categories, descriptions, and Local Guide coordinates.
- `app/guide/page.tsx`: approved area narratives and geographically sensible planning guidance.
- `app/_components/AvailabilityRequest.tsx` and `app/terms-and-conditions/page.tsx`: inquiry-only disclosure, public terms, and parking constraints, represented through curated overrides.

`data/dump.json` is intentionally excluded because it describes a different property. Guest portal, dashboard, environment, database, Telegram, cleaner, and operational files are not public knowledge sources.

## Public/private separation

Every record has an explicit `PUBLIC_SAFE`, `GUEST_ONLY`, or `OWNER_ONLY` scope. The generated public index contains only `PUBLIC_SAFE` records. Door/lock details, Wi-Fi credentials, exact operational instructions, exact guest address data, owner operations, customer data, cleaner information, tokens, and secrets are excluded.

## Known gaps

No verified repository facts were found for a pharmacy recommendation, detailed public-transit schedules, luggage storage, alternative parking guarantees, other-airport instructions, exact travel times, live events, live ocean conditions, or restaurant dietary menus. The concierge uses a host-confirmation fallback rather than inventing these facts.

## Provider status

Deterministic hybrid retrieval and answer composition is always enabled. Ollama and OpenAI are optional server-side providers when explicitly configured. Provider absence, timeout, or malformed output falls back to deterministic answers and does not expose configuration errors.
