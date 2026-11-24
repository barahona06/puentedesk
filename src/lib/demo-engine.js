/**
 * PuenteDesk demo translation engine.
 *
 * A real, working translator for the language of a services agency's front
 * desk — with NO external keys, accounts or network calls. It combines:
 *
 *   1. Curated bilingual sentence patterns (below) for the phrases support
 *      conversations are actually made of, with slots for the variable
 *      parts (documents, days, topics).
 *   2. A slot-phrase dictionary for common fillers ("este sábado por la
 *      mañana" <-> "this Saturday morning").
 *   3. A glossary fallback (agency terms + common phrases) that substitutes
 *      what it knows and honestly flags the result as approximate.
 *
 * It implements the same provider interface as a production translator
 * (see translator.js), so swapping in an LLM/translation API later changes
 * nothing else in the app. Drafts it produces are ALWAYS drafts: a human
 * agent reviews and sends them.
 */

import { detectLanguage, otherLanguage, LANGUAGE_NAMES } from './languages.js';
import { DEFAULT_GLOSSARY, substituteGlossary, escapeRegExp } from './glossary.js';
import { detectIntent, intentByKey } from './intents.js';
import { kbForIntent } from './kb.js';

/* ------------------------------------------------------------------ */
/* Sentence patterns                                                   */
/* ------------------------------------------------------------------ */

const PATTERNS = [
  { id: 'need-appointment', es: 'necesito una cita para {thing}', en: 'I need an appointment for {thing}' },
  { id: 'want-to-know-docs', es: 'quiero saber qué documentos debo llevar', en: 'I want to know which documents I should bring' },
  { id: 'have-availability', es: '¿tienen espacio {when}?', en: 'Do you have availability {when}?' },
  { id: 'asked-certified-translation', es: 'me piden una traducción certificada de {doc} para un trámite', en: 'I was asked for a certified translation of {doc} for an official process' },
  { id: 'how-much-how-long', es: '¿cuánto cuesta y en cuántos días está lista?', en: 'How much does it cost, and in how many days will it be ready?' },
  { id: 'what-time-open', es: '¿a qué hora abren {day}?', en: 'What time do you open {day}?' },
  { id: 'stop-by-before-work', es: 'necesito pasar antes de mi trabajo', en: 'I need to stop by before work' },
  { id: 'we-open-at', es: 'abrimos a las {time} {day}', en: 'We open at {time} {day}' },
  { id: 'appointment-or-quick', es: '¿necesita una cita o es una pregunta rápida?', en: 'Do you need an appointment or is it a quick question?' },
  { id: 'quick-question-about', es: 'es una pregunta rápida sobre {topic}', en: 'It is a quick question about {topic}' },
  { id: 'told-need-witnesses', es: 'me dijeron que necesito dos testigos', en: 'I was told that I need two witnesses' },
  { id: 'have-to-sign', es: 'tengo que firmar {doc}', en: 'I have to sign {doc}' },
  { id: 'can-you-help', es: '¿ustedes pueden ayudarme con eso {when}?', en: 'Can you help me with that {when}?' },
  { id: 'please-bring', es: 'por favor traiga {docs}', en: 'Please bring {docs}' },
  { id: 'want-to-renew', es: 'quiero renovar {doc}', en: 'I want to renew {doc}' },
  { id: 'price-of', es: '¿cuál es el precio de {thing}?', en: 'What is the price of {thing}?' },
  { id: 'need-help-with', es: 'necesito ayuda con {thing}', en: 'I need help with {thing}' },
  { id: 'my-appointment-is', es: 'mi cita es {when}', en: 'My appointment is {when}' },
  { id: 'thank-you', es: 'gracias', en: 'Thank you' },
  { id: 'i-am-writing-about', es: 'le escribo por {topic}', en: 'I am writing about {topic}' },
];

/** Slot fillers that translate as whole phrases (es -> en; reverse derived). */
const SLOT_PHRASES = {
  'renovar mi pasaporte': 'renewing my passport',
  'este sábado por la mañana': 'this Saturday morning',
  'el sábado por la mañana': 'Saturday morning',
  'esta semana': 'this week',
  'el lunes': 'on Monday',
  'el martes': 'on Tuesday',
  'el miércoles': 'on Wednesday',
  'el jueves': 'on Thursday',
  'el viernes': 'on Friday',
  'el sábado': 'on Saturday',
  'el domingo': 'on Sunday',
  'mi acta de nacimiento': 'my birth certificate',
  'mi acta de matrimonio': 'my marriage certificate',
  'un poder notarial': 'a power of attorney',
  'una carta': 'a letter',
  'el precio de la renovación del permiso de trabajo': 'the price of the work permit renewal',
  'mi pasaporte': 'my passport',
  'mi permiso de trabajo': 'my work permit',
  'mi licencia de conducir': "my driver's license",
};

