/**
 * Rovo action: translate-with-context (GET).
 *
 * Translates one message between Spanish and English, using the case
 * context (service, request type) and the agency glossary stored in KVS.
 * The factory takes its dependencies so the exact same code path runs in
 * the local demo harness (test/run-demo.js) with the demo engine.
 */

import { loadSettings, effectiveGlossary } from '../lib/settings.js';

export function createTranslateHandler({ translator, store }) {
  return async function translateWithContext(payload = {}) {
    const { text, targetLanguage, sourceLanguage, context } = payload;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return { error: 'Input "text" is required.' };
    }
    if (!targetLanguage || !['es', 'en'].includes(targetLanguage)) {
      return { error: 'Input "targetLanguage" must be "es" or "en".' };
    }
    const settings = await loadSettings(store);
    const result = await translator.translate({
      text,
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage,
      context: context || '',
      glossary: effectiveGlossary(settings),
    });
    return {
      translatedText: result.text,
      detectedSourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      engine: result.engine,
      approximate: result.approximate,
      ...(result.note ? { note: result.note } : {}),
    };
  };
}

/** Forge entry point (manifest: actions/translate.handler). */
export async function handler(payload, context) {
  const { buildDeps } = await import('../lib/runtime.js');
  return createTranslateHandler(buildDeps())(payload, context);
}
