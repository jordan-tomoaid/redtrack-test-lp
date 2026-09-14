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
 * @returns {{injected: number, skipped: string[], errors: string[]}} — a snippet whose src is already
 * active on the page is skipped (reported via onSkip) so it cannot double-count.
 * External script load results arrive later through onLoad / onError.
 */
/**
 * Turn the inert <script type="text/plain" data-tracker-script="…"> shipped in the HTML into a live
 * script, but only for the active tracker. Returns what happened so the page can log it.
 */
export function activateBuiltInScript(doc, tracker, { onLoad = () => {}, onError = () => {} } = {}) {
  const tag = doc.querySelector(`script[data-tracker-script="${tracker.key}"]`);
  if (!tag) return Object.freeze({ activated: false, reason: 'no built-in tag on this page' });
  if (!tracker.builtInScript) return Object.freeze({ activated: false, reason: `${tracker.label} profile declares no built-in script` });
  if (tag.getAttribute('src') !== tracker.builtInScript) {
    return Object.freeze({ activated: false, reason: `built-in tag src differs from TRACKERS.${tracker.key}.builtInScript — fix one of them` });
  }
  const node = doc.createElement('script');
  node.src = tag.getAttribute('src');
  node.addEventListener('load', () => onLoad(node.src));
  node.addEventListener('error', () => onError(`Built-in script failed to load: ${node.src}`));
  tag.replaceWith(node);
  return Object.freeze({ activated: true, src: node.src });
}

const isActive = (doc, src) => doc.querySelector(`script[src="${src}"]:not([type="text/plain"])`) !== null;

export function injectScript(doc, snippet, { onLoad = () => {}, onError = () => {}, onSkip = () => {} } = {}) {
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

  const alreadyActive = (tag) => tag.hasAttribute('src') && isActive(doc, tag.getAttribute('src'));
  const skipped = tags.filter(alreadyActive).map((tag) => tag.getAttribute('src'));
  skipped.forEach((src) => onSkip(src));

  const errors = tags.filter((tag) => !alreadyActive(tag)).reduce((acc, tag) => {
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

  return Object.freeze({ injected: tags.length - skipped.length - errors.length, skipped: Object.freeze(skipped), errors: Object.freeze(errors) });
}