const GREETINGS = [
  ['buenas tardes', 'good afternoon'],
  ['buenos días', 'good morning'],
  ['buenas noches', 'good evening'],
  ['buenas', 'hello'],
  ['hola', 'hello'],
  ['good afternoon', 'buenas tardes'],
  ['good morning', 'buenos días'],
  ['good evening', 'buenas noches'],
  ['hello', 'hola'],
  ['hi', 'hola'],
];

const COMMON_PHRASES = [
  { es: 'por favor', en: 'please' },
  { es: 'muchas gracias', en: 'thank you very much' },
  { es: 'gracias', en: 'thank you' },
  { es: 'necesito', en: 'I need' },
  { es: 'quiero', en: 'I want' },
  { es: 'tengo', en: 'I have' },
  { es: 'mañana', en: 'tomorrow' },
  { es: 'hoy', en: 'today' },
  { es: 'también', en: 'also' },
  { es: 'saber', en: 'to know' },
  { es: 'ayuda', en: 'help' },
  { es: 'pregunta', en: 'question' },
  { es: 'rápida', en: 'quick' },
  { es: 'semana', en: 'week' },
];

/* ------------------------------------------------------------------ */
/* Pattern compilation                                                 */
/* ------------------------------------------------------------------ */

function compileTemplate(template) {
  const slots = [];
  const cleaned = template.replace(/[¿?¡!.,;:]$/g, '').replace(/^[¿¡]/, '');
  let regex = escapeRegExp(cleaned).replace(/\\\{(\w+)\\\}/g, (_, name) => {
    slots.push(name);
    return `(?<${name}>.+?)`;
  });
  return { regex: new RegExp(`^${regex}$`, 'i'), slots, question: template.includes('?') };
}

for (const p of PATTERNS) {
  p.compiledEs = compileTemplate(p.es);
  p.compiledEn = compileTemplate(p.en);
}

function translateSlot(value, fromLang) {
  const trimmed = value.trim();
  const key = trimmed.toLowerCase();
  const dict = fromLang === 'es'
    ? SLOT_PHRASES
    : Object.fromEntries(Object.entries(SLOT_PHRASES).map(([es, en]) => [en.toLowerCase(), es]));
  if (dict[key]) return dict[key];
  // Fallback: translate the longest known phrase appearing inside the slot
  // (e.g. a time slot that captured "AM on Monday" still yields "el lunes").
  let best = null;
  for (const phrase of Object.keys(dict)) {
    if (key.includes(phrase) && (!best || phrase.length > best.length)) best = phrase;
  }
  if (best) {
    const idx = key.indexOf(best);
    return trimmed.slice(0, idx) + dict[best] + trimmed.slice(idx + best.length);
  }
  return trimmed;
}

