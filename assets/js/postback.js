/**
 * Conversion and postback delivery.
 *
 * A browser cannot read a cross-origin postback response, so neither transport
 * can confirm that RedTrack accepted the hit. Both report honestly and the
 * caller always shows the URL for manual verification.
 */

/** fetch with mode:"no-cors". Resolves once the request leaves the browser. */
export async function sendByFetch(url, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') {
    return Object.freeze({ sent: false, transport: 'fetch', error: 'fetch is unavailable in this browser.', note: null });
  }
  try {
    await fetchImpl(url, { method: 'GET', mode: 'no-cors', credentials: 'omit', cache: 'no-store' });
    return Object.freeze({
      sent: true,
      transport: 'fetch',
      error: null,
      note: 'Request sent. The response is opaque under CORS — confirm the conversion in the RedTrack dashboard.',
    });
  } catch (err) {
    return Object.freeze({ sent: false, transport: 'fetch', error: `Request failed: ${err.message}`, note: null });
  }
}

/**
 * Image pixel. Fires load or error, but RedTrack answers /postback with a
 * non-image body, so error is the normal outcome even on a recorded
 * conversion. Useful only to prove the request reached the network.
 */
export function sendByPixel(url, doc = document, { timeoutMs = 8000 } = {}) {
  return new Promise((resolve) => {
    const settle = (result) => resolve(Object.freeze({ transport: 'pixel', ...result }));
    let img;
    try {
      img = doc.createElement('img');
    } catch (err) {
      settle({ sent: false, error: `Could not create the pixel: ${err.message}`, note: null });
      return;
    }

    const timer = setTimeout(
      () => settle({ sent: true, error: null, note: 'No response within 8s. Confirm in the RedTrack dashboard.' }),
      timeoutMs,
    );

    img.addEventListener('load', () => {
      clearTimeout(timer);
      settle({ sent: true, error: null, note: 'Pixel loaded. Confirm the conversion in the RedTrack dashboard.' });
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

export async function copyToClipboard(text, clipboard = navigator.clipboard) {
  try {
    if (!clipboard?.writeText) throw new Error('the clipboard API is unavailable');
    await clipboard.writeText(text);
    return Object.freeze({ copied: true, error: null });
  } catch (err) {
    return Object.freeze({ copied: false, error: `Could not copy: ${err.message}. Select the URL and copy it manually.` });
  }
}
