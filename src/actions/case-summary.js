/**
 * Rovo action: bilingual-case-summary (GET).
 *
 * Summarizes a whole request thread in BOTH languages: what the customer
 * needs, the key facts mentioned (days, times, amounts), who the thread is
 * waiting on, and a suggested next step.
 *
 * Input "conversation" format (one message per line, role prefix):
 *   Customer: <message>
 *   Agent: <message>
 * Lines without a prefix are appended to the previous message.
 */

import { loadSettings, effectiveGlossary } from '../lib/settings.js';

export function parseConversation(conversation) {
  const messages = [];
  for (const rawLine of String(conversation || '').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^(customer|agent|cliente|agente)\s*:\s*(.*)$/i);
    if (m) {
      const role = /^(customer|cliente)$/i.test(m[1]) ? 'customer' : 'agent';
      messages.push({ role, text: m[2] });
    } else if (messages.length) {
      messages[messages.length - 1].text += ` ${line}`;
    } else {
      messages.push({ role: 'customer', text: line });
    }
  }
  return messages;
}

export function createCaseSummaryHandler({ translator, store }) {
  return async function bilingualCaseSummary(payload = {}) {
    const { conversation } = payload;
    if (!conversation || typeof conversation !== 'string' || !conversation.trim()) {
      return { error: 'Input "conversation" is required.' };
    }
    const settings = await loadSettings(store);
    const messages = parseConversation(conversation);
    const result = await translator.summarize({
      messages,
      glossary: effectiveGlossary(settings),
    });
    return {
      intent: result.intent,
      customerLanguage: result.customerLanguage,
      keyFacts: result.keyFacts,
      status: result.status,
      summaryEn: result.summaryEn,
      summaryEs: result.summaryEs,
      engine: result.engine,
    };
  };
}

/** Forge entry point (manifest: actions/case-summary.handler). */
export async function handler(payload, context) {
  const { buildDeps } = await import('../lib/runtime.js');
  return createCaseSummaryHandler(buildDeps())(payload, context);
}
