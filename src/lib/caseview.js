/**
 * Builds the view model for the PuenteDesk agent panel from an issue in
 * PuenteDesk's internal shape:
 *
 *   issue = {
 *     key, summary, service?, status?, reporterName?,
 *     descriptionText,                       // customer's opening message
 *     comments: [{ role: 'customer'|'agent', authorName, body, created }]
 *   }
 *
 * The panel resolver (src/index.js) maps a real Jira/JSM issue into this
 * shape; the local demo harness feeds the seed cases (src/seed/cases.js).
 * Keeping the mapping separate means the translation flow is fully testable
 * without a live Jira.
 */

import { detectLanguage, otherLanguage, LANGUAGE_NAMES } from './languages.js';
import { findGlossaryHits } from './glossary.js';
import { effectiveGlossary } from './settings.js';

export async function buildCaseView({ issue, settings, translator }) {
  const glossary = effectiveGlossary(settings);
  const agentLanguage = settings.agentLanguage || 'en';
  const fallbackCustomerLanguage = settings.customerLanguage || 'es';

  const rawMessages = [];
  if (issue.descriptionText && issue.descriptionText.trim()) {
    rawMessages.push({
      role: 'customer',
      authorName: issue.reporterName || 'Customer',
      body: issue.descriptionText.trim(),
      created: null,
    });
  }
  for (const c of issue.comments || []) {
    rawMessages.push({
      role: c.role,
      authorName: c.authorName || (c.role === 'customer' ? 'Customer' : 'Support team'),
      body: (c.body || '').trim(),
      created: c.created || null,
    });
  }

  const messages = [];
  for (const m of rawMessages) {
    if (!m.body) continue;
    let lang = detectLanguage(m.body);
    if (lang === 'unknown') lang = m.role === 'customer' ? fallbackCustomerLanguage : agentLanguage;
    let translation = null;
    if (lang !== agentLanguage) {
      const r = await translator.translate({
        text: m.body,
        sourceLanguage: lang,
        targetLanguage: agentLanguage,
        context: issue.service || issue.summary || '',
        glossary,
      });
      translation = { text: r.text, approximate: r.approximate, engine: r.engine };
    }
    messages.push({ ...m, language: lang, languageName: LANGUAGE_NAMES[lang] || lang, translation });
  }

  const customerMessages = messages.filter((m) => m.role === 'customer');
  const customerLanguage = customerMessages.length
    ? customerMessages[customerMessages.length - 1].language
    : fallbackCustomerLanguage;

  const glossaryHits = findGlossaryHits(
    customerMessages.map((m) => m.body).join(' '),
    glossary,
  );

  let suggestedReply = null;
  const latestCustomer = customerMessages[customerMessages.length - 1];
  if (latestCustomer) {
    suggestedReply = await translator.draftReply({
      customerMessage: latestCustomer.body,
      customerLanguage,
      glossary,
    });
  }

  const summary = await translator.summarize({
    messages: messages.map((m) => ({ role: m.role, text: m.body })),
    glossary,
  });

  return {
    issueKey: issue.key,
    summary: issue.summary,
    service: issue.service || null,
    status: issue.status || null,
    agentLanguage,
    customerLanguage,
    customerLanguageName: LANGUAGE_NAMES[customerLanguage] || customerLanguage,
    engine: translator.engineName || 'demo',
    messages,
    glossaryHits,
    suggestedReply,
    caseSummary: summary,
  };
}
