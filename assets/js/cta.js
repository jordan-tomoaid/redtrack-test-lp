/**
 * Renders one call-to-action. A builder that throws produces a disabled
 * control showing why, so a misconfiguration is always visible.
 */
import { el } from './dom.js';

export function ctaLink({ label, hint, build, log }) {
  try {
    const href = build();
    log('info', `${label} target built.`, href);
    return el('div', { class: 'cta-item' }, [
      el('a', { class: 'btn primary', href, text: label }),
      hint ? el('p', { class: 'muted', text: hint }) : null,
      el('code', { class: 'url', text: href }),
    ]);
  } catch (err) {
    log('error', `${label} is disabled.`, err.message);
    return el('div', { class: 'cta-item' }, [
      el('button', { class: 'btn', disabled: 'disabled', text: label }),
      el('p', { class: 'error-text', text: err.message }),
    ]);
  }
}

export function navLink({ label, href, hint }) {
  return el('div', { class: 'cta-item' }, [
    el('a', { class: 'btn', href, text: label }),
    hint ? el('p', { class: 'muted', text: hint }) : null,
  ]);
}
