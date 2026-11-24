# PuenteDesk — the bilingual support desk for Jira Service Management

**Codegeist 2026 · Apps for Business Teams · Bonus targets: Best Agents (Rovo) and Best Marketplace published app**

> The customer writes in Spanish. The agent works in English. PuenteDesk is
> the bridge: it translates every message *with the context of the case*,
> drafts replies in the customer's language, and lets a Rovo agent answer
> the frequent questions from the knowledge base — while a human always
> approves what reaches the customer.

## The problem

Thousands of small agencies in the United States — tax preparers,
immigration-support offices, notaries, translators — serve
Spanish-speaking customers all day, every day. Their customers write in
Spanish; the institutions around them (and their own tooling, like Jira
Service Management) work in English. So every single request pays a
translation tax: the agent copies the message into a generic translator,
loses the context and the agency's own terminology ("acta de nacimiento"
is not just any "birth certificate" workflow), pastes back a reply they
cannot fully verify, and starts over on the next comment.

Generic translation fails this desk in three specific ways:

1. **No case context.** "¿Cuánto cuesta?" means one thing for a certified
   translation and another for a notary signing. Context-free tools can't
   tell the difference.
2. **No agency language.** Every agency has terms of art and a way of
   saying things. A glossary that the agency controls beats a generic
   dictionary.
3. **No memory of the thread.** The useful unit is not a sentence, it's
   the case: what the customer needs, which facts they already gave, and
   who is waiting on whom.

PuenteDesk fixes all three inside Jira Service Management, where the work
already happens.

## What PuenteDesk does

### 1. The agent panel (Jira issue panel, UI Kit)

On any JSM request, the agent gets a PuenteDesk panel with:

- **Original and translation side by side** for every message in the
  thread, with the detected language of each message. Approximate
  translations are honestly labeled.
- **A bilingual case summary**: topic, what the customer needs, key facts
  mentioned (days, times, amounts), who the thread is waiting on, and a
  suggested next step — in English and Spanish.
- **The agency glossary hits in this case**, so the agent sees the exact
  terms in play.
- **A reply composer**: a draft in the customer's language, grounded in
  the knowledge base, editable in place. Nothing is posted until the agent
  clicks *Post reply*.

### 2. PuenteDesk Assistant (Rovo agent)

A Rovo agent that lives where the team chats with Rovo, with conversation
starters like *"Translate the latest customer message on this request"*,
*"Draft a reply in the customer's language"*, and *"Summarize this case in
English and Spanish"*. Its prompt (in `manifest.yml`) binds it to three
rules that matter for real agencies:

- **Answer from the knowledge base**, in the customer's language; say
  plainly when the KB doesn't cover something.
- **Drafts are drafts.** It never claims anything was sent, confirmed or
  promised to a customer.
- **Regulated-topics guardrail.** It may explain general, public
  information about a service, but it never determines eligibility,
  predicts outcomes, gives filing strategy, or quotes legal deadlines for
  a specific person's case — those are routed to a human specialist.

### 3. Three reusable actions (also callable by other agents)

| Action | Verb | What it does |
|---|---|---|
| `translate-with-context` | GET | Translates one message ES↔EN using the case context and the agency glossary stored in KVS. |
| `draft-customer-reply` | CREATE | Drafts a reply in the customer's language from their message + the agent's instruction (e.g. "Confirm Saturday at 10 AM"). Never sends. |
| `bilingual-case-summary` | GET | Summarizes a full thread in both languages: need, key facts, status, next step. |

### 4. Agency settings (Forge KVS)

Team language, default customer language, auto-detection, and a **custom
glossary** the agency edits from the panel (one `spanish = english` pair
per line). Custom pairs merge over the built-in agency glossary
(certified translation, birth certificate, work permit, power of
attorney, and ~30 more front-desk terms).

## Architecture

