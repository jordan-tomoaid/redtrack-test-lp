/**
 * Configuration warning banner. Nothing on a page should fail quietly because
 * settings are incomplete, so the reasons are always listed.
 */
import { el, mount } from './dom.js';
import { validateConfig } from './config.js';

export function renderBanner(node, config, { settingsHref = './settings.html' } = {}) {
  if (!node) return validateConfig(config);

  const result = validateConfig(config);
  if (result.valid) {
    mount(node, el('div', { class: 'banner ok' }, [
      el('strong', { text: 'Configured.' }),
      el('span', {
        text: config.campaignId
          ? ` Tracking domain ${config.trackingDomain}, campaign ${config.campaignId}.`
          : ` Tracking domain ${config.trackingDomain}.`,
      }),
    ]));
    return result;
  }

  mount(node, el('div', { class: 'banner warn' }, [
    el('strong', { text: 'Incomplete configuration' }),
    el('ul', {}, result.errors.map((message) => el('li', { text: message }))),
    el('a', { class: 'btn', href: settingsHref, text: 'Open settings' }),
  ]));
  return result;
}
