/**
 * Conversion and postback delivery.
 *
 * RedTrack's /postback answers with Access-Control-Allow-Origin: * (verified with
 * curl -i), so a normal CORS fetch can read the status and body — the same
 * signal curl gives. Trackers that do not send the header make the fetch throw;
 * we then retry opaque (no-cors) so the request still leaves the browser, and
 * say plainly that the response could not be read.
 */

const READ_LIMIT = 300;

async function readBody(response) {
  try {
    return (await response.text()).slice(0, READ_LIMIT);
  } catch {
    return '';
  }
}

/** Parse the tracker's JSON reply when it is JSON; otherwise null. */
export function parseReply(body) {
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<{sent:boolean, transport:string, readable:boolean, status:number|null,
 *   ok:boolean|null, body:string, reply:object|null, error:string|null, note:string|null}>}
 */
export async function sendByFetch(url, fetchImpl = globalThis.fetch) {
  const base = { transport: 'fetch', readable: false, status: null, ok: null, body: '', reply: null, error: null, note: null };
  if (typeof fetchImpl !== 'function') {
    return Object.freeze({ ...base, sent: false, error: 'fetch is unavailable in this browser.' });
  }

  try {
    const response = await fetchImpl(url, { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store' });
    const body = await readBody(response);
    return Object.freeze({
      ...base,
      sent: true,
      readable: true,
      status: response.status,
      ok: response.ok,
      body,
      reply: parseReply(body),
      note: response.ok ? 'Tracker answered.' : 'Tracker rejected the request.',
    });
  } catch (corsErr) {
    // A CORS block surfaces as a TypeError before any response is visible. Retry opaque
    // so the hit still reaches the tracker, and be honest that we cannot see the answer.
    try {
      await fetchImpl(url, { method: 'GET', mode: 'no-cors', credentials: 'omit', cache: 'no-store' });
      return Object.freeze({
        ...base,
        sent: true,
        note: `Request sent, but the response could not be read (${corsErr.message}). This tracker does not allow cross-origin reads — confirm in its dashboard or use curl.`,
      });
    } catch (err) {
      return Object.freeze({ ...base, sent: false, error: `Request failed: ${err.message}` });
    }
  }
}

/**
 * Image pixel. Fires load or error, but /postback answers with a non-image
 * body, so error is the normal outcome even on a recorded conversion. Useful
 * only to prove the request reached the network.
 */
export function sendByPixel(url, doc = document, { timeoutMs = 8000 } = {}) {
  return new Promise((resolve) => {
    const settle = (result) => resolve(Object.freeze({ transport: 'pixel', readable: false, status: null, ok: null, body: '', reply: null, ...result }));
    let img;
    try {
      img = doc.createElement('img');
    } catch (err) {
      settle({ sent: false, error: `Could not create the pixel: ${err.message}`, note: null });
      return;
    }

    const timer = setTimeout(
      () => settle({ sent: true, error: null, note: 'No response within 8s. Confirm in the tracker dashboard.' }),
      timeoutMs,
    );

    img.addEventListener('load', () => {
      clearTimeout(timer);
      settle({ sent: true, error: null, note: 'Pixel loaded. Confirm the conversion in the tracker dashboard.' });
    });
    img.addEventListener('error', () => {
      clearTimeout(timer);
      settle({
        sent: true,
        error: null,
        note: 'Request reached the network but the reply was not an image — expected for /postback. Confirm in the dashboard.',
      });
    });

    img.alt = '';
    img.width = 1;
    img.height = 1;
    img.style.display = 'none';
    img.src = url;
    doc.body.appendChild(img);
  });
}

/** The curl command that reproduces a browser send, with the response headers shown. */
export function curlFor(url) {
  return `curl -i "${String(url).replace(/"/g, '%22')}"`;
}

export async function copyToClipboard(text, clipboard = navigator.clipboard) {
  try {
    if (!clipboard?.writeText) throw new Error('the clipboard API is unavailable');
    await clipboard.writeText(text);
    return Object.freeze({ copied: true, error: null });
  } catch (err) {
    return Object.freeze({ copied: false, error: `Could not copy: ${err.message}. Select the text and copy it manually.` });
  }
}
