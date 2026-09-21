/**
 * Settings page: edit and persist the RedTrack configuration.
 */
import { readConfig, writeConfig, updateConfig, validateConfig } from '../config.js';
import { normalizeDomain } from '../urls.js';
import { createLog, appendEntry } from '../log.js';
import { renderLog } from '../inspector.js';
import { el, mount } from '../dom.js';
import { TRACKERS, TRACKER_KEYS, trackerOf, modeOf, MODE_LABELS } from '../trackers.js';

const FIELDS = Object.freeze(['tracker', 'mode', 'trackingDomain', 'campaignId', 'offerUrl', 'defaultSum', 'universalScript']);

// Fields whose relevance depends on the tracker profile.
const TRACKER_DEPENDENT = Object.freeze({
  campaignId: (t) => (t.campaignParam ? '' : `${t.label} does not use a campaign parameter — leave empty.`),
  universalScript: (t, mode) => (mode === 'script' && t.script === 'required' ? '' : `Not used in ${mode} mode — the click is recorded by the ${t.label} redirect.`),
});

const logNode = document.getElementById('event-log');
const statusNode = document.getElementById('save-status');
const form = document.getElementById('settings-form');

let logState = createLog();
const log = (level, message, detail = null) => {
  logState = appendEntry(logState, { level, message, detail });
  renderLog(logNode, logState);
};

renderLog(logNode, logState);

// Populate the tracker select from the profiles so adding a tracker needs no HTML change.
mount(form.elements.tracker, TRACKER_KEYS.map((key) => el('option', { value: key, text: TRACKERS[key].label })));

/** Dim fields the chosen tracker ignores and list its notes. */
function applyTrackerUi(config) {
  const tracker = trackerOf(config);
  const mode = modeOf(config);
  // Mode options follow the tracker; an unsupported saved mode snaps to the tracker's default.
  mount(form.elements.mode, tracker.modes.map((m) => el('option', { value: m, text: MODE_LABELS[m] })));
  form.elements.mode.value = mode;
  Object.entries(TRACKER_DEPENDENT).forEach(([field, reason]) => {
    const note = reason(tracker, mode);
    const wrapper = document.getElementById(`field-${field}`);
    const hint = document.getElementById(`unused-${field}`);
    wrapper.classList.toggle('unused', note !== '');
    hint.textContent = note;
  });
  mount(document.getElementById('tracker-notes'), [
    el('h3', { text: `${tracker.label} notes` }),
    el('ul', { class: 'notes' }, tracker.notes.map((n) => el('li', { text: n }))),
  ]);
}

const initial = readConfig(window.localStorage, window.location.search);
initial.errors.forEach((message) => log('error', message));

/** Current config as read from the form. */
function formConfig() {
  return updateConfig(
    initial.config,
    FIELDS.reduce((acc, field) => ({ ...acc, [field]: form.elements[field].value }), {}),
  );
}

function fill(config) {
  FIELDS.forEach((field) => {
    form.elements[field].value = config[field];
  });
}

function showValidation(config) {
  const result = validateConfig(config);
  mount(
    statusNode,
    result.valid
      ? el('div', { class: 'banner ok', text: 'All required settings are present.' })
      : el('div', { class: 'banner warn' }, [
          el('strong', { text: 'Still missing' }),
          el('ul', {}, result.errors.map((message) => el('li', { text: message }))),
        ]),
  );
  return result;
}

fill(initial.config);
showValidation(initial.config);
applyTrackerUi(initial.config);

form.elements.mode.addEventListener('change', () => {
  const next = formConfig();
  applyTrackerUi(next);
  showValidation(next);
  log('info', `Mode switched to ${modeOf(next)} (not saved yet).`);
});

form.elements.tracker.addEventListener('change', () => {
  const next = formConfig();
  applyTrackerUi(next);
  showValidation(next);
  log('info', `Tracker switched to ${trackerOf(next).label} (not saved yet).`);
});
if (initial.applied.length > 0) {
  log('info', `These fields came from the URL and are not saved yet: ${initial.applied.join(', ')}`);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const cleaned = updateConfig(formConfig(), {
    trackingDomain: normalizeDomain(form.elements.trackingDomain.value),
  });
  fill(cleaned);

  const result = writeConfig(window.localStorage, cleaned);
  if (result.error) log('error', result.error);
  else log('ok', 'Settings saved to this browser.');

  showValidation(result.config);
  applyTrackerUi(result.config);
});

document.getElementById('clear-settings').addEventListener('click', () => {
  const empty = updateConfig(undefined, {});
  fill(empty);
  const result = writeConfig(window.localStorage, empty);
  if (result.error) log('error', result.error);
  else log('warn', 'Settings cleared.');
  showValidation(empty);
  applyTrackerUi(empty);
});
