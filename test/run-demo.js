/**
 * PuenteDesk local verification harness.
 *
 * Runs the REAL action handlers and the REAL panel view-model builder with
 * the built-in demo translation engine and the seed cases — no Atlassian
 * account, no network. This is the same code path Forge executes; only the
 * settings store (in-memory instead of Forge KVS) and the issue source
 * (seed cases instead of the Jira REST API) are substituted.
 *
 * Usage: npm run test:demo
 * Output is also written to test/output/demo-output.txt
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DemoTranslator as Engine } from '../src/lib/demo-engine.js';
import { loadSettings, saveSettings } from '../src/lib/settings.js';
import { buildCaseView } from '../src/lib/caseview.js';
import { createTranslateHandler } from '../src/actions/translate.js';
import { createDraftReplyHandler } from '../src/actions/draft-reply.js';
import { createCaseSummaryHandler } from '../src/actions/case-summary.js';
import { SEED_CASES, seedCaseByKey } from '../src/seed/cases.js';

const lines = [];
const failures = [];
function out(s = '') {
  lines.push(s);
  console.log(s);
}
function check(name, cond) {
  out(`  [${cond ? 'PASS' : 'FAIL'}] ${name}`);
  if (!cond) failures.push(name);
}
function header(title) {
  out('');
  out('='.repeat(72));
  out(title);
  out('='.repeat(72));
}

/* In-memory stand-in for Forge KVS (same async get/set contract). */
function memoryStore() {
  const map = new Map();
  return {
    get: async (k) => map.get(k),
    set: async (k, v) => map.set(k, v),
    delete: async (k) => map.delete(k),
  };
}

const store = memoryStore();
const translator = new Engine();
const deps = { translator, store };

const translate = createTranslateHandler(deps);
const draftReply = createDraftReplyHandler(deps);
const summarize = createCaseSummaryHandler(deps);

header('PuenteDesk — local demo run');
out(`Seed cases loaded: ${SEED_CASES.map((c) => c.key).join(', ')}`);
out(`Translation engine: ${translator.engineName} (no keys, no network)`);

/* ------------------------------------------------------------------ */
header('0. Settings in KVS: agency custom glossary pair');
await saveSettings(store, {
  customGlossary: [{ es: 'acta de defunción', en: 'death certificate' }],
});
const settings = await loadSettings(store);
out(`Saved settings: agent=${settings.agentLanguage}, customer=${settings.customerLanguage}, custom glossary pairs=${settings.customGlossary.length}`);
const custom = await translate({
  text: '¿Cuánto cuesta la traducción certificada de un acta de defunción?',
  targetLanguage: 'en',
  context: 'Translations',
});
out(`ES: ¿Cuánto cuesta la traducción certificada de un acta de defunción?`);
out(`EN: ${custom.translatedText}  (approximate=${custom.approximate}, engine=${custom.engine})`);
check('custom glossary pair is used (death certificate)', custom.translatedText.includes('death certificate'));
check('default glossary still applies (certified translation)', custom.translatedText.includes('certified translation'));

/* ------------------------------------------------------------------ */
header('1. Action translate-with-context — PD-101 customer message (ES -> EN)');
const pd101 = seedCaseByKey('PD-101');
const t1 = await translate({
  text: pd101.descriptionText,
  targetLanguage: 'en',
  sourceLanguage: 'auto',
  context: pd101.service,
});
out(`Original : ${pd101.descriptionText}`);
out(`Translated: ${t1.translatedText}`);
out(`Detected source: ${t1.detectedSourceLanguage} · approximate=${t1.approximate}`);
check('mentions the appointment', /appointment/i.test(t1.translatedText));
check('keeps Saturday morning', /Saturday morning/i.test(t1.translatedText));
check('keeps the documents question', /documents/i.test(t1.translatedText));

