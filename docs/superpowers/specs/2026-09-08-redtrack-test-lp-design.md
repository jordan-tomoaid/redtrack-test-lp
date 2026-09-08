# RedTrack Test Landing Page — Design

**Date:** 2026-09-08
**Status:** Approved
**Deliverable:** Public GitHub repo `jordan-tomoaid/redtrack-test-lp` served over GitHub Pages.

## Purpose

A static test harness for verifying that a RedTrack account is tracking correctly:
click IDs are captured and persisted, campaign/sub parameters arrive intact, and
conversions and postbacks reach the RedTrack dashboard.

It is a diagnostic tool, not a marketing page. Everything it does must be
visible on screen so a failure is never silent.

## Verified RedTrack facts this design depends on

| Fact | Consequence for the design |
| --- | --- |
| The universal tracking script is generated per account in Tools → Scripts → New and is not published in the docs | The site cannot ship a script. Settings accepts a pasted snippet and injects it at runtime. |
| The click ID cookie must be named `rtkclickid-store` | The name is a frozen constant, never derived or renamed. |
| Inbound click params are `rtkcid`, `clickid`, `cmpid` | Click ID resolution checks `rtkcid`, `clickid`, `rtkclickid` in that order. |
| CTA links go to `<tracking-domain>/click` and `/preclick` | Two CTA builders, one per flow. |
| Conversions arrive at `<tracking-domain>/postback?clickid=…&sum=…&type=…` | One postback URL builder shared by the conversion buttons and the raw postback tool. |

Sources: RedTrack Help — Universal tracking script; Conversion tracking (S2S, script, API);
Dynamic Parameters/Tokens/UTMs.

## Pages

| Page | Responsibility |
| --- | --- |
| `index.html` | Landing page. Injects the pasted universal script, resolves and persists the click ID, offers `/click` and `/preclick` CTAs. |
| `preclick.html` | Second-step pre-lander. Verifies the click ID survives a hop and forwards it to the offer. |
| `thankyou.html` | Fires conversions by preset type with an editable `sum`, plus a raw postback URL builder with copy-to-clipboard. |
| `settings.html` | Tracking domain, campaign ID, offer URL, default sum, and the pasted universal script. Persists to `localStorage`. |

Every page carries the same two panels: a **parameter inspector** (all inbound
query params bucketed into tracking / sub / utm / other, plus referrer, the
`rtkclickid-store` cookie, and the resolved click ID with its source) and an
**event log** (script load, click ID resolution, conversion sends — successes
and failures both).

## Modules

Pure logic is separated from DOM and network effects so it can be unit tested
under Node with no browser and no build step.

| Module | Kind | Responsibility |
| --- | --- | --- |
| `constants.js` | data | Frozen names, paths, defaults. No behavior. |
| `params.js` | pure | Parse a query string, bucket params, find the click ID, pick pass-through params. |
| `urls.js` | pure | Normalize a tracking domain; build `/click`, `/preclick`, `/postback` and offer URLs. |
| `config.js` | pure + injected storage | Defaults, immutable updates, JSON parse recovery, `?rt_domain=` overrides, validation. |
| `clickid.js` | pure + injected document | Cookie parse/serialize, click ID resolution precedence, persistence. |
| `log.js` | pure | Append-only log state; each append returns a new state. |
| `dom.js` | effect | Small `el()` builder used instead of `innerHTML`. |
| `redtrack.js` | effect | Parse and inject the pasted script snippet; report load success or failure. |
| `postback.js` | effect | Send a postback by `fetch` (`no-cors`) or by image pixel. |
| `inspector.js`, `banner.js` | effect | Render the two shared panels and the configuration warning. |
| `pages/*.js` | effect | Wire the above together per page. |

## Data flow

Inbound URL → `params.parseQuery` → `clickid.resolveClickId` (URL, then cookie,
then `localStorage`) → `clickid.persistClickId` → inspector renders → CTA built
by `urls.buildClickUrl` with the click ID and pass-through subs → offer or
pre-lander → `thankyou.html` → `urls.buildPostbackUrl` → `postback.send*`.

## Error handling

- Missing tracking domain, campaign ID or offer URL renders a warning banner
  linking to settings, and disables the affected CTAs with the reason shown.
- Corrupt stored config falls back to defaults and reports the parse error in
  the log rather than throwing or silently resetting.
- `localStorage` access is wrapped; a private-mode failure is reported, not swallowed.
- Script injection attaches `onerror`; a failed load appears in the log.
- URL builders throw on an unconfigured domain or a missing click ID; callers
  catch and surface the message.

## Security

All inbound parameter values are rendered with `textContent` via `dom.el`, never
`innerHTML`, so a crafted query string cannot inject markup. The pasted
universal script is the one exception — it is executed by design, and settings
states that plainly.

## Known limitations, stated on the page

- Browser-sent postbacks are opaque under CORS. The response cannot be read, so
  the tool sends with `no-cors` and reports "sent, response unreadable — confirm
  in the RedTrack dashboard", and always offers the URL for copying.
- On `*.github.io` the click ID cookie is host-only. `github.io` is a public
  suffix, so no `Domain` attribute can be set. Cross-subdomain cookie behavior
  must be tested on a custom domain.

## Testing

`node --test test/` covers the pure modules: query parsing and bucketing, click
ID precedence, domain normalization, URL construction, config defaults, JSON
recovery, URL overrides, and validation. No test framework, no build step. DOM
and network paths are verified manually through the on-page event log.

## Deployment

No build. GitHub Pages serves `main` at the repository root; `.nojekyll` keeps
Jekyll out of the way.
