import { IconCode, IconCopy } from "./Icons.jsx";

export default function TopBar({ docName, status, hasDoc, rawOpen, copied, onBack, onToggleRaw, onCopy, shortcut }) {
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
