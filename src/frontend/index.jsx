import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  Heading,
  Inline,
  Label,
  Lozenge,
  SectionMessage,
  Select,
  Stack,
  Strong,
  Tag,
  Text,
  TextArea,
  Toggle,
  useProductContext,
  xcss,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const columnStyle = xcss({
  backgroundColor: 'color.background.neutral.subtle',
  padding: 'space.150',
  borderRadius: 'radius.large',
  flexGrow: 1,
  flexBasis: '0',
});

const summaryStyle = xcss({
  backgroundColor: 'color.background.accent.blue.subtlest',
  padding: 'space.150',
  borderRadius: 'radius.large',
});

const LANGUAGE_OPTIONS = [
  { label: 'Spanish', value: 'es' },
  { label: 'English', value: 'en' },
];

const optionFor = (value) => LANGUAGE_OPTIONS.find((o) => o.value === value) || LANGUAGE_OPTIONS[0];

function MessageCard({ message, agentLanguageName }) {
  return (
    <Stack space="space.100">
      <Inline space="space.100" alignInline="start">
        <Text>
          <Strong>{message.authorName}</Strong>
        </Text>
        <Lozenge appearance={message.role === 'customer' ? 'new' : 'default'}>
          {message.languageName}
        </Lozenge>
        {message.translation && message.translation.approximate ? (
          <Lozenge appearance="moved">Approximate translation</Lozenge>
        ) : null}
      </Inline>
      {message.translation ? (
        <Inline space="space.150" alignBlock="start">
          <Box xcss={columnStyle}>
            <Stack space="space.050">
              <Text>
                <Strong>Original</Strong>
              </Text>
              <Text>{message.body}</Text>
            </Stack>
          </Box>
          <Box xcss={columnStyle}>
            <Stack space="space.050">
              <Text>
                <Strong>Translation ({agentLanguageName})</Strong>
              </Text>
              <Text>{message.translation.text}</Text>
            </Stack>
          </Box>
        </Inline>
      ) : (
        <Box xcss={columnStyle}>
          <Text>{message.body}</Text>
        </Box>
      )}
    </Stack>
  );
}

