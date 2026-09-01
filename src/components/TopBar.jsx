import { IconCode, IconCopy, IconUndo, IconRedo } from "./Icons.jsx";

export default function TopBar({
  docName, status, hasDoc, rawOpen, copied, shortcut,
  undoKeys, redoKeys, canUndo, canRedo, undoLabel, redoLabel, onUndo, onRedo,
  onBack, onToggleRaw, onCopy,
}) {
  const historyTitle = (verb, label, keys) =>
    (label ? verb + " " + label : "Nothing to " + verb.toLowerCase()) + " (" + keys + ")";

  return (
    <div className="topbar">
      <div className="brand">
        <span className="mark">{"{}"}</span>
        <b>JSON&nbsp;Pack</b>
      </div>
      <div className="rule" />
      <div className="doc">
        <span className="name">{docName || "no document"}</span>
        <span className={"tag" + (status ? " " + status.tone : "")}>
          <i />
          <span>{status ? status.label : "waiting"}</span>
        </span>
      </div>
      {hasDoc && (
        <>
          <div className="rule" />
          <div className="history">
            <button
              className="tool"
              onClick={onUndo}
              disabled={!canUndo}
              title={historyTitle("Undo", undoLabel, undoKeys)}
              aria-label={historyTitle("Undo", undoLabel, undoKeys)}
            >
              <IconUndo />
            </button>
            <button
              className="tool"
              onClick={onRedo}
              disabled={!canRedo}
              title={historyTitle("Redo", redoLabel, redoKeys)}
              aria-label={historyTitle("Redo", redoLabel, redoKeys)}
            >
              <IconRedo />
            </button>
          </div>
        </>
      )}
      <div className="spacer" />
      {hasDoc && (
        <>
          <button className="btn btn--quiet" onClick={onBack}>Start over</button>
          <button className={"btn btn--line" + (rawOpen ? " is-on" : "")} onClick={onToggleRaw}>
            <IconCode />
            Raw JSON
          </button>
          <button className={"btn btn--fill" + (copied ? " is-done" : "")} onClick={onCopy}>
            <IconCopy />
            Copy JSON <span className="kbd">{shortcut}</span>
          </button>
        </>
      )}
    </div>
  );
}
