/**
 * Mini knowledge base for PuenteDesk (bilingual, Spanish + English).
 *
 * These entries are the agency's public, general information: office hours,
 * how appointments work, what a certified translation is, and similar facts
 * that are safe to share with any customer. They intentionally contain NO
 * regulated advice: nothing here decides anyone's tax or immigration case.
 *
 * In production this same content lives in Confluence and PuenteDesk reads
 * it through the Confluence API (scopes: search:confluence,
 * read:page:confluence). The bundled copy keeps the demo — and the Rovo
 * agent's answers — working with zero setup.
 */

export const KB_ENTRIES = [
  {
    id: 'kb-hours',
    intent: 'hours',
    title: {
      en: 'Office hours',
      es: 'Horario de oficina',
    },
    body: {
      en: 'Our office is open Monday to Friday from 9:00 AM to 6:00 PM, and Saturdays from 9:00 AM to 2:00 PM. We are closed on Sundays and federal holidays.',
      es: 'Nuestra oficina abre de lunes a viernes de 9:00 AM a 6:00 PM, y los sábados de 9:00 AM a 2:00 PM. Cerramos los domingos y días feriados federales.',
    },
    keywords: ['hora', 'horario', 'abren', 'hours', 'open', 'sábado', 'saturday', 'lunes', 'monday'],
  },
  {
    id: 'kb-appointments',
    intent: 'appointment',
    title: {
      en: 'How appointments work',
      es: 'Cómo funcionan las citas',
    },
    body: {
      en: 'Appointments are scheduled in 30-minute blocks. You can request one by message or phone, and we confirm the day and time before your visit. If you need to reschedule, tell us at least one day ahead and we will offer the next available slot at no extra cost.',
      es: 'Las citas se agendan en bloques de 30 minutos. Puede pedir la suya por mensaje o por teléfono, y le confirmamos el día y la hora antes de su visita. Si necesita cambiarla, avísenos con al menos un día de anticipación y le ofrecemos el siguiente espacio disponible sin costo extra.',
    },
    keywords: ['cita', 'appointment', 'agendar', 'schedule', 'reprogramar', 'reschedule', 'espacio'],
  },
  {
    id: 'kb-certified-translation',
    intent: 'certified-translation',
    title: {
      en: 'Certified translations',
      es: 'Traducciones certificadas',
    },
    body: {
      en: 'A certified translation includes a signed statement from the translator confirming the translation is complete and accurate. Standard documents (birth or marriage certificates) are usually ready in 2 to 3 business days. The price depends on the document and its length; we confirm the exact fee before starting.',
      es: 'Una traducción certificada incluye una declaración firmada del traductor que confirma que la traducción es completa y fiel. Los documentos estándar (actas de nacimiento o de matrimonio) suelen estar listos en 2 a 3 días hábiles. El precio depende del documento y su extensión; le confirmamos la tarifa exacta antes de comenzar.',
    },
    keywords: ['traducción certificada', 'certified translation', 'acta', 'certificate', 'días', 'days'],
  },
  {
    id: 'kb-notary',
    intent: 'notary',
    title: {
      en: 'Notary services',
      es: 'Servicios de notario',
    },
    body: {
      en: 'Our notary public can witness signatures on letters, affidavits and powers of attorney. Bring a valid government photo ID. If your document needs witnesses, tell us when you book and we will arrange them, or you may bring your own (they must also show ID and must not be family members).',
      es: 'Nuestro notario público puede dar fe de firmas en cartas, declaraciones juradas y poderes notariales. Traiga una identificación oficial vigente con foto. Si su documento necesita testigos, avísenos al agendar y los coordinamos, o puede traer los suyos (también deben mostrar identificación y no pueden ser familiares).',
    },
    keywords: ['notario', 'notary', 'testigos', 'witnesses', 'poder notarial', 'power of attorney', 'firma', 'signature'],
  },
  {
    id: 'kb-documents',
    intent: 'documents',
    title: {
      en: 'What to bring to your visit',
      es: 'Qué traer a su visita',
    },
    body: {
      en: 'For most services bring: a valid government photo ID, any letters or notices you received about your case, and the original documents related to your request. If you are renewing a document, bring the previous one. We will tell you the exact list for your service when we confirm your appointment.',
      es: 'Para la mayoría de los servicios traiga: una identificación oficial vigente con foto, cualquier carta o aviso que haya recibido sobre su caso, y los documentos originales relacionados con su solicitud. Si va a renovar un documento, traiga el anterior. Al confirmar su cita le indicamos la lista exacta para su servicio.',
    },
    keywords: ['documento', 'documentos', 'document', 'llevar', 'traer', 'bring', 'necesito'],
  },
  {
    id: 'kb-prices',
    intent: 'prices',
    title: {
      en: 'Prices and fees',
      es: 'Precios y tarifas',
    },
    body: {
      en: 'Every service has a written fee that we confirm before any work begins — there are no surprise charges. Government filing fees are separate from our service fee and are paid directly to the agency. We accept cards, cash and bank transfer.',
      es: 'Cada servicio tiene una tarifa por escrito que le confirmamos antes de comenzar cualquier trabajo; no hay cargos sorpresa. Las tarifas del gobierno son aparte de nuestro costo de servicio y se pagan directo a la agencia. Aceptamos tarjeta, efectivo y transferencia bancaria.',
    },
    keywords: ['precio', 'cuesta', 'cuánto', 'price', 'cost', 'fee', 'tarifa', 'cobran', 'pagar'],
  },
  {
    id: 'kb-passport',
    intent: 'passport',
    title: {
      en: 'Passport appointments',
      es: 'Citas de pasaporte',
    },
    body: {
      en: 'For a passport renewal appointment, bring your most recent passport and a valid photo ID. We review your forms with you and check that your photo meets the official requirements before you submit anything.',
      es: 'Para una cita de renovación de pasaporte, traiga su pasaporte más reciente y una identificación vigente con foto. Revisamos sus formularios con usted y verificamos que su foto cumpla los requisitos oficiales antes de que entregue cualquier cosa.',
    },
    keywords: ['pasaporte', 'passport', 'renovar', 'renewal'],
  },
];

/** Find the KB entry for an intent key, or null. */
export function kbForIntent(intentKey) {
  if (!intentKey) return null;
  return KB_ENTRIES.find((e) => e.intent === intentKey) || null;
}

/**
 * Keyword search over the knowledge base. Returns matching entries, best
 * first. This mirrors what the Confluence-backed search does in production.
 */
export function searchKb(query, limit = 3) {
  if (!query) return [];
  const q = query.toLowerCase();
  const scored = KB_ENTRIES.map((entry) => {
    let score = 0;
    for (const kw of entry.keywords) if (q.includes(kw)) score += kw.includes(' ') ? 2 : 1;
    if (q.includes(entry.title.en.toLowerCase()) || q.includes(entry.title.es.toLowerCase())) score += 2;
    return { entry, score };
  }).filter((s) => s.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}
