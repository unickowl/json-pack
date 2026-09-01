import { memo, useLayoutEffect, useRef } from "react";
import { humanize, kindOf, coerce } from "../lib/json-shape.js";
import { formatIssues } from "../lib/format.js";
import { localeMeta, tint } from "../lib/locales.js";
import { IconUp, IconDown, IconCopy, IconDelete, IconPlus } from "./Icons.jsx";

function AutoTextarea({ value, onChange, ...rest }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, 20) + "px";
  }, [value]);
  return <textarea ref={ref} rows={1} spellCheck={false} value={value} onChange={e => onChange(e.target.value)} {...rest} />;
}

const laneStyle = hue => ({ background: tint(hue, 0.03) });

export const FieldRow = memo(function FieldRow({ node, path, label, locales, hues, onChange }) {
  const name = label[label.length - 1];
  return (
    <div className="row row--field">
      <div className="c1">
        <div className="stack">
          <span className="n">{humanize(name)}</span>
          <span className="k">{label.join(".")}</span>
        </div>
      </div>
      {locales.map(code => {
        const value = node[code] ?? "";
        const issues = formatIssues(value);
        const reference = code !== locales[0] && !value ? node[locales[0]] || "" : "";
        return (
          <div
            key={code}
            className={"lane" + (value ? "" : " is-empty") + (issues.length ? " has-flag" : "")}
            style={laneStyle(hues[code])}
            title={issues.length ? "Contains " + issues.join(" and ") + "." : undefined}
          >
            <span className="lanechip" style={{ color: hues[code] }}>{code}</span>
            <AutoTextarea
              value={value}
              placeholder={reference || undefined}
              aria-label={humanize(name) + " in " + localeMeta(code).name}
              onChange={v => onChange([...path, code], v)}
            />
          </div>
        );
      })}
    </div>
  );
});

export const ScalarRow = memo(function ScalarRow({ value, path, label, originalKind, laneCount, onChange }) {
  const name = label[label.length - 1];
  const kind = kindOf(value);
  const changed = kind !== originalKind;
  const text = value === null ? "null" : String(value);
  const issues = formatIssues(value);
  return (
    <div className="row row--field">
      <div className="c1">
        <div className="stack">
          <span className="n">{humanize(name)}</span>
          <span className={"k" + (changed ? " is-changed" : "")}>
            {changed ? originalKind + " → " + kind : kind}
          </span>
        </div>
      </div>
      <div
        className={"lane lane--wide" + (issues.length ? " has-flag" : "")}
        data-lanes={laneCount}
        style={{ flex: laneCount + " 1 0", "--lanes": laneCount }}
        title={changed ? "This field was a " + originalKind + ". It will be written as " + kind + "." : undefined}
      >
        <span className="spanhint">same for every locale</span>
        <AutoTextarea
          value={text}
          aria-label={humanize(name)}
          onChange={v => onChange(path, coerce(v, originalKind))}
        />
      </div>
    </div>
  );
});

export function Band({ name, count, shape }) {
  const describe = () => {
    if (!shape) return null;
    if (shape.item === "object") return shape.fields.map(f => f.key).join(" · ");
    return shape.item === "string" ? "text · not localised" : shape.item + " · not localised";
  };
  const description = describe();
  return (
    <div className="row row--band">
      <div className="c1">
        <h2>{humanize(name)}</h2>
        <span className="count">{count + (count === 1 ? " item" : " items")}</span>
        <span className="spacer" />
        {description && (
          <>
            <span className="shape-label">Item shape</span>
            <span className="shape">{description}</span>
          </>
        )}
      </div>
    </div>
  );
}

function Tools({ index, total, onMove, onDuplicate, onRemove }) {
  const label = String(index + 1).padStart(2, "0");
  return (
    <div className="tools">
      <button className="tool" title="Move up" aria-label={"Move item " + label + " up"} disabled={index === 0} onClick={() => onMove(index, index - 1)}><IconUp /></button>
      <button className="tool" title="Move down" aria-label={"Move item " + label + " down"} disabled={index === total - 1} onClick={() => onMove(index, index + 1)}><IconDown /></button>
      <button className="tool" title="Duplicate" aria-label={"Duplicate item " + label} onClick={() => onDuplicate(index)}><IconCopy /></button>
      <button className="tool" title="Remove" aria-label={"Remove item " + label} onClick={() => onRemove(index)}><IconDelete /></button>
    </div>
  );
}

/**
 * One element of a primitive array - a footnote, say. The controls sit in
 * column 1 like every other control, and the value spans the locale lanes
 * because the string is not localised.
 */
export const ListItemRow = memo(function ListItemRow({
  value, index, total, itemKind, laneCount, label, onChange, onMove, onDuplicate, onRemove,
}) {
  const issues = formatIssues(value);
  const text = value === null ? "null" : String(value);
  return (
    <div className="row row--listitem">
      <div className="c1">
        <span className="idx">{String(index + 1).padStart(2, "0")}</span>
        <span className="spacer" />
        <Tools index={index} total={total} onMove={onMove} onDuplicate={onDuplicate} onRemove={onRemove} />
      </div>
      <div
        className={"lane lane--wide" + (text ? "" : " is-empty") + (issues.length ? " has-flag" : "")}
        data-lanes={laneCount}
        style={{ flex: laneCount + " 1 0", "--lanes": laneCount }}
        title={issues.length ? "Contains " + issues.join(" and ") + "." : undefined}
      >
        <AutoTextarea
          value={text}
          aria-label={label.join(" ")}
          onChange={v => onChange(coerce(v, itemKind))}
        />
      </div>
    </div>
  );
});

const Lanes = ({ locales, hues }) =>
  locales.map(code => <div key={code} className="lane" style={laneStyle(hues[code])} />);

export function ItemStrip({ id, index, total, locales, hues, onMove, onDuplicate, onRemove }) {
  return (
    <div className="row row--strip" id={id}>
      <div className="c1">
        <span className="idx">{String(index + 1).padStart(2, "0")}</span>
        <span className="spacer" />
        <Tools index={index} total={total} onMove={onMove} onDuplicate={onDuplicate} onRemove={onRemove} />
      </div>
      <Lanes locales={locales} hues={hues} />
    </div>
  );
}

export function AddRow({ locales, hues, onAdd, empty }) {
  return (
    <div className={"row " + (empty ? "row--empty" : "row--add")}>
      <div className="c1">
        {empty && (
          <>
            <span>No items yet.</span>
            <span className="spacer" />
          </>
        )}
        <button className="add" onClick={onAdd}><IconPlus /><span>Add item</span></button>
      </div>
      <Lanes locales={locales} hues={hues} />
    </div>
  );
}
