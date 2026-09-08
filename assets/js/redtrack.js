/**
 * Injects the universal tracking script that the user generated in
 * RedTrack (Tools -> Scripts -> New) and pasted into settings.
 *
 * A snippet assigned through innerHTML never executes, so each <script> in the
 * pasted markup is re-created as a real element.
 */

function scriptsFrom(snippet) {
  const parsed = new DOMParser().parseFromString(`<body>${snippet}</body>`, 'text/html');
  return [...parsed.querySelectorAll('script')];
}

function cloneScript(doc, source) {
  const node = doc.createElement('script');
  [...source.attributes].forEach((attr) => node.setAttribute(attr.name, attr.value));
  if (source.src === '' || !source.hasAttribute('src')) node.textContent = source.textContent;
  return node;
}

/**
 * @returns {{injected: number, errors: string[]}} counts and messages; external
 * script load results arrive later through onLoad / onError.
 */
export function injectScript(doc, snippet, { onLoad = () => {}, onError = () => {} } = {}) {
  const source = String(snippet ?? '').trim();
  if (source === '') {
    return Object.freeze({
      injected: 0,
      errors: Object.freeze(['No universal script has been pasted in settings.']),
    });
  }

  let tags;
  try {
    tags = scriptsFrom(source);
  } catch (err) {
    return Object.freeze({ injected: 0, errors: Object.freeze([`Could not parse the snippet: ${err.message}`]) });
  }

  if (tags.length === 0) {
    return Object.freeze({
      injected: 0,
      errors: Object.freeze(['The pasted snippet contains no <script> tag.']),
    });
  }

  const errors = tags.reduce((acc, tag) => {
    try {
      const node = cloneScript(doc, tag);
      if (node.hasAttribute('src')) {
        node.addEventListener('load', () => onLoad(node.src));
        node.addEventListener('error', () => onError(`Script failed to load: ${node.src}`));
      }
      doc.body.appendChild(node);
      if (!node.hasAttribute('src')) onLoad('inline script');
      return acc;
    } catch (err) {
      return [...acc, `Could not inject a script tag: ${err.message}`];
    }
  }, []);

  return Object.freeze({ injected: tags.length - errors.length, errors: Object.freeze(errors) });
}
