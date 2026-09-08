/**
 * Append-only event log. State transitions return new frozen objects; the
 * renderer keeps the current state in a closure variable.
 */
export function createLog() {
  return Object.freeze({ entries: Object.freeze([]) });
}

export function appendEntry(state, { level = 'info', message = '', detail = null, at = new Date() } = {}) {
  const entry = Object.freeze({
    level,
    message: String(message),
    detail: detail === null || detail === undefined ? null : String(detail),
    at: at.toISOString(),
  });
  return Object.freeze({ entries: Object.freeze([...state.entries, entry]) });
}
