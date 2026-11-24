# PuenteDesk — installation & testing instructions (for judges)

> Status (22 Nov 2026): the app is registered, deployed and installed —
> see "Verified deployment" below. The only missing piece in this file is
> the installation link itself, which is generated from the Atlassian
> Developer Console ("Start sharing your app", Distribution section)
> after a production deploy; replace the placeholder with the real link
> before submitting.

## Verified deployment (22 Nov 2026)

- **App ID:** `ari:cloud:ecosystem::app/3709c884-6d04-48cc-aff4-353059c28611`
  (Developer Space "Tecnologia Geek")
- **Developer Console:**
  https://developer.atlassian.com/console/myapps/3709c884-6d04-48cc-aff4-353059c28611
- **Demo site where PuenteDesk is already installed:**
  https://one-atlas-tsxo.atlassian.net (Forge demo site, active until
  2027-02-20; seeded with 25 projects, including 10 Jira Service
  Management service desks)
- **Installations (development environment, version 2, both
  "Up-to-date"):** Jira — `aea59efc-d025-4df6-bf89-b0ac55821e70`;
  Confluence — `746323ac-bdb4-45c1-bf9c-6e55ba6a2c60`
- `forge lint` reports no issues; the app's own demo test suite passes.

## What you are installing

PuenteDesk is a Forge app for **Jira Service Management** that adds:

1. A **PuenteDesk panel** on every service request: original message and
   translation side by side, a bilingual case summary, the agency
   glossary in play, and a reply composer that drafts in the customer's
   language.
2. **PuenteDesk Assistant**, a Rovo agent that translates with case
   context, drafts replies in the customer's language, and summarizes
   cases in English and Spanish.

No external accounts, API keys or configuration are required to evaluate
it: the app ships with a built-in demo translation engine and a bilingual
mini knowledge base.

## Install

1. Open the installation link: **<INSTALLATION LINK — to be added from
   the Developer Console: app page → Distribution → "Start sharing your
   app" (requires the production deploy first)>**
2. Choose the Atlassian Cloud site where you want to test PuenteDesk
   (any site with Jira Service Management works; a free developer/demo
   site is fine) and confirm the installation.
3. Approve the requested scopes when prompted. PuenteDesk asks only for:
   - `storage:app` — its own settings and your custom glossary,
   - `read:jira-work` / `write:jira-work` — read the request thread and
     post replies you approve,
   - `search:confluence` / `read:page:confluence` — find and read
     knowledge base articles.

## Try the demo story (5 minutes)

### A. The agent panel

1. In Jira Service Management, create a new request (any request type)
   and paste this as the description — a customer asking, in Spanish, for
   a passport renewal appointment:

   > Buenas tardes, necesito una cita para renovar mi pasaporte y quiero
   > saber qué documentos debo llevar. ¿Tienen espacio este sábado por la
   > mañana?

2. Open the request and find the **PuenteDesk** panel in the issue view.
   You will see the original message next to its English translation, a
   case summary, and a drafted reply in Spanish.
3. Edit the draft if you like, then click **Post reply to the request**.
   The reply is added to the request as a comment — nothing is ever sent
   without this explicit click.
4. Add a customer comment in Spanish (for example: *"Es una pregunta
   rápida sobre el precio de la renovación del permiso de trabajo."*) and
   reload the panel: the thread now shows both directions of translation.

### B. The Rovo agent

1. Open **Rovo Chat** and start a conversation with **PuenteDesk
   Assistant**.
2. Try the conversation starters, or ask:
   - "Translate this message into English: *Hola, me piden una traducción
     certificada de mi acta de nacimiento para un trámite. ¿Cuánto cuesta
     y en cuántos días está lista?*"
   - "Draft a reply in the customer's language confirming Saturday at
     10 AM."
   - "Summarize this conversation in English and Spanish: Customer: ¿A
     qué hora abren el lunes? Necesito pasar antes de mi trabajo. Agent:
     We open at 9 AM on Monday."
3. Notice the guardrails: the agent grounds answers in the knowledge
   base, labels everything it writes as a draft, and — if you ask it
   something case-specific about taxes or immigration — it will explain
   only general information and route you to a human specialist.

### C. Make it yours (optional)

In the panel's **PuenteDesk settings**, change the team/customer
languages or add a custom glossary pair (one per line, e.g.
`acta de defunción = death certificate`), save, and reload the panel:
your pair is now used by translations and shown in the glossary hits.

## Notes for reviewers

- **Demo engine.** Translations out of the box come from PuenteDesk's
  built-in demo engine (agency glossary + curated front-desk phrasing,
  running entirely inside Forge — no external calls). A production
  installer can plug a full LLM/translation API into the same provider
  interface via Forge environment variables; the panel tells you which
  engine is active.
- **Seed data.** Four complete sample cases (passport appointment,
  certified translation, office hours + work permit, notary with
  witnesses) ship in the source under `src/seed/cases.js`; all people in
  them are invented.
- **Privacy.** The app stores only its settings and glossary in Forge
  KVS — no customer message content is persisted by PuenteDesk.

## Installation link (for judges)

Production v2.1.0 — shared with anyone via installation link (Jira + Confluence):

https://developer.atlassian.com/console/install/3709c884-6d04-48cc-aff4-353059c28611?signature=AYABeL7JgxMGtcUnzrH1Y9%2BmhzIAAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucBU5vuFEtUd6VSSgae8SMB0wAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDNw2RLAVPzq8lgrSVQIBEIA7ulcPKaKeIq%2BL%2BAyETYDJlK0%2FAEd2WyE4cKzHxr6lJePKw8EunX%2FWRgw3mNHPKTZZXyw2ezYrMGPipykAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgFYqopwInE2xd8WL1KJQ5ASAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMnR2DItBAsIswoJtJAgEQgDtVBpJxFMNKEx%2F3EkAcZCYjSScXUFtEqtfThX%2FcnVYbALgvGDhOhGJNERqnxwGn18ppjc360U%2BGlHyNaAAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEAVtCoyJi6sNOMYa6eSDp6CQAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAxnBTM68uTCuoBahqQCARCAOwA84EmaS7vvf%2FgpZ2Zt3gQ88fzHM0UIFApMPHQ6wpHti3rmUKX%2BZMTrUzvNjwZXWKYp8ihpsU2feO8TAgAAAAAMAAAQAAAAAAAAAAAAAAAAAKNmKcABl4hnKj%2FDmaN%2FQL%2F%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADIgeIfZyju9Hb4%2BbKRi8fUsz66Y%2BnaASYGqzX9WWl8c4PCB0hpDHmhbWBHy4LXnd0Pv28YIi7jQDB6gZC7urNye8wM%3D&product=confluence&product=jira
