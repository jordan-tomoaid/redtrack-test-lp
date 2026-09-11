/**
 * The two panels every page carries: the inbound parameter inspector and the
 * event log.
 */
import { el, mount } from './dom.js';
import { classifyParams } from './params.js';

const BUCKET_LABELS = Object.freeze({
  tracking: 'RedTrack parameters',
  sub: 'Sub parameters',
  utm: 'UTM parameters',
  other: 'Other parameters',
});

function row(name, value) {
  return el('tr', {}, [
    el('td', { class: 'k', text: name }),
    el('td', { class: 'v', text: value === '' ? '(empty)' : value }),
  ]);
}

function bucketTable(label, entries) {
  return el('div', { class: 'bucket' }, [
    el('h4', { text: `${label} (${entries.length})` }),
    entries.length === 0
      ? el('p', { class: 'muted', text: 'None present.' })
      : el('table', {}, [el('tbody', {}, entries.map(({ name, value }) => row(name, value)))]),
  ]);
}

function summary({ clickid, source, cookieName, cookieValue, referrer, href, trackerLabel }) {
  const state = clickid === '' ? 'bad' : 'good';
  return el('div', { class: 'summary' }, [
    el('div', { class: `pill ${state}` }, [
      el('span', { class: 'pill-label', text: 'Click ID' }),
      el('span', { class: 'pill-value', text: clickid === '' ? 'not captured' : clickid }),
    ]),
    el('table', {}, [
      el('tbody', {}, [
        row('tracker', trackerLabel),
        row('resolved from', source),
        row(`${cookieName} cookie`, cookieValue === '' ? '(not set)' : cookieValue),
        row('referrer', referrer === '' ? '(none)' : referrer),
        row('current URL', href),
      ]),
    ]),
  ]);
}

export function renderInspector(node, state) {
  if (!node) return;
  const buckets = classifyParams(state.params);
  mount(node, [
    summary(state),
    el('div', { class: 'buckets' },
      Object.keys(BUCKET_LABELS).map((key) => bucketTable(BUCKET_LABELS[key], buckets[key]))),
  ]);
}

export function renderLog(node, logState) {
  if (!node) return;
  if (logState.entries.length === 0) {
    mount(node, el('p', { class: 'muted', text: 'No events yet.' }));
    return;
  }
  mount(node, el('ul', { class: 'log' },
    [...logState.entries].reverse().map((entry) => el('li', { class: `log-${entry.level}` }, [
      el('time', { text: entry.at.slice(11, 19) }),
      el('span', { class: 'log-msg', text: entry.message }),
      entry.detail ? el('span', { class: 'log-detail', text: entry.detail }) : null,
    ]))));
}
