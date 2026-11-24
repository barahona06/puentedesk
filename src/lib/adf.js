/**
 * Tiny Atlassian Document Format (ADF) helpers.
 *
 * Jira Cloud returns issue descriptions and comment bodies as ADF JSON.
 * PuenteDesk only needs plain text out (for translation) and plain text in
 * (for posting a reply), so these two converters cover the common node
 * types and degrade gracefully on anything fancier.
 */

export function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(adfToText).join('');
  switch (node.type) {
    case 'doc':
      return adfToText(node.content).trim();
    case 'text':
      return node.text || '';
    case 'paragraph':
      return `${adfToText(node.content)}\n\n`;
    case 'heading':
      return `${adfToText(node.content)}\n\n`;
    case 'hardBreak':
      return '\n';
    case 'mention':
      return node.attrs?.text || '@user';
    case 'emoji':
      return node.attrs?.shortName || '';
    case 'bulletList':
    case 'orderedList':
      return `${adfToText(node.content)}\n`;
    case 'listItem':
      return `- ${adfToText(node.content).trim()}\n`;
    case 'codeBlock':
      return `${adfToText(node.content)}\n\n`;
    case 'blockquote':
      return `${adfToText(node.content)}\n\n`;
    default:
      return adfToText(node.content);
  }
}

/** Build a minimal ADF doc from plain text (blank line = new paragraph). */
export function textToAdf(text) {
  const paragraphs = String(text || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({
      type: 'paragraph',
      content: p
        .split('\n')
        .flatMap((line, i, arr) => {
          const nodes = [{ type: 'text', text: line }];
          if (i < arr.length - 1) nodes.push({ type: 'hardBreak' });
          return nodes;
        }),
    }));
  return {
    type: 'doc',
    version: 1,
    content: paragraphs.length ? paragraphs : [{ type: 'paragraph', content: [] }],
  };
}
