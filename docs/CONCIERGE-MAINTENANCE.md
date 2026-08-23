# Concierge Maintenance

## Where knowledge comes from

The build reads the verified public listing in `property-data.json`, approved POIs in `app/_components/LocalGuideMap.tsx`, and owner-reviewed additions in `knowledge/curated-overrides.json`. Generated files live in `knowledge/generated-index.json`, `knowledge/intent-catalog.json`, and `knowledge/question-matrix.json`.

## Add or edit a verified fact

Prefer updating the fact in its existing public source. If the fact does not belong in a page or listing source, add a uniquely identified record to `knowledge/curated-overrides.json` with its category, content, tags, location, scope, confidence, freshness, source, and source path. Curated IDs override generated IDs deliberately; malformed or duplicate output fails the build.

Run `npm run knowledge:build` and commit the deterministic generated files. Never add access codes, credentials, exact private arrival details, customer data, cleaner data, or owner operations to public knowledge.

## Local Guide updates

Update `GUIDE_POIS` in `app/_components/LocalGuideMap.tsx`, keeping names, categories, area descriptions, and coordinates verified. Rebuild knowledge afterward. Do not import third-party photos or logos.

## Unanswered questions

Unknown questions receive a safe host-confirmation response. They are not automatically trusted or learned. This implementation deliberately avoids storing guest questions; review direct guest feedback and add only owner-verified facts through the curated process.

## Optional AI provider

No provider is required. To enable one later, configure either `OLLAMA_BASE_URL`/`OLLAMA_MODEL` or `OPENAI_API_KEY`/`OPENAI_MODEL` in the server environment. Do not expose these values in browser code. Requests remain retrieval-grounded, bounded, rate-limited, and automatically fall back when the provider is unavailable.