/* ------------------------------------------------------------------ */
header('2. Action translate-with-context — PD-103 agent message (EN -> ES)');
const pd103 = seedCaseByKey('PD-103');
const agentMsg = pd103.comments[0].body;
const t2 = await translate({ text: agentMsg, targetLanguage: 'es', context: pd103.service });
out(`Original : ${agentMsg}`);
out(`Translated: ${t2.translatedText}`);
check('opens with office hours in Spanish', /abrimos/i.test(t2.translatedText));
check('keeps Monday', /lunes/i.test(t2.translatedText));
check('keeps the quick-question fork', /pregunta rápida/i.test(t2.translatedText));

/* ------------------------------------------------------------------ */
header('3. Action draft-customer-reply — PD-101, agent instruction in English');
const d1 = await draftReply({
  customerMessage: pd101.descriptionText,
  instruction: 'Confirm Saturday at 10 AM',
  customerLanguage: 'es',
});
out(`Customer: ${pd101.descriptionText}`);
out(`Instruction: "Confirm Saturday at 10 AM"`);
out(`Draft (ES): ${d1.draft}`);
out(`Intent=${d1.intent} · basedOnKb=${d1.basedOnKb} · requiresHumanApproval=${d1.requiresHumanApproval}`);
check('draft is in Spanish', /gracias por escribirnos/i.test(d1.draft));
check('draft confirms Saturday', /sábado/i.test(d1.draft));
check('draft confirms 10 AM', /10 AM/i.test(d1.draft));
check('draft is never auto-sent', d1.requiresHumanApproval === true);

/* ------------------------------------------------------------------ */
header('4. Action bilingual-case-summary — PD-103 full thread');
const conversation = [
  `Customer: ${pd103.descriptionText}`,
  ...pd103.comments.map((c) => `${c.role === 'customer' ? 'Customer' : 'Agent'}: ${c.body}`),
].join('\n');
const s1 = await summarize({ conversation });
out('--- Summary (EN) ---');
out(s1.summaryEn);
out('--- Resumen (ES) ---');
out(s1.summaryEs);
out(`Intent=${s1.intent} · customerLanguage=${s1.customerLanguage} · keyFacts=${JSON.stringify(s1.keyFacts)}`);
check('EN summary present', s1.summaryEn.includes('Topic:'));
check('ES summary present', s1.summaryEs.includes('Tema:'));
check('key facts capture the 9 AM opening', s1.keyFacts.some((f) => /9\s?AM/i.test(f)));
check('status says waiting for the team', /support team/i.test(s1.status));

/* ------------------------------------------------------------------ */
header('5. Panel view model (buildCaseView) — PD-102 end to end');
const pd102 = seedCaseByKey('PD-102');
const view = await buildCaseView({ issue: pd102, settings, translator });
for (const m of view.messages) {
  out(`[${m.role} · ${m.languageName}] ${m.body}`);
  if (m.translation) out(`  -> (${view.agentLanguage}) ${m.translation.text}`);
}
out(`Glossary hits: ${view.glossaryHits.map((g) => `${g.es} = ${g.en}`).join(' · ')}`);
out(`Suggested reply draft: ${view.suggestedReply?.draft}`);
out('Case summary (EN):');
out(view.caseSummary.summaryEn);
check('panel translation mentions certified translation', /certified translation/i.test(view.messages[0].translation.text));
check('panel translation mentions birth certificate', /birth certificate/i.test(view.messages[0].translation.text));
check('panel produced a reply draft', Boolean(view.suggestedReply?.draft));
check('panel detected customer language = es', view.customerLanguage === 'es');

/* ------------------------------------------------------------------ */
header('Result');
if (failures.length) {
  out(`FAILED checks: ${failures.join(' | ')}`);
} else {
  out('All checks passed.');
}

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, 'output'), { recursive: true });
writeFileSync(join(here, 'output', 'demo-output.txt'), `${lines.join('\n')}\n`);
out('Transcript written to test/output/demo-output.txt');

process.exit(failures.length ? 1 : 0);
