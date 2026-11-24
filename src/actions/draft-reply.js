/**
 * Rovo action: draft-customer-reply (CREATE — it creates a draft).
 *
 * Drafts a reply in the CUSTOMER's language from the customer's message
 * plus the agent's instruction (given in the agent's language, e.g.
 * "Confirm Saturday at 10 AM"). The result is a draft for human approval:
 * this action never posts, sends or promises anything to the customer.
 */

import { loadSettings, effectiveGlossary } from '../lib/settings.js';

export function createDraftReplyHandler({ translator, store }) {
  return async function draftCustomerReply(payload = {}) {
    const { customerMessage, instruction, customerLanguage } = payload;
    if (!customerMessage || typeof customerMessage !== 'string' || !customerMessage.trim()) {
      return { error: 'Input "customerMessage" is required.' };
    }
    const settings = await loadSettings(store);
    const result = await translator.draftReply({
      customerMessage,
      instruction: instruction || '',
      customerLanguage: customerLanguage || settings.customerLanguage || 'auto',
      glossary: effectiveGlossary(settings),
    });
    return {
      draft: result.draft,
      language: result.language,
      intent: result.intent,
      basedOnKb: result.basedOnKb,
      engine: result.engine,
      requiresHumanApproval: true,
      note: 'Draft only — a human agent must review and send it. Nothing was posted to the request.',
    };
  };
}

/** Forge entry point (manifest: actions/draft-reply.handler). */
export async function handler(payload, context) {
  const { buildDeps } = await import('../lib/runtime.js');
  return createDraftReplyHandler(buildDeps())(payload, context);
}
