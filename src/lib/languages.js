/**
 * Minimal, dependency-free language helpers for PuenteDesk.
 *
 * Detection is a stopword heuristic: good enough to route a support message
 * to the right translation direction, and honest about "unknown" when the
 * text is too short or mixed. A production deployment can swap this for a
 * real detector behind the same interface.
 */

export const LANGUAGE_NAMES = {
  es: 'Spanish',
  en: 'English',
  unknown: 'Unknown',
};

const ES_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'que',
  'qué', 'para', 'por', 'con', 'sin', 'mi', 'me', 'se', 'en', 'es', 'son',
  'está', 'están', 'tengo', 'necesito', 'quiero', 'gracias', 'hola', 'buenas',
  'buenos', 'señor', 'señora', 'cita', 'documento', 'documentos', 'cuánto',
  'cuándo', 'dónde', 'cómo', 'también', 'usted', 'favor', 'mañana', 'tarde',
  'día', 'días', 'hora', 'horas', 'lunes', 'martes', 'miércoles', 'jueves',
  'viernes', 'sábado', 'domingo', 'puedo', 'puede', 'tienen', 'abren',
  'renovar', 'precio', 'cuesta', 'llevar', 'traer', 'ayudarme',
]);

const EN_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'is', 'are', 'was',
  'i', 'you', 'we', 'my', 'your', 'please', 'thank', 'thanks', 'hello', 'hi',
  'need', 'needs', 'want', 'when', 'what', 'how', 'much', 'many', 'appointment',
  'document', 'documents', 'morning', 'afternoon', 'monday', 'tuesday',
  'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'can', 'could',
  'will', 'would', 'bring', 'open', 'opens', 'price', 'cost', 'renew',
]);

/**
 * Detect whether a text is Spanish ('es'), English ('en') or unclear
 * ('unknown'). Spanish diacritics and inverted punctuation count strongly.
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'unknown';
  const words = text
    .toLowerCase()
    .replace(/[¿?¡!.,;:()"“”'’]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'unknown';

  let esScore = 0;
  let enScore = 0;
  for (const w of words) {
    if (ES_WORDS.has(w)) esScore += 1;
    if (EN_WORDS.has(w)) enScore += 1;
  }
  if (/[áéíóúñü]/.test(text.toLowerCase())) esScore += 2;
  if (/[¿¡]/.test(text)) esScore += 2;

  if (esScore === enScore) return 'unknown';
  return esScore > enScore ? 'es' : 'en';
}

/** The "other" language of the PuenteDesk pair. */
export function otherLanguage(lang) {
  return lang === 'es' ? 'en' : 'es';
}
