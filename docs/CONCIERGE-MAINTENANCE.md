# Concierge Maintenance

## Where knowledge comes from

The editorial source of truth is `docs/SHELLBYTHESHORE-GUEST-QA-REVIEWED-V2.md`. Its production representation is `knowledge/reviewed-v2-localized.json`, with the same 110 reviewed entries in English, Italian, Spanish, French, and German. The older `docs/SHELLBYTHESHORE-GUEST-QA.md` is not an editorial baseline.

The build also reads the verified public listing in `property-data.json`, approved POIs in `app/_components/LocalGuideMap.tsx`, and owner-reviewed additions in `knowledge/curated-overrides.json` for grounding metadata and Local Guide links. Those records are not used as public answer prose. Generated files live in `knowledge/generated-index.json`, `knowledge/canonical-guest-qa.json`, `knowledge/intent-catalog.json`, and `knowledge/question-matrix.json`.

## Edit a concierge answer

Review the wording and facts in `docs/SHELLBYTHESHORE-GUEST-QA-REVIEWED-V2.md` first, then update the matching entry in `knowledge/reviewed-v2-localized.json` in all five languages. Preserve the same verified facts in every locale; do not translate from the old generated library. Run `node scripts/validate-reviewed-v2-localized.mjs` before rebuilding. The validator requires exactly 110 entries, all five locales, clean UTF-8, valid grounding IDs, and exact English/Italian correspondence with the reviewed source.

The public concierge has a strict language lock: EN → EN, IT → IT, ES → ES, FR → FR, and DE → DE. A short ambiguous follow-up retains the conversation language, while a clear language change in the current guest message takes precedence. Never add a fallback from one localized answer to another language.

## Add or edit a verified fact

Prefer updating the fact in its existing public source. If the fact does not belong in a page or listing source, add a uniquely identified record to `knowledge/curated-overrides.json` with its category, content, tags, location, scope, confidence, freshness, source, and source path. Curated IDs override generated IDs deliberately; malformed or duplicate output fails the build.

Run `npm run knowledge:build` and commit the deterministic generated files. Never add access codes, credentials, exact private arrival details, customer data, cleaner data, or owner operations to public knowledge.

## Local Guide updates

Update `GUIDE_POIS` in `app/_components/LocalGuideMap.tsx`, keeping names, categories, area descriptions, and coordinates verified. Rebuild knowledge afterward. Do not import third-party photos or logos.

## Unanswered questions

Unknown questions receive a safe host-confirmation response. They are not automatically trusted or learned. This implementation deliberately avoids storing guest questions; review direct guest feedback and add only owner-verified facts through the curated process.

## Answer generation

Production answers are deterministic and return the reviewed localized wording directly. Provider rewriting is intentionally not part of the public response path because it could alter verified facts or violate the language lock.
