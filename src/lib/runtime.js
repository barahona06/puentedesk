/**
 * Forge runtime wiring — the ONLY module (besides src/index.js) that imports
 * Forge platform packages. Everything else in src/lib is plain Node code so
 * the whole translation flow can be exercised locally (see test/run-demo.js)
 * without an Atlassian account.
 */

import { kvs } from '@forge/kvs';
import { createTranslator } from './translator.js';

/** Settings store backed by Forge Key-Value Storage. */
export function createKvsStore() {
  return {
    get: (key) => kvs.get(key),
    set: (key, value) => kvs.set(key, value),
    delete: (key) => kvs.delete(key),
  };
}

/** Dependencies for the Rovo action handlers and the panel resolver. */
export function buildDeps() {
  return {
    translator: createTranslator(),
    store: createKvsStore(),
  };
}
