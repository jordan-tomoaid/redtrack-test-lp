# redtrack-test-lp

A static test harness for checking that an ad tracker is tracking correctly.
It captures click IDs, shows every inbound parameter, and fires conversions and
postbacks against your own tracking domain. Supports **RedTrack** and **Voluum**
through a tracker profile chosen in settings.

It is a diagnostic tool, not a marketing page. Everything it does is printed on
screen, so a failure is never silent.

**Live:** https://jordan-tomoaid.github.io/redtrack-test-lp/

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Landing page. Injects your universal script, resolves and persists the click ID, and builds `/click`, `/preclick` and direct-to-offer CTAs. |
| `preclick.html` | Pre-lander for the two-step flow. Confirms the click ID survived the hop. |
| `thankyou.html` | Fires conversions by type with an editable `sum`, and builds raw postback URLs you can copy. |
| `settings.html` | Tracking domain, campaign ID, offer URL, default sum, and your pasted universal script. |

Every page shows an **inbound parameter inspector** (tracking / sub / utm / other
params, referrer, the `rtkclickid-store` cookie, and the resolved click ID with
its source) and an **event log** recording successes and failures alike.

## Trackers

Everything tracker-specific lives in `assets/js/trackers.js`. Pick the profile
in **Settings → Tracker** (or override for one visit with `?rt_tracker=voluum`).

| | RedTrack | Voluum |
| --- | --- | --- |
| Inbound click ID | `rtkcid` → `clickid` → `rtkclickid` | `cid` → `clickid` — set the lander URL to `?cid={clickid}` in Voluum |
| Click ID cookie | `rtkclickid-store` (name mandated by RedTrack) | `voluum-clickid-store` (ours; Voluum prescribes none) |
| CTA paths | `/click`, `/preclick` | `/click` only (multi-offer `/click/N` not modelled yet) |
| Campaign param on CTAs | `cmpid` | none — the campaign is identified by the visit |
| Postback params | `clickid`, `sum`, `type` | `cid`, `payout`, `et`, `txid` |
| Lander script | Required — generated per account in Tools → Scripts | Optional for redirect tracking |

**Voluum gotcha:** `/click` only works when the visit started from the Voluum
campaign URL. Opening this page directly and clicking a CTA leaves the `cep`
parameter empty and Voluum ignores the click. Always begin a test from the
campaign URL.

Adding a tracker means adding one frozen object to `trackers.js`; the settings
select, validation, URL builders and the conversion page read from it.

## Setup

1. Open **Settings** and choose the **tracker**.
2. Fill in your **tracking domain** (host only, e.g. `track.example.com`) and
   **offer URL**. RedTrack also needs the **campaign ID** (`cmpid`); Voluum does not.
3. RedTrack: in **Tools → Scripts → New**, generate a universal tracking script
   and paste the whole snippet into the **Tracker script** box (`/click` variant
   for a single landing page, `/pre-click` for a pre-lander). Voluum: leave it
   empty for redirect tracking, or paste your lander script if you use one.
4. Save. Settings live in this browser's `localStorage` and are never sent anywhere.

RedTrack generates its script per account and does not publish the code, which
is why it has to be pasted rather than shipped with this repo.

### Overriding settings for one visit

Any page accepts `?rt_tracker=`, `?rt_domain=`, `?rt_cmpid=` and `?rt_offer=`, which is handy for
testing a second account without overwriting what you saved.

## Running a test

1. Open your campaign link so the click is recorded and you land on
   `index.html` with a click ID.
   To exercise the flow without a real campaign, append `?clickid=test123`
   (RedTrack) or `?cid=test123` (Voluum).
2. Check the inspector: the **Click ID** pill should be green and the
   `rtkclickid-store` cookie should be set.
3. Click a CTA and confirm the click ID reaches the next page.
4. On the conversion page, pick a type, set a sum, and send. Then confirm the
   conversion appears in the RedTrack dashboard.

## Two limitations, stated plainly

**Postbacks sent from a browser are opaque.** CORS prevents reading the
response, so neither the `fetch` nor the pixel transport can confirm RedTrack
accepted the hit — only that the request left the browser. Always verify in the
dashboard. For a real server-to-server test, copy the URL and run it through
`curl`.

**The click ID cookie is host-only on `*.github.io`.** `github.io` is on the
public suffix list, so no `Domain` attribute can be set. Cross-subdomain cookie
behavior has to be tested on a custom domain.

## Development

No build step and no dependencies. Open the files directly, or serve them:

```sh
python3 -m http.server 8080
```

Tests cover the pure modules — tracker profiles, query parsing, click ID
precedence, URL construction, and config handling:

```sh
npm test
```

Pure logic lives in `assets/js/*.js` with DOM and network effects kept separate,
which is what lets the suite run under Node with no browser.

## Security note

Inbound parameter values are always rendered with `textContent`, so a crafted
query string cannot inject markup. The pasted universal script is the one
deliberate exception — it is executed on the landing and pre-lander pages, so
paste only the script RedTrack generated for you.

## License

MIT — see [LICENSE](LICENSE).