function App() {
  const context = useProductContext();
  const issueKey = context?.extension?.issue?.key || null;

  const [caseView, setCaseView] = useState(null);
  const [error, setError] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [postState, setPostState] = useState(null);

  const [settings, setSettings] = useState(null);
  const [settingsMsg, setSettingsMsg] = useState(null);

  useEffect(() => {
    if (!issueKey) return;
    invoke('getCaseView', { issueKey })
      .then((view) => {
        if (view.error) {
          setError(view.error);
          return;
        }
        setCaseView(view);
        if (view.suggestedReply) setReplyText(view.suggestedReply.draft);
      })
      .catch((e) => setError(String(e)));
    invoke('getSettings').then(setSettings).catch(() => {});
  }, [issueKey]);

  const postReply = async () => {
    setPostState('posting');
    const res = await invoke('postReply', { issueKey, text: replyText });
    setPostState(res && res.posted ? 'posted' : `error: ${res?.error || 'unknown'}`);
  };

  const saveSettings = async () => {
    const res = await invoke('saveSettings', {
      agentLanguage: settings.agentLanguage,
      customerLanguage: settings.customerLanguage,
      autoDetectLanguage: settings.autoDetectLanguage,
      customGlossaryText: settings.customGlossaryText,
    });
    if (res.error) {
      setSettingsMsg(`Could not save: ${res.error}`);
    } else {
      setSettings(res);
      setSettingsMsg('Settings saved. Reload the panel to apply new defaults.');
    }
  };

  if (!issueKey) {
    return (
      <SectionMessage appearance="warning" title="PuenteDesk">
        <Text>Open a Jira Service Management request to use the PuenteDesk panel.</Text>
      </SectionMessage>
    );
  }
  if (error) {
    return (
      <SectionMessage appearance="error" title="PuenteDesk could not load this request">
        <Text>{error}</Text>
      </SectionMessage>
    );
  }
  if (!caseView) {
    return <Text>Loading PuenteDesk for {issueKey}…</Text>;
  }

  const agentLanguageName = caseView.agentLanguage === 'es' ? 'Spanish' : 'English';

  return (
    <Stack space="space.250">
      <Stack space="space.050">
        <Heading size="medium">PuenteDesk — {caseView.issueKey}</Heading>
        <Inline space="space.100">
          <Lozenge appearance="inprogress">Customer language: {caseView.customerLanguageName}</Lozenge>
          {caseView.service ? <Lozenge>{caseView.service}</Lozenge> : null}
          {caseView.status ? <Lozenge>{caseView.status}</Lozenge> : null}
        </Inline>
        <Text>{caseView.summary}</Text>
      </Stack>

      {caseView.engine === 'demo' ? (
        <SectionMessage appearance="information" title="Demo translation engine">
          <Text>
            Translations are produced by PuenteDesk's built-in demo engine (agency glossary + curated
            phrasing, no external keys). Connect a translation/LLM provider with the PUENTEDESK_TRANSLATOR
            environment variables for production coverage.
          </Text>
        </SectionMessage>
      ) : null}

      <Stack space="space.100">
        <Heading size="small">Case summary</Heading>
        <Box xcss={summaryStyle}>
          <Stack space="space.025">
            {caseView.caseSummary.summaryEn.split('\n').map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
          </Stack>
        </Box>
      </Stack>

      <Stack space="space.200">
        <Heading size="small">Conversation</Heading>
        {caseView.messages.map((m, i) => (
          <MessageCard key={i} message={m} agentLanguageName={agentLanguageName} />
        ))}
      </Stack>

      {caseView.glossaryHits.length ? (
        <Stack space="space.075">
          <Heading size="small">Agency glossary in this case</Heading>
          <Inline space="space.075">
            {caseView.glossaryHits.map((g, i) => (
              <Tag key={i} text={`${g.es} = ${g.en}`} />
            ))}
          </Inline>
        </Stack>
      ) : null}

      <Stack space="space.100">
        <Heading size="small">Reply in the customer's language ({caseView.customerLanguageName})</Heading>
        <Text>
          Drafted by PuenteDesk from the knowledge base. Review and edit it — nothing is sent until you
          post it.
        </Text>
        <Label labelFor="puentedesk-reply">Reply draft</Label>
        <TextArea
          id="puentedesk-reply"
          value={replyText}
          onChange={(e) => setReplyText(e?.target?.value ?? '')}
          minimumRows={5}
        />
        <Inline space="space.100">
          <Button appearance="primary" onClick={postReply} isDisabled={postState === 'posting'}>
            Post reply to the request
          </Button>
          {postState === 'posted' ? <Lozenge appearance="success">Posted</Lozenge> : null}
          {typeof postState === 'string' && postState.startsWith('error') ? (
            <Lozenge appearance="removed">{postState}</Lozenge>
          ) : null}
        </Inline>
      </Stack>

      {settings ? (
        <Stack space="space.100">
          <Heading size="small">PuenteDesk settings</Heading>
          <Label labelFor="pd-agent-lang">Team language</Label>
          <Select
            id="pd-agent-lang"
            options={LANGUAGE_OPTIONS}
            value={optionFor(settings.agentLanguage)}
            onChange={(opt) => setSettings({ ...settings, agentLanguage: opt?.value || 'en' })}
          />
          <Label labelFor="pd-customer-lang">Default customer language</Label>
          <Select
            id="pd-customer-lang"
            options={LANGUAGE_OPTIONS}
            value={optionFor(settings.customerLanguage)}
            onChange={(opt) => setSettings({ ...settings, customerLanguage: opt?.value || 'es' })}
          />
          <Toggle
            id="pd-autodetect"
            label="Detect message language automatically"
            isChecked={!!settings.autoDetectLanguage}
            onChange={() => setSettings({ ...settings, autoDetectLanguage: !settings.autoDetectLanguage })}
          />
          <Label labelFor="pd-glossary">Custom glossary (one pair per line: spanish = english)</Label>
          <TextArea
            id="pd-glossary"
            value={settings.customGlossaryText || ''}
            onChange={(e) => setSettings({ ...settings, customGlossaryText: e?.target?.value ?? '' })}
            minimumRows={3}
            placeholder={'acta de defunción = death certificate'}
          />
          <Inline space="space.100">
            <Button onClick={saveSettings}>Save settings</Button>
            {settingsMsg ? <Text>{settingsMsg}</Text> : null}
          </Inline>
        </Stack>
      ) : null}
    </Stack>
  );
}

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