function splitSentences(text) {
  const parts = text.match(/[^.!?]+[.!?]+["')\]]*\s*/g);
  if (!parts) return [text.trim()];
  return parts.map((s) => s.trim()).filter(Boolean);
}

function stripPunctuation(sentence) {
  return sentence.replace(/^[¿¡\s]+/, '').replace(/[.!?]+$/, '').trim();
}

/* ------------------------------------------------------------------ */
/* The demo provider                                                   */
/* ------------------------------------------------------------------ */

export class DemoTranslator {
  constructor() {
    this.engineName = 'demo';
  }

  async translate({ text, sourceLanguage = 'auto', targetLanguage, context = '', glossary = DEFAULT_GLOSSARY }) {
    if (!text || !text.trim()) {
      return { text: '', sourceLanguage: 'unknown', targetLanguage, engine: this.engineName, approximate: false, patternsMatched: 0 };
    }
    let source = sourceLanguage;
    if (!source || source === 'auto' || source === 'unknown') source = detectLanguage(text);
    if (source === 'unknown') source = otherLanguage(targetLanguage);
    if (source === targetLanguage) {
      return { text, sourceLanguage: source, targetLanguage, engine: this.engineName, approximate: false, patternsMatched: 0, note: 'Text is already in the target language.' };
    }

    const sentences = splitSentences(text);
    const translated = [];
    let approximate = false;
    let patternsMatched = 0;
    for (const sentence of sentences) {
      const r = this.translateSentence(sentence, source, targetLanguage, glossary);
      translated.push(r.text);
      if (r.approximate) approximate = true;
      if (r.pattern) patternsMatched += 1;
    }
    return {
      text: translated.join(' '),
      sourceLanguage: source,
      targetLanguage,
      engine: this.engineName,
      approximate,
      patternsMatched,
      context: context || undefined,
    };
  }

  translateSentence(sentence, fromLang, toLang, glossary) {
    let rest = sentence.trim();
    let greetingOut = '';

    // Translate a leading greeting separately ("Buenas tardes, necesito…").
    const lower = rest.toLowerCase();
    for (const [gFrom, gTo] of GREETINGS) {
      // GREETINGS holds pairs in both directions; only use the pairs whose
      // source side belongs to the source language.
      const isEsSource = /[áéíóúñ]/.test(gFrom) || ['hola', 'buenas', 'buenas tardes', 'buenos días', 'buenas noches'].includes(gFrom);
      if ((fromLang === 'es') !== isEsSource) continue;
      if (lower.startsWith(gFrom) && (rest.length === gFrom.length || rest[gFrom.length] === ',' || rest[gFrom.length] === ' ')) {
        greetingOut = gTo;
        rest = rest.slice(gFrom.length).replace(/^[,\s]+/, '');
        break;
      }
    }

    const core = stripPunctuation(rest);
    let body = null;
    let usedPattern = null;

    if (core) {
      // Compound sentence FIRST: "<clause> y/and <clause>". A single
      // pattern's slot would otherwise swallow the second clause whole.
      // Each clause must match a pattern on its own, so sentences that are
      // one pattern containing a conjunction still fall through intact.
      const conjunction = fromLang === 'es' ? ' y ' : ' and ';
      const conjIdx = core.toLowerCase().indexOf(conjunction);
      if (conjIdx > 0) {
        const left = this.translateSentence(core.slice(0, conjIdx), fromLang, toLang, glossary);
        const right = this.translateSentence(core.slice(conjIdx + conjunction.length), fromLang, toLang, glossary);
        if (left.pattern && right.pattern) {
          const joiner = toLang === 'es' ? ' y ' : ' and ';
          const leftText = left.text.replace(/[.!?]+$/, '');
          const rightText = right.text.replace(/[.!?]+$/, '');
          let joined = `${leftText}${joiner}${rightText}`;
          joined = sentence.includes('?')
            ? toLang === 'es'
              ? `¿${joined}?`
              : `${joined}?`
            : `${joined}.`;
          if (greetingOut) {
            const g = greetingOut[0].toUpperCase() + greetingOut.slice(1);
            const bodyStart = /^I[\s']/.test(joined) || joined.startsWith('¿')
              ? joined
              : `${joined[0].toLowerCase()}${joined.slice(1)}`;
            joined = `${g}, ${bodyStart}`;
          }
          return {
            text: joined,
            approximate: left.approximate || right.approximate,
            pattern: 'compound',
          };
        }
      }

      for (const pattern of PATTERNS) {
        const compiled = fromLang === 'es' ? pattern.compiledEs : pattern.compiledEn;
        const m = core.match(compiled.regex);
        if (m) {
          const targetTemplate = (fromLang === 'es' ? pattern.en : pattern.es)
            .replace(/^[¿¡]/, '')
            .replace(/[.!?]+$/, '');
          body = targetTemplate.replace(/\{(\w+)\}/g, (_, name) => translateSlot(m.groups[name] || '', fromLang));
          usedPattern = pattern;
          break;
        }
      }
    }

    let approximate = false;
    if (body === null) {
      body = substituteGlossary(core, [...glossary, ...COMMON_PHRASES], fromLang, toLang);
      approximate = core.length > 0;
    }

    const isQuestion = usedPattern
      ? (fromLang === 'es' ? usedPattern.compiledEn.question : usedPattern.compiledEs.question) || (toLang === 'en' ? usedPattern.en : usedPattern.es).includes('?')
      : sentence.includes('?');

    let out = body ? body[0].toUpperCase() + body.slice(1) : '';
    if (isQuestion) {
      out = toLang === 'es' ? `¿${out}?` : `${out}?`;
    } else if (out) {
      out = `${out}.`;
    }
    if (greetingOut) {
      const g = greetingOut[0].toUpperCase() + greetingOut.slice(1);
      // Lowercase the body's first letter after a greeting — except the
      // English pronoun "I", which is always capitalized.
      const bodyStart = /^I[\s']/.test(out) ? out : `${out[0].toLowerCase()}${out.slice(1)}`;
      out = out ? `${g}, ${bodyStart}` : `${g}.`;
    }
    return { text: out, approximate, pattern: usedPattern ? usedPattern.id : null };
  }

  /**
   * Draft a reply in the customer's language. Always a draft for human
   * approval — this engine never sends anything.
   */
  async draftReply({ customerMessage = '', instruction = '', customerLanguage, glossary = DEFAULT_GLOSSARY }) {
    const lang = customerLanguage && customerLanguage !== 'auto'
      ? customerLanguage
      : detectLanguage(customerMessage) !== 'unknown'
        ? detectLanguage(customerMessage)
        : 'es';
    const intent = detectIntent(`${customerMessage} ${instruction}`);
    const kb = intent ? kbForIntent(intent.key) : null;

    const parts = [];
    parts.push(lang === 'es' ? 'Hola, gracias por escribirnos.' : 'Hello, thank you for writing to us.');
    if (kb) parts.push(kb.body[lang]);

    // Confirmation parsed from the agent's instruction whenever the agent
    // actually gave one, e.g. "Confirm Saturday at 10 AM" — the instruction
    // is an explicit human decision, so it is honored whatever the detected
    // intent of the customer's message was.
    const confirmation = buildConfirmation(instruction, lang);
    if (confirmation) parts.push(confirmation);

    parts.push(lang === 'es'
      ? 'Quedamos atentos por si necesita algo más.'
      : 'Please let us know if you need anything else.');
    parts.push(lang === 'es' ? '— El equipo de atención al cliente' : '— The customer support team');

    return {
      draft: parts.join(' '),
      language: lang,
      intent: intent ? intent.key : 'general',
      basedOnKb: kb ? kb.id : null,
      engine: this.engineName,
      requiresHumanApproval: true,
    };
  }

  /**
   * Bilingual case summary from a conversation.
   * messages: [{ role: 'customer' | 'agent', text }]
   */
  async summarize({ messages = [], glossary = DEFAULT_GLOSSARY }) {
    const customerMessages = messages.filter((m) => m.role === 'customer');
    const allCustomerText = customerMessages.map((m) => m.text).join(' ');
    const customerLanguage = customerMessages.length
      ? detectLanguage(allCustomerText)
      : 'unknown';
    const intent = detectIntent(allCustomerText);
    const keyFacts = extractKeyFacts(messages.map((m) => m.text).join(' '));

    const last = messages[messages.length - 1];
    const waitingOnCustomer = last && last.role === 'agent';
    const statusEn = !last
      ? 'No messages yet'
      : waitingOnCustomer
        ? 'Waiting for the customer to reply'
        : 'Waiting for the support team to reply';
    const statusEs = !last
      ? 'Sin mensajes todavía'
      : waitingOnCustomer
        ? 'En espera de respuesta del cliente'
        : 'En espera de respuesta del equipo';

    const firstCustomer = customerMessages[0];
    let needEn = '—';
    let needEs = '—';
    if (firstCustomer) {
      if (customerLanguage === 'es') {
        needEs = firstCustomer.text;
        needEn = (await this.translate({ text: firstCustomer.text, sourceLanguage: 'es', targetLanguage: 'en', glossary })).text;
      } else {
        needEn = firstCustomer.text;
        needEs = (await this.translate({ text: firstCustomer.text, sourceLanguage: 'en', targetLanguage: 'es', glossary })).text;
      }
    }

    const next = NEXT_STEPS[intent ? intent.key : 'general'] || NEXT_STEPS.general;
    const topicEn = intent ? intent.labelEn : 'General question';
    const topicEs = intent ? intent.labelEs : 'Pregunta general';
    const factsText = keyFacts.length ? keyFacts.join(' · ') : 'None mentioned';

    const summaryEn = [
      `Topic: ${topicEn}`,
      `Customer language: ${LANGUAGE_NAMES[customerLanguage] || 'Unknown'}`,
      `What the customer needs: ${needEn}`,
      `Key facts: ${factsText}`,
      `Status: ${statusEn}`,
      `Suggested next step: ${next.en}`,
    ].join('\n');

    const summaryEs = [
      `Tema: ${topicEs}`,
      `Idioma del cliente: ${customerLanguage === 'es' ? 'Español' : customerLanguage === 'en' ? 'Inglés' : 'Sin determinar'}`,
      `Lo que el cliente necesita: ${needEs}`,
      `Datos clave: ${keyFacts.length ? keyFacts.join(' · ') : 'Ninguno mencionado'}`,
      `Estado: ${statusEs}`,
      `Siguiente paso sugerido: ${next.es}`,
    ].join('\n');

    return {
      intent: intent ? intent.key : 'general',
      customerLanguage,
      keyFacts,
      status: statusEn,
      summaryEn,
      summaryEs,
      engine: this.engineName,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DAY_NAMES_EN = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES_ES = { monday: 'lunes', tuesday: 'martes', wednesday: 'miércoles', thursday: 'jueves', friday: 'viernes', saturday: 'sábado', sunday: 'domingo' };

function buildConfirmation(instruction, lang) {
  if (!instruction) return null;
  const lower = instruction.toLowerCase();
  const dayEn = DAY_NAMES_EN.find((d) => lower.includes(d));
  const dayEs = Object.entries(DAY_NAMES_ES).find(([, es]) => lower.includes(es));
  const timeMatch = instruction.match(/\b(\d{1,2}(?::\d{2})?)\s*(a\.?\s?m\.?|p\.?\s?m\.?|am|pm)\b/i);
  if (!dayEn && !dayEs && !timeMatch) return null;
  const time = timeMatch ? `${timeMatch[1]} ${timeMatch[2].toUpperCase().replace(/\./g, '')}` : null;
  if (lang === 'es') {
    const day = dayEn ? DAY_NAMES_ES[dayEn] : dayEs ? dayEs[1] : null;
    return `Su cita queda confirmada${day ? ` para el ${day}` : ''}${time ? ` a las ${time}` : ''}.`;
  }
  const day = dayEn || (dayEs ? dayEs[0] : null);
  return `Your appointment is confirmed${day ? ` for ${day[0].toUpperCase() + day.slice(1)}` : ''}${time ? ` at ${time}` : ''}.`;
}

function extractKeyFacts(text) {
  const facts = [];
  const seen = new Set();
  const push = (v) => {
    const k = v.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      facts.push(v);
    }
  };
  for (const m of text.matchAll(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/gi)) push(m[0]);
  for (const m of text.matchAll(/\b\d{1,2}(?::\d{2})?\s*(?:a\.?\s?m\.?|p\.?\s?m\.?|am|pm)\b/gi)) push(m[0].replace(/\s+/g, ' '));
  for (const m of text.matchAll(/\$\s?\d[\d.,]*/g)) push(m[0]);
  for (const m of text.matchAll(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g)) push(m[0]);
  return facts;
}

const NEXT_STEPS = {
  appointment: {
    en: 'Confirm a day and time with the customer and send the document checklist for their service.',
    es: 'Confirmar día y hora con el cliente y enviar la lista de documentos de su servicio.',
  },
  'certified-translation': {
    en: 'Confirm the exact fee and turnaround for the document, then ask the customer to send a clear photo or scan.',
    es: 'Confirmar la tarifa exacta y el tiempo de entrega del documento, y pedir al cliente una foto o escaneo claro.',
  },
  notary: {
    en: 'Confirm the appointment, remind the customer to bring photo ID, and arrange witnesses if needed.',
    es: 'Confirmar la cita, recordar al cliente que traiga identificación con foto y coordinar los testigos si hacen falta.',
  },
  documents: {
    en: 'Send the exact document list for the customer’s service.',
    es: 'Enviar la lista exacta de documentos del servicio del cliente.',
  },
  prices: {
    en: 'Quote the written fee for the service and clarify which government fees are separate.',
    es: 'Cotizar la tarifa por escrito del servicio y aclarar qué tarifas del gobierno van aparte.',
  },
  hours: {
    en: 'Answer with the office hours and offer an appointment if the visit needs one.',
    es: 'Responder con el horario de oficina y ofrecer una cita si la visita la necesita.',
  },
  passport: {
    en: 'Confirm the appointment and remind the customer to bring the previous passport and photo ID.',
    es: 'Confirmar la cita y recordar al cliente que traiga el pasaporte anterior y una identificación con foto.',
  },
  'work-permit': {
    en: 'Answer the price question in writing and offer an appointment to review the case with a specialist.',
    es: 'Responder el precio por escrito y ofrecer una cita para revisar el caso con un especialista.',
  },
  status: {
    en: 'Check the case status internally and reply with a realistic timeframe.',
    es: 'Revisar el estado del caso internamente y responder con un tiempo realista.',
  },
  general: {
    en: 'Reply to the customer’s question or route the case to the right specialist.',
    es: 'Responder la pregunta del cliente o pasar el caso al especialista correcto.',
  },
};
