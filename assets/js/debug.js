/** True when diagnostics should be visible: ?debug=1 (or debug=true) on the URL. Pure. */
export function debugRequested(search) {
  const v = new URLSearchParams(String(search ?? '').replace(/^\?/, '')).get('debug');
  return v === '1' || v === 'true';
}
