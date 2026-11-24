/**
 * Seed/demo cases for PuenteDesk.
 *
 * Four realistic support requests for a bilingual services agency
 * (appointments, certified translations, notary, office hours/prices).
 * ALL people, names and details are invented for the demo — no real client
 * data. In production these same shapes come from live Jira Service
 * Management requests (see src/index.js, fetchIssue).
 *
 * Shape = PuenteDesk's internal issue shape (see lib/caseview.js).
 * `tryWithAgent` lists the Rovo conversation starters that shine per case.
 */

export const SEED_CASES = [
  {
    key: 'PD-101',
    summary: 'Passport renewal appointment',
    service: 'Passport services',
    status: 'Waiting for support',
    reporterName: 'Carmen Ruiz',
    descriptionText:
      'Buenas tardes, necesito una cita para renovar mi pasaporte y quiero saber qué documentos debo llevar. ¿Tienen espacio este sábado por la mañana?',
    comments: [],
    tryWithAgent: [
      'Translate the latest customer message on PD-101',
      'Draft a reply in the customer’s language confirming Saturday morning',
      'Summarize case PD-101 in English and Spanish',
    ],
  },
  {
    key: 'PD-102',
    summary: 'Certified translation of a birth certificate',
    service: 'Translations',
    status: 'Waiting for support',
    reporterName: 'José Martínez',
    descriptionText:
      'Hola, me piden una traducción certificada de mi acta de nacimiento para un trámite. ¿Cuánto cuesta y en cuántos días está lista?',
    comments: [],
    tryWithAgent: [
      'What does the knowledge base say about certified translations?',
      'Draft a reply in the customer’s language for PD-102',
    ],
  },
  {
    key: 'PD-103',
    summary: 'Office hours and a work permit question',
    service: 'General information',
    status: 'In progress',
    reporterName: 'Ana Peña',
    descriptionText: '¿A qué hora abren el lunes? Necesito pasar antes de mi trabajo.',
    comments: [
      {
        role: 'agent',
        authorName: 'Support team',
        body: 'We open at 9 AM on Monday. Do you need an appointment or is it a quick question?',
        created: '2026-11-20T14:05:00.000Z',
      },
      {
        role: 'customer',
        authorName: 'Ana Peña',
        body: 'Es una pregunta rápida sobre el precio de la renovación del permiso de trabajo.',
        created: '2026-11-20T14:12:00.000Z',
      },
    ],
    tryWithAgent: [
      'Summarize case PD-103 in English and Spanish',
      'Draft a reply in the customer’s language with the work permit renewal price guidance',
    ],
  },
  {
    key: 'PD-104',
    summary: 'Power of attorney signing with witnesses',
    service: 'Notary services',
    status: 'Waiting for support',
    reporterName: 'Luis Herrera',
    descriptionText:
      'Buenas, tengo que firmar un poder notarial y me dijeron que necesito dos testigos. ¿Ustedes pueden ayudarme con eso el viernes?',
    comments: [],
    tryWithAgent: [
      'Translate the latest customer message on PD-104',
      'What does the knowledge base say about notary services and witnesses?',
    ],
  },
];

export function seedCaseByKey(key) {
  return SEED_CASES.find((c) => c.key === key) || null;
}
