/**
 * Translation provider interface for PuenteDesk.
 *
 * Every part of the app (panel resolver, Rovo actions) talks to a provider
 * through this contract — never to a specific vendor:
 *
 *   translate({ text, sourceLanguage, targetLanguage, context, glossary })
 *     -> { text, sourceLanguage, targetLanguage, engine, approximate, ... }
 *
 *   draftReply({ customerMessage, instruction, customerLanguage, glossary })
 *     -> { draft, language, intent, basedOnKb, engine, requiresHumanApproval }
 *
 *   summarize({ messages, glossary })
 *     -> { intent, customerLanguage, keyFacts, status, summaryEn, summaryEs, engine }
 *        where messages = [{ role: 'customer' | 'agent', text }]
 *
 * Providers:
 *   - 'demo' (default): the built-in demo engine (demo-engine.js). Works
 *     with no keys and no network — this is what judges run out of the box.
 *   - 'http': a generic JSON-over-HTTPS provider for a real LLM/translation
 *     API. Configure with Forge environment variables:
 *        forge variables set PUENTEDESK_TRANSLATOR http
 *        forge variables set PUENTEDESK_TRANSLATOR_ENDPOINT https://…
 *        forge variables set --encrypt PUENTEDESK_TRANSLATOR_API_KEY …
 *     Contract: POST { op: 'translate'|'draftReply'|'summarize', ...args }
 *     with header `Authorization: Bearer <key>`; the endpoint returns the
 *     same result shape as above (plus it may omit `engine`).
 *     If the variables are missing, the factory falls back to the demo
 *     engine and logs a warning instead of breaking the app.
 */

import { DemoTranslator } from './demo-engine.js';

class HttpTranslator {
  constructor({ endpoint, apiKey }) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.engineName = 'http';
  }

  async call(op, args) {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ op, ...args }),
    });
    if (!res.ok) {
      throw new Error(`Translation provider failed with HTTP ${res.status}`);
    }
    const data = await res.json();
    return { engine: this.engineName, ...data };
  }

  async translate(args) {
    return this.call('translate', args);
  }

  async draftReply(args) {
    const out = await this.call('draftReply', args);
    // Drafts are never auto-sent, whichever provider produced them.
    return { requiresHumanApproval: true, ...out };
  }

  async summarize(args) {
    return this.call('summarize', args);
  }
}

/**
 * Build the configured translation provider.
 * `env` is injectable for tests; in Forge it defaults to process.env, which
 * is where `forge variables` values appear.
 */
export function createTranslator(env = process.env) {
  const provider = (env.PUENTEDESK_TRANSLATOR || 'demo').toLowerCase();
  if (provider === 'http') {
    const endpoint = env.PUENTEDESK_TRANSLATOR_ENDPOINT;
    const apiKey = env.PUENTEDESK_TRANSLATOR_API_KEY;
    if (endpoint && apiKey) return new HttpTranslator({ endpoint, apiKey });
    console.warn(
      '[PuenteDesk] PUENTEDESK_TRANSLATOR=http but endpoint/API key are not set; falling back to the demo engine.',
    );
  }
  return new DemoTranslator();
}
