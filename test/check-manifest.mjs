/**
 * Offline manifest cross-reference check.
 *
 * `forge lint` requires an Atlassian login, so this script validates what
 * can be validated without one: the YAML parses, the runtime is declared,
 * every function handler resolves to a real file + named export, every
 * resource path exists, the Rovo agent's actions exist, every action has
 * its mandatory fields and typed inputs, and the issue panel is wired to
 * its resolver and resource.
 *
 * Usage: node test/check-manifest.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = parse(readFileSync(join(root, 'manifest.yml'), 'utf8'));
const problems = [];
const ok = [];

if (manifest.app?.runtime?.name !== 'nodejs24.x') problems.push('runtime is not nodejs24.x');
else ok.push('runtime nodejs24.x');
if (!manifest.app?.id) problems.push('app.id missing');

const functions = new Map();
for (const fn of manifest.modules?.function || []) {
  functions.set(fn.key, fn.handler);
  const [file, exp] = fn.handler.split('.');
  const path = join(root, 'src', `${file}.js`);
  if (!existsSync(path)) {
    problems.push(`handler file missing: src/${file}.js`);
    continue;
  }
  const src = readFileSync(path, 'utf8');
  if (!new RegExp(`export\\s+(const|async\\s+function|function)\\s+${exp}\\b`).test(src)) {
    problems.push(`export "${exp}" not found in src/${file}.js`);
  } else ok.push(`function ${fn.key} -> ${fn.handler} resolves`);
}

for (const r of manifest.resources || []) {
  if (!existsSync(join(root, r.path))) problems.push(`resource missing: ${r.path}`);
  else ok.push(`resource ${r.key} -> ${r.path} exists`);
}

const actionKeys = new Set();
for (const a of manifest.modules?.action || []) {
  actionKeys.add(a.key);
  if (!functions.has(a.function)) problems.push(`action ${a.key} references unknown function ${a.function}`);
  for (const field of ['name', 'actionVerb', 'description', 'inputs']) {
    if (!a[field]) problems.push(`action ${a.key} missing ${field}`);
  }
  for (const [name, input] of Object.entries(a.inputs || {})) {
    for (const f of ['title', 'type', 'required']) {
      if (input[f] === undefined) problems.push(`action ${a.key} input ${name} missing ${f}`);
    }
  }
}
ok.push(`${actionKeys.size} actions structurally complete`);

for (const agent of manifest.modules?.['rovo:agent'] || []) {
  if (agent.name.length > 30) problems.push(`agent name too long: ${agent.name.length}`);
  for (const k of agent.actions || []) {
    if (!actionKeys.has(k)) problems.push(`agent references unknown action ${k}`);
  }
  if (!agent.prompt || agent.prompt.length < 100) problems.push('agent prompt missing/too short');
  ok.push(`rovo:agent "${agent.name}" (${agent.name.length} chars) with ${agent.actions?.length || 0} actions, prompt ${agent.prompt?.length || 0} chars`);
}

for (const p of manifest.modules?.['jira:issuePanel'] || []) {
  if (!functions.has(p.resolver?.function)) problems.push(`panel resolver references unknown function ${p.resolver?.function}`);
  const resKeys = (manifest.resources || []).map((r) => r.key);
  if (!resKeys.includes(p.resource)) problems.push(`panel resource ${p.resource} not declared`);
  ok.push('jira:issuePanel wired to resolver + resource');
}

console.log('SCOPES:', (manifest.permissions?.scopes || []).join(', '));
for (const line of ok) console.log('OK  ', line);
for (const line of problems) console.log('BAD ', line);
console.log(problems.length ? `\n${problems.length} problem(s)` : '\nManifest structure: all cross-references resolve.');
process.exit(problems.length ? 1 : 0);
