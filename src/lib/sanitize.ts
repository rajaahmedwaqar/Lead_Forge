const ALLOWED = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'A', 'DIV', 'SPAN', 'H3', 'H4']);

/** Minimal allow-list sanitizer for email previews (AI output and templates can contain markup). */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (!ALLOWED.has(child.tagName)) { child.replaceWith(document.createTextNode(child.textContent ?? '')); continue; }
      for (const attr of Array.from(child.attributes)) {
        const keep = child.tagName === 'A' && attr.name === 'href' && /^(https?:|mailto:)/i.test(attr.value.trim());
        if (!keep) child.removeAttribute(attr.name);
      }
      if (child.tagName === 'A') { child.setAttribute('target', '_blank'); child.setAttribute('rel', 'noreferrer noopener'); }
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
