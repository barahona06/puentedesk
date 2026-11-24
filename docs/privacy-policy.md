# PuenteDesk — Privacy Policy

*Draft prepared for the Atlassian Marketplace listing. To be hosted at a
public URL and linked from the listing (see LISTADO.md, decision D3).
Bracketed items need the owner's confirmation before publication.*

**Effective date:** [date of publication]
**Vendor:** Tecnologia Geek LLC ("Tecnologia Geek", "we")
**App:** PuenteDesk for Jira Service Management ("PuenteDesk", the "App")
**Contact:** [support email — owner to confirm]

## 1. What PuenteDesk is

PuenteDesk is an Atlassian Forge app for Jira Service Management. It helps
support teams work across Spanish and English: it translates request threads
with the context of the case, drafts replies in the customer's language for
human approval, and provides a Rovo agent (PuenteDesk Assistant) and reusable
actions for translation, reply drafting and bilingual case summaries.

## 2. The short version

PuenteDesk runs entirely on Atlassian's Forge platform, inside your
Atlassian site. It declares **no external network access** and sends **no
data to us or to any third party**. The only data the App itself stores is
its own configuration: your team/customer language settings and the custom
glossary your team creates. Customer messages are read and processed at
runtime to produce translations, drafts and summaries — the App does **not**
persist them.

## 3. Data the App accesses

To do its job, and only when an agent uses it, the App accesses:

- **Jira work items** (scope `read:jira-work`): the summary, description and
  comments of the request being viewed, so they can be translated,
  summarized and shown in the PuenteDesk panel.
- **Confluence pages** (scopes `search:confluence`, `read:page:confluence`):
  knowledge-base articles relevant to a customer's question, so answers and
  reply drafts are grounded in your own documentation.
- **Replies an agent approves** (scope `write:jira-work`): when an agent
  clicks "Post reply", the App posts that approved text as a comment on the
  request. The App never posts anything without that explicit action.

Issue and page content may contain personal data that your users put there.
That content is processed transiently, in memory, on Atlassian's
infrastructure, and is not stored by the App, not copied to any
vendor-controlled system (we operate no servers for this App), and not used
for any purpose other than the feature the agent invoked.

## 4. Data the App stores

In Atlassian Forge Key-Value Storage, per installation (scope
`storage:app`):

- Team language, default customer language and language auto-detection
  settings.
- Your custom glossary (term pairs your team adds, e.g.
  `acta de defunción = death certificate`).

That is all. No customer message content, no translations, no summaries and
no end-user profiles are stored by the App.

## 5. Data residency and hosting

All App data is stored in Atlassian Forge hosted storage. Forge hosted
storage is data-residency enabled: if your Atlassian site is pinned to a
supported region, the App's stored settings and glossary are pinned to, and
migrated with, that region, under Atlassian's data residency program.
Atlassian's handling of data on its platform is governed by Atlassian's own
privacy and security documentation.

## 6. Sub-processors and third parties

None. The App declares no egress permissions, makes no network calls
outside the Atlassian platform, and shares no data with any third party.
The only platform involved is Atlassian (Forge hosting, Jira and
Confluence), which already hosts your site.

*Note on optional configurations:* PuenteDesk's translation layer supports
an alternative provider interface in its source code. In the Marketplace
build, that interface is inactive — the built-in engine performs all
translation inside Forge. Enabling any external provider would require a
differently configured deployment with declared egress permissions, which
would be disclosed in an updated version of this policy before use.

## 7. Retention and deletion

- Settings and glossary are kept while the App is installed, so your team
  does not lose its configuration between sessions.
- Uninstalling the App removes its access; the stored settings and glossary
  in Forge storage are deleted in accordance with Atlassian's Forge storage
  lifecycle for uninstalled apps.
- Because the App does not persist end-user content, there is no App-side
  copy of your customers' messages to delete.

## 8. Your rights and personal-data requests

If you are an end user whose personal data appears in a Jira request handled
with PuenteDesk, your data controller is the organization that operates
that Jira site; please contact them first — they control the content. For
requests about the limited configuration data the App stores (settings and
glossary), or any privacy question about the App itself, contact us at
[support email — owner to confirm]. We respond to privacy requests within
30 days.

## 9. Security

The App runs under Atlassian Forge's security model: permissions are
limited to the five scopes listed in §3, enforced by the platform, and all
computation happens on Atlassian-managed infrastructure. To report a
security vulnerability in the App, contact [support email — owner to
confirm] with the subject "PuenteDesk security".

## 10. Changes to this policy

We may update this policy when the App's behavior changes. Material changes
— in particular, any future version that declares external network access —
will be reflected here and in the App's Marketplace Privacy and Security
tab before or at the release of that version.

## 11. Children

PuenteDesk is a business tool for support teams and is not directed at
children.
