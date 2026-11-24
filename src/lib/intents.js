/**
 * Intent detection for support messages.
 *
 * Keyword-based and deliberately small: the intents map to the knowledge
 * base topics PuenteDesk ships with. The detected intent drives draft
 * replies and case summaries; it is a routing hint, never a decision about
 * the customer's case.
 */

export const INTENTS = [
  {
    key: 'appointment',
    labelEn: 'Appointment scheduling',
    labelEs: 'Agendar una cita',
    keywords: ['cita', 'appointment', 'agendar', 'schedule', 'espacio', 'availability', 'disponibilidad'],
  },
  {
    key: 'certified-translation',
    labelEn: 'Certified translation',
    labelEs: 'Traducción certificada',
    keywords: ['traducción certificada', 'certified translation', 'traducir', 'translate'],
  },
  {
    key: 'notary',
    labelEn: 'Notary services',
    labelEs: 'Servicios de notario',
    keywords: ['notario', 'notary', 'poder notarial', 'power of attorney', 'testigos', 'witnesses', 'apostilla', 'apostille'],
  },
  {
    key: 'documents',
    labelEn: 'Required documents',
    labelEs: 'Documentos requeridos',
    keywords: ['documento', 'documentos', 'document', 'documents', 'llevar', 'traer', 'bring', 'acta', 'certificate'],
  },
  {
    key: 'prices',
    labelEn: 'Prices and fees',
    labelEs: 'Precios y tarifas',
    keywords: ['precio', 'cuesta', 'cuánto', 'price', 'cost', 'fee', 'tarifa', 'cobran'],
  },
  {
    key: 'hours',
    labelEn: 'Office hours',
    labelEs: 'Horario de oficina',
    keywords: ['hora', 'horario', 'abren', 'abierto', 'hours', 'open', 'cierran', 'close'],
  },
  {
    key: 'passport',
    labelEn: 'Passport services',
    labelEs: 'Trámites de pasaporte',
    keywords: ['pasaporte', 'passport'],
  },
  {
    key: 'work-permit',
    labelEn: 'Work permit',
    labelEs: 'Permiso de trabajo',
    keywords: ['permiso de trabajo', 'work permit'],
  },
  {
    key: 'status',
    labelEn: 'Case status',
    labelEs: 'Estado del caso',
    keywords: ['estado del caso', 'estado', 'status', 'cuándo estará', 'how long', 'cuánto tarda'],
  },
];

/**
 * Detect the best-matching intent for a text. Returns the intent or null.
 * Matched keywords are blanked out as they score, so a word is never
 * double-counted through a longer keyword that contains it ("documento"
 * inside "documentos"). Ties go to the intent listed first above, which is
 * ordered by how central the topic is to a services agency's front desk.
 */
export function detectIntent(text) {
  if (!text) return null;
  let best = null;
  let bestScore = 0;
  for (const intent of INTENTS) {
    let haystack = text.toLowerCase();
    let score = 0;
    const keywords = [...intent.keywords].sort((a, b) => b.length - a.length);
    for (const kw of keywords) {
      const idx = haystack.indexOf(kw);
      if (idx >= 0) {
        score += kw.includes(' ') ? 2 : 1;
        haystack = haystack.slice(0, idx) + ' '.repeat(kw.length) + haystack.slice(idx + kw.length);
      }
    }
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }
  return best;
}

export function intentByKey(key) {
  return INTENTS.find((i) => i.key === key) || null;
}
