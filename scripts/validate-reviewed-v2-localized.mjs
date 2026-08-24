import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [markdown, localizedRaw, indexRaw, canonicalRaw] = await Promise.all([
  readFile(new URL("docs/SHELLBYTHESHORE-GUEST-QA-REVIEWED-V2.md", root), "utf8"),
  readFile(new URL("knowledge/reviewed-v2-localized.json", root), "utf8"),
  readFile(new URL("knowledge/generated-index.json", root), "utf8"),
  readFile(new URL("knowledge/canonical-guest-qa.json", root), "utf8"),
]);
const data = JSON.parse(localizedRaw);
const generated = JSON.parse(indexRaw);
const canonical = JSON.parse(canonicalRaw);
const errors = [];
const locales = ["en", "it", "es", "fr", "de"];
const forbiddenEncoding = /\uFFFD|(?:Ã[\u0080-\u00BF]|Â[\u0080-\u00BF ]|â(?:€|€™|€œ|€œ|€“|€”|€¦)|ðŸ)/u;
const mechanicalAlternative = /^(?:¿?(?:puede|puedes) decirme más sobre esto|pouvez-vous m['’]en dire plus à ce sujet|pouvez-vous me dire plus à ce sujet|können sie mir mehr darüber (?:erzählen|sagen))\b/iu;
const validKnowledgeIds = new Set([
  ...generated.records.map(({ id }) => id),
  ...canonical.qas.map(({ id }) => id),
]);

function parseBaseline(source) {
  let category = "";
  let current;
  let field;
  const entries = [];
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    const categoryMatch = line.match(/^## ([a-z][\w-]*)$/u);
    if (categoryMatch) category = categoryMatch[1];
    const idMatch = line.match(/^### (v2-[\w-]+)$/u);
    if (idMatch) {
      current = { id: idMatch[1], category, sources: [], localizations: { en: { alternativeQuestions: [] }, it: { alternativeQuestions: [] } } };
      entries.push(current);
      field = undefined;
      continue;
    }
    if (!current) continue;
    const heading = line.match(/^\*\*(EN|IT) (QUESTION|ANSWER)\*\*$/u);
    if (heading) { field = { locale: heading[1].toLowerCase(), key: heading[2].toLowerCase() }; continue; }
    if (line === "**ALTERNATIVE QUESTIONS**") { field = "alternatives"; continue; }
    const sourceMatch = line.match(/^\*\*SOURCES:\*\* (.+)$/u);
    if (sourceMatch) { current.sources = sourceMatch[1].split(", "); field = undefined; continue; }
    const liveMatch = line.match(/^\*\*LIVE DATA DEPENDENT:\*\* (Yes|No)$/u);
    if (liveMatch) { current.liveDataDependent = liveMatch[1] === "Yes"; field = undefined; continue; }
    const alternative = line.match(/^- (EN|IT): (.+)$/u);
    if (field === "alternatives" && alternative) current.localizations[alternative[1].toLowerCase()].alternativeQuestions.push(alternative[2]);
    else if (field?.locale && line && line !== "---") current.localizations[field.locale][field.key] = line;
  }
  return entries;
}

const baseline = parseBaseline(markdown);
if (forbiddenEncoding.test(localizedRaw)) errors.push("il JSON contiene U+FFFD o sequenze mojibake UTF-8");
if (!Array.isArray(data.entries) || data.entries.length !== 110) errors.push(`entries deve contenere esattamente 110 elementi (trovati ${data.entries?.length ?? "invalidi"})`);
if (baseline.length !== 110) errors.push(`la baseline deve contenere 110 entry (trovate ${baseline.length})`);
const baselineById = new Map(baseline.map((entry) => [entry.id, entry]));
const seen = new Set();
const canonicalQuestionsByLocale = new Map(locales.map((locale) => [locale, new Map()]));

for (const [position, entry] of (data.entries ?? []).entries()) {
  const label = entry?.id ?? `indice ${position}`;
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) { errors.push(`${label}: entry non valida`); continue; }
  if (seen.has(entry.id)) errors.push(`${label}: id duplicato`);
  seen.add(entry.id);
  const base = baselineById.get(entry.id);
  if (!base) errors.push(`${label}: id non presente nella baseline`);
  for (const key of ["id", "category"]) if (typeof entry[key] !== "string" || !entry[key]) errors.push(`${label}: ${key} mancante`);
  if (typeof entry.liveDataDependent !== "boolean") errors.push(`${label}: liveDataDependent deve essere booleano`);
  if (!Array.isArray(entry.sources) || entry.sources.length === 0 || entry.sources.some((value) => typeof value !== "string" || !value)) errors.push(`${label}: sources non valido`);
  if (!Array.isArray(entry.knowledgeIds) || entry.knowledgeIds.length === 0) errors.push(`${label}: knowledgeIds non vuoto richiesto`);
  else for (const id of entry.knowledgeIds) if (!validKnowledgeIds.has(id)) errors.push(`${label}: knowledgeId non valido: ${id}`);
  if (base) {
    if (entry.category !== base.category) errors.push(`${label}: category non corrisponde alla baseline`);
    if (JSON.stringify(entry.sources) !== JSON.stringify(base.sources)) errors.push(`${label}: sources non corrisponde byte-per-byte alla baseline`);
    if (entry.liveDataDependent !== base.liveDataDependent) errors.push(`${label}: liveDataDependent non corrisponde alla baseline`);
  }
  if (!entry.localizations || JSON.stringify(Object.keys(entry.localizations)) !== JSON.stringify(locales)) errors.push(`${label}: localizations deve avere esattamente en,it,es,fr,de in quest'ordine`);
  for (const locale of locales) {
    const localization = entry.localizations?.[locale];
    if (!localization || typeof localization !== "object") { errors.push(`${label}/${locale}: localizzazione mancante`); continue; }
    if (JSON.stringify(Object.keys(localization)) !== JSON.stringify(["question", "answer", "alternativeQuestions"])) errors.push(`${label}/${locale}: campi richiesti esattamente question,answer,alternativeQuestions`);
    for (const key of ["question", "answer"]) if (typeof localization[key] !== "string" || localization[key].trim() === "") errors.push(`${label}/${locale}: ${key} non vuoto richiesto`);
    if (!Array.isArray(localization.alternativeQuestions) || localization.alternativeQuestions.length === 0 || localization.alternativeQuestions.some((value) => typeof value !== "string" || value.trim() === "")) errors.push(`${label}/${locale}: alternativeQuestions non vuote richieste`);
    if (Array.isArray(localization.alternativeQuestions)) {
      for (const value of localization.alternativeQuestions) {
        if (locale !== "en" && locale !== "it" && typeof value === "string" && mechanicalAlternative.test(value.trim())) errors.push(`${label}/${locale}: alternativeQuestion usa un placeholder meccanico`);
      }
      const normalizedAlternatives = localization.alternativeQuestions
        .filter((value) => typeof value === "string")
        .map((value) => value.trim().toLocaleLowerCase(locale));
      if (new Set(normalizedAlternatives).size !== normalizedAlternatives.length) errors.push(`${label}/${locale}: alternativeQuestions contiene duplicati`);
    }
    if (typeof localization.question === "string" && localization.question.trim()) {
      const normalizedQuestion = localization.question.trim().toLocaleLowerCase(locale);
      const previousId = canonicalQuestionsByLocale.get(locale).get(normalizedQuestion);
      if (previousId) errors.push(`${label}/${locale}: domanda canonica duplicata con ${previousId}`);
      else canonicalQuestionsByLocale.get(locale).set(normalizedQuestion, label);
    }
    if (base && (locale === "en" || locale === "it")) {
      for (const key of ["question", "answer"]) if (localization[key] !== base.localizations[locale][key]) errors.push(`${label}/${locale}: ${key} differisce byte-per-byte dalla baseline`);
      const documented = base.localizations[locale].alternativeQuestions;
      if (documented.length > 0 && JSON.stringify(localization.alternativeQuestions) !== JSON.stringify(documented)) errors.push(`${label}/${locale}: alternativeQuestions documentate differiscono byte-per-byte dalla baseline`);
    }
  }
}
for (const entry of baseline) if (!seen.has(entry.id)) errors.push(`${entry.id}: entry baseline mancante`);

if (errors.length) {
  console.error(`Validazione fallita con ${errors.length} errore/i:\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Validazione completata: 110 entry, UTF-8 pulito senza mojibake o placeholder meccanici, metadati e knowledgeIds validi, locale esatte en/it/es/fr/de, baseline EN/IT preservata.");
}