```
manifest.yml                  Forge app definition (nodejs24.x)
src/
  frontend/index.jsx          UI Kit panel (@forge/react)
  index.js                    Panel resolver: Jira REST -> case view model
  actions/
    translate.js              Rovo action handlers (factories, testable)
    draft-reply.js
    case-summary.js
  lib/
    runtime.js                The only Forge-wired module (@forge/kvs)
    translator.js             Provider interface + factory (demo | http)
    demo-engine.js            Built-in demo translator: curated bilingual
                              patterns + slot phrases + glossary fallback
    kb.js                     Bilingual mini knowledge base (mirrors the
                              Confluence KB the app reads in production)
    glossary.js               Default agency glossary + matching helpers
    intents.js                Intent routing for drafts and summaries
    languages.js              ES/EN detection heuristic
    settings.js               KVS-backed settings + custom glossary
    caseview.js               Panel view-model builder (pure, testable)
    adf.js                    ADF <-> plain text converters
  seed/cases.js               Four invented demo requests (PD-101…PD-104)
test/
  run-demo.js                 Local end-to-end verification (no account)
  check-manifest.mjs          Offline manifest cross-reference check
```

**Design choice — a translation provider interface.** All translation goes
through one contract (`translate`, `draftReply`, `summarize`). Two
providers ship:

- **Demo engine (default).** A real, working translator for front-desk
  language with zero keys and zero network: curated bilingual sentence
  patterns with slots, a slot-phrase dictionary, and a glossary fallback
  that flags its own output as approximate when it has to guess. This is
  what runs out of the box — including for judges.
- **HTTP provider (production).** Point it at any LLM/translation API with
  Forge variables (`PUENTEDESK_TRANSLATOR=http`,
  `PUENTEDESK_TRANSLATOR_ENDPOINT`, `PUENTEDESK_TRANSLATOR_API_KEY`). It
  POSTs `{ op, ...args }` and expects the same result shape back. If the
  variables are missing, the app falls back to the demo engine instead of
  breaking.

**Scopes — only what the features use** (`storage:app` for settings,
`read:jira-work` / `write:jira-work` for the thread and the approved
reply, `search:confluence` / `read:page:confluence` for the knowledge
base). No external egress is declared: the demo engine is fully local,
and the optional HTTP provider is the one deliberate exception an
installer opts into.

## Run it locally (no Atlassian account needed)

```bash
npm install
npm run test:demo        # end-to-end demo: actions + panel view model
npm run check:manifest   # offline manifest cross-reference validation
```

`npm run test:demo` executes the real action handlers and the real panel
view-model builder against the four seed cases with the demo engine, and
asserts the outputs (ES→EN translation of a passport-appointment request,
EN→ES translation of an agent reply, a Spanish draft confirming
"Saturday at 10 AM", a bilingual summary of a mixed thread, and a custom
glossary pair stored through the settings layer). The transcript lands in
`test/output/demo-output.txt`.

## Deploy (once an Atlassian account exists)

```bash
npm install -g @forge/cli        # or use a local install
forge login                      # email + scoped API token (app: Forge)
forge register                   # replaces the placeholder app.id
forge site provision             # free 90-day demo site with JSM + Rovo
forge deploy
forge install --demo-site
```

Then open any request on the demo site: the PuenteDesk panel appears on
the issue view, and **PuenteDesk Assistant** appears in Rovo Chat. Seed a
request with one of the messages in `src/seed/cases.js` to reproduce the
demo story end to end. Full judge-facing steps live in `INSTALL.md`.

## Status and honest limits

Built and verified locally on 22 Nov 2026: the demo run passes all
checks; the manifest passes an offline cross-reference validation.
**Not yet verified** (they require the owner's Atlassian account, which is
the next step): `forge lint` against Atlassian's servers (the CLI refuses
to run it logged out), deploy/install on the demo site, `forge tunnel`,
and the live behavior of the Rovo agent and of the panel inside JSM.
Known simplifications to be aware of: language detection is a stopword
heuristic; the demo engine covers front-desk phrasing deeply rather than
all Spanish; the panel posts approved replies as standard Jira comments
(a production hardening step is to post them through the Service Desk
API's public-comment endpoint so portal visibility is explicit).

## License

Apache-2.0 — see `LICENSE`.
