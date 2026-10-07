import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRACKERS } from '../assets/js/trackers.js';

// The activator refuses to run when the HTML tag and the profile disagree, so a drift here
// would silently disable script-mode tracking. Pin them together.
test('every page that ships the inert RedTrack tag uses exactly the profile src', () => {
  const expected = TRACKERS.redtrack.builtInScript.replace(/&/g, '&amp;');
  for (const page of ['index.html', 'preclick.html', 'lp.html']) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
    const m = html.match(/<script type="text\/plain" data-tracker-script="redtrack" src="([^"]+)"/);
    assert.ok(m, `${page}: inert tag missing`);
    assert.equal(m[1], expected, `${page}: tag src differs from TRACKERS.redtrack.builtInScript`);
  }
});

test('visitor-only pages ship no tracker script tag at all', () => {
  for (const page of ['signup.html', 'thankyou.html']) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
    assert.doesNotMatch(html, /data-tracker-script/, page);
  }
});

test('the built-in script is the /click-support variant on the account domain', () => {
  const src = TRACKERS.redtrack.builtInScript;
  assert.match(src, /^https:\/\/trk\.fourleafgo\.com\/unilpclick\.js\?/);
  assert.match(src, /defaultcampaignid=6ac5be3e7d94834b760cfed1/);
  assert.doesNotMatch(src, /wmipr|6aa0cde2/, 'old account values must be gone');
});
