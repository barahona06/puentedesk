/**
 * PuenteDesk per-installation settings, stored in Forge KVS.
 *
 * The store is any object with async get(key)/set(key, value) — the panel
 * resolver passes the real Forge KVS wrapper (lib/runtime.js), and local
 * tests pass an in-memory map. Settings hold no customer data: just the
 * agency's language defaults and its custom glossary pairs.
 */

import { DEFAULT_GLOSSARY } from './glossary.js';

export const SETTINGS_KEY = 'puentedesk:settings:v1';

export const DEFAULT_SETTINGS = {
  /** Language the support team works in. */
  agentLanguage: 'en',
  /** Default language of customers (used when detection is unclear). */
  customerLanguage: 'es',
  /** Detect each message's language automatically. */
  autoDetectLanguage: true,
  /** Agency-specific glossary pairs: [{ es, en }] added from the panel. */
  customGlossary: [],
};

export async function loadSettings(store) {
  if (!store) return { ...DEFAULT_SETTINGS };
  const saved = await store.get(SETTINGS_KEY);
  if (!saved || typeof saved !== 'object') return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(store, partial) {
  const current = await loadSettings(store);
  const next = { ...current, ...partial };
  if (partial && Array.isArray(partial.customGlossary)) {
    next.customGlossary = partial.customGlossary
      .filter((p) => p && typeof p.es === 'string' && typeof p.en === 'string' && p.es.trim() && p.en.trim())
      .map((p) => ({ es: p.es.trim(), en: p.en.trim() }));
  }
  await store.set(SETTINGS_KEY, next);
  return next;
}

/** Default glossary + the agency's custom pairs (custom pairs win ties). */
export function effectiveGlossary(settings) {
  const custom = settings && Array.isArray(settings.customGlossary) ? settings.customGlossary : [];
  return [...DEFAULT_GLOSSARY, ...custom];
}

/**
 * Parse the panel's glossary textarea: one pair per line, "es = en".
 * Returns { pairs, errors } — malformed lines are reported, not hidden.
 */
export function parseGlossaryText(text) {
  const pairs = [];
  const errors = [];
  (text || '').split('\n').forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const sep = trimmed.indexOf('=');
    if (sep <= 0) {
      errors.push(`Line ${idx + 1}: expected "spanish = english"`);
      return;
    }
    const es = trimmed.slice(0, sep).trim();
    const en = trimmed.slice(sep + 1).trim();
    if (!es || !en) {
      errors.push(`Line ${idx + 1}: both sides are required`);
      return;
    }
    pairs.push({ es, en });
  });
  return { pairs, errors };
}

export function glossaryToText(pairs) {
  return (pairs || []).map((p) => `${p.es} = ${p.en}`).join('\n');
}
