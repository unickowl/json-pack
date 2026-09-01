/**
 * Undo/redo over whole-document snapshots. Snapshots are cheap here because
 * every edit goes through setIn(), so an unchanged branch keeps its identity
 * and is shared between entries rather than copied.
 *
 * Typing is coalesced: consecutive edits to the same path within
 * COALESCE_MS collapse into one entry, so undo steps back over a burst of
 * typing rather than one character at a time. Structural changes never
 * coalesce — each one is its own step.
 */
const LIMIT = 100;
const COALESCE_MS = 700;

export const initHistory = doc => ({
  past: [],
  present: doc,
  future: [],
  lastLabel: null,
  coalesce: null,
});

export function applyChange(state, nextDoc, { label, coalesceKey = null, now = 0 }) {
  const coalesces =
    coalesceKey !== null &&
    state.coalesce !== null &&
    state.coalesce.key === coalesceKey &&
    now - state.coalesce.at < COALESCE_MS;

  if (coalesces) {
    // Same field, still typing: replace the present without adding a step.
    return { ...state, present: nextDoc, future: [], coalesce: { key: coalesceKey, at: now } };
  }

  return {
    past: [...state.past, { doc: state.present, label: state.lastLabel }].slice(-LIMIT),
    present: nextDoc,
    future: [],
    lastLabel: label,
    coalesce: coalesceKey === null ? null : { key: coalesceKey, at: now },
  };
}

export const canUndo = state => state.past.length > 0;
export const canRedo = state => state.future.length > 0;

/** What undo would reverse, and what redo would re-apply. */
export const undoLabel = state => (canUndo(state) ? state.lastLabel : null);
export const redoLabel = state => (canRedo(state) ? state.future[0].label : null);

export function undo(state) {
  if (!canUndo(state)) return state;
  const previous = state.past[state.past.length - 1];
  return {
    past: state.past.slice(0, -1),
    present: previous.doc,
    future: [{ doc: state.present, label: state.lastLabel }, ...state.future],
    lastLabel: previous.label,
    coalesce: null,
  };
}

export function redo(state) {
  if (!canRedo(state)) return state;
  const [next, ...rest] = state.future;
  return {
    past: [...state.past, { doc: state.present, label: state.lastLabel }].slice(-LIMIT),
    present: next.doc,
    future: rest,
    lastLabel: next.label,
    coalesce: null,
  };
}
