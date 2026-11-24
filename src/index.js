/**
 * PuenteDesk panel resolver (Forge function "resolver").
 *
 * Serves the UI Kit issue panel:
 *   getCaseView  — fetch the JSM request from Jira, map it to PuenteDesk's
 *                  internal shape, and return originals + translations,
 *                  glossary hits, a suggested reply draft and the bilingual
 *                  case summary (built by lib/caseview.js).
 *   getSettings  — language defaults + custom glossary (Forge KVS).
 *   saveSettings — persist settings from the panel form.
 *   postReply    — post an agent-approved reply as a comment on the issue.
 *                  Only ever called with text a human edited and confirmed
 *                  in the panel; the Rovo agent itself never posts.
 */

import { makeResolver } from '@forge/resolver';
import api, { route } from '@forge/api';
import { buildDeps } from './lib/runtime.js';
import { loadSettings, saveSettings, parseGlossaryText, glossaryToText } from './lib/settings.js';
import { buildCaseView } from './lib/caseview.js';
import { adfToText, textToAdf } from './lib/adf.js';

// NOTE: @forge/resolver v2's default-export class breaks under the Forge
// bundler's ESM/CJS interop ("out_namespaceObject is not a constructor" at
// runtime, verified in production logs on 2026-11-23). The named
// `makeResolver` export is a plain function and sidesteps the interop bug.

/** Map a Jira issue (REST API v3 shape) into PuenteDesk's internal shape. */
export function mapJiraIssue(issue) {
  const fields = issue.fields || {};
  const reporterId = fields.reporter?.accountId;
  const comments = (fields.comment?.comments || []).map((c) => ({
    // Comments by the reporter are the customer's; everything else is the team.
    role: reporterId && c.author?.accountId === reporterId ? 'customer' : 'agent',
    authorName: c.author?.displayName || 'User',
    body: adfToText(c.body),
    created: c.created || null,
  }));
  return {
    key: issue.key,
    summary: fields.summary || '',
    service: fields.requestType?.requestType?.name || fields.issuetype?.name || null,
    status: fields.status?.name || null,
    reporterName: fields.reporter?.displayName || 'Customer',
    descriptionText: adfToText(fields.description),
    comments,
  };
}

async function fetchIssue(issueKey) {
  const res = await api
    .asApp()
    .requestJira(route`/rest/api/3/issue/${issueKey}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Jira returned HTTP ${res.status} for issue ${issueKey}`);
  }
  return mapJiraIssue(await res.json());
}

async function getCaseView({ payload }) {
  const { issueKey } = payload || {};
  if (!issueKey) return { error: 'Missing issue key in the panel context.' };
  const deps = buildDeps();
  const settings = await loadSettings(deps.store);
  const issue = await fetchIssue(issueKey);
  return buildCaseView({ issue, settings, translator: deps.translator });
}

async function getSettings() {
  const deps = buildDeps();
  const settings = await loadSettings(deps.store);
  return { ...settings, customGlossaryText: glossaryToText(settings.customGlossary) };
}

async function saveSettingsFn({ payload }) {
  const deps = buildDeps();
  const { pairs, errors } = parseGlossaryText(payload.customGlossaryText || '');
  if (errors.length) return { error: errors.join('; ') };
  const saved = await saveSettings(deps.store, {
    agentLanguage: payload.agentLanguage,
    customerLanguage: payload.customerLanguage,
    autoDetectLanguage: payload.autoDetectLanguage !== false,
    customGlossary: pairs,
  });
  return { ...saved, customGlossaryText: glossaryToText(saved.customGlossary), saved: true };
}

async function postReply({ payload }) {
  const { issueKey, text } = payload || {};
  if (!issueKey || !text || !text.trim()) return { error: 'Nothing to post.' };
  const res = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ body: textToAdf(text) }),
  });
  if (!res.ok) {
    return { error: `Jira returned HTTP ${res.status} while posting the reply.` };
  }
  const comment = await res.json();
  return { posted: true, commentId: comment.id };
}

export const handler = makeResolver({
  getCaseView,
  getSettings,
  saveSettings: saveSettingsFn,
  postReply,
});
