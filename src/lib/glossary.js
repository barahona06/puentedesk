/**
 * Default agency glossary for PuenteDesk (Spanish <-> English).
 *
 * These are the terms a services agency (tax, immigration support, notary,
 * translations) uses every day. Agencies can add their own pairs per
 * installation from the PuenteDesk panel; custom pairs are stored in Forge
 * KVS and merged over these defaults (see settings.js).
 *
 * Each entry: { es, en }. Matching is case-insensitive and longest-first.
 */
export const DEFAULT_GLOSSARY = [
  { es: 'traducción certificada', en: 'certified translation' },
  { es: 'acta de nacimiento', en: 'birth certificate' },
  { es: 'acta de matrimonio', en: 'marriage certificate' },
  { es: 'declaración de impuestos', en: 'tax return' },
  { es: 'permiso de trabajo', en: 'work permit' },
  { es: 'número de seguro social', en: 'Social Security number' },
  { es: 'poder notarial', en: 'power of attorney' },
  { es: 'copia certificada', en: 'certified copy' },
  { es: 'horario de oficina', en: 'office hours' },
  { es: 'tarjeta de residencia', en: 'green card' },
  { es: 'licencia de conducir', en: "driver's license" },
  { es: 'seguro social', en: 'Social Security' },
  { es: 'pasaporte', en: 'passport' },
  { es: 'renovación', en: 'renewal' },
  { es: 'notario público', en: 'notary public' },
  { es: 'notario', en: 'notary' },
  { es: 'apostilla', en: 'apostille' },
  { es: 'entrevista', en: 'interview' },
  { es: 'huellas dactilares', en: 'fingerprints' },
  { es: 'formulario', en: 'form' },
  { es: 'testigo', en: 'witness' },
  { es: 'testigos', en: 'witnesses' },
  { es: 'firma', en: 'signature' },
  { es: 'cita', en: 'appointment' },
  { es: 'documento', en: 'document' },
  { es: 'documentos', en: 'documents' },
  { es: 'tarifa', en: 'fee' },
  { es: 'precio', en: 'price' },
  { es: 'carta', en: 'letter' },
  { es: 'oficina', en: 'office' },
  { es: 'cliente', en: 'customer' },
  { es: 'trámite', en: 'application process' },
  { es: 'solicitud', en: 'request' },
];

/**
 * Find which glossary terms (either language) actually appear in a text.
 * Returns entries in glossary order, de-duplicated.
 */
export function findGlossaryHits(text, glossary = DEFAULT_GLOSSARY) {
  if (!text) return [];
  const haystack = ` ${text.toLowerCase()} `;
  const hits = [];
  for (const entry of glossary) {
    const es = entry.es.toLowerCase();
    const en = entry.en.toLowerCase();
    if (haystack.includes(es) || haystack.includes(en)) hits.push(entry);
  }
  return hits;
}

/**
 * Word/phrase substitution using the glossary: replaces known terms from
 * `fromLang` with their `toLang` equivalents (longest match first). Used by
 * the demo engine as a fallback; unknown words pass through untouched.
 */
export function substituteGlossary(text, glossary, fromLang, toLang) {
  if (!text || fromLang === toLang) return text;
  const pairs = glossary
    .map((e) => ({ from: e[fromLang], to: e[toLang] }))
    .filter((p) => p.from && p.to)
    .sort((a, b) => b.from.length - a.from.length);
  let out = text;
  for (const { from, to } of pairs) {
    const pattern = new RegExp(escapeRegExp(from), 'gi');
    out = out.replace(pattern, (m) => matchCase(m, to));
  }
  return out;
}

export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchCase(original, replacement) {
  if (original && original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}
