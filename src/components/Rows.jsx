import { memo, useLayoutEffect, useRef } from "react";
import { humanize, kindOf, coerce } from "../lib/json-shape.js";
import { formatIssues } from "../lib/format.js";
import { localeMeta, tint } from "../lib/locales.js";
import { IconUp, IconDown, IconCopy, IconDelete, IconPlus } from "./Icons.jsx";

const pad2 = n => String(n).padStart(2, "0");
const laneStyle = hue => ({ background: tint(hue, 0.03) });

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

/**
 * The locale columns of one i18n leaf. Shared by named fields and by array
 * elements that are themselves i18n leaves, so the empty marker, the invisible
 * character flag and the reference placeholder behave identically in both.
 */
function LocaleLanes({ node, locales, hues, describe, onChange }) {
  return locales.map(code => {
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
          aria-label={describe(code)}
          onChange={v => onChange(code, v)}
        />
      </div>
    );
  });
}

const EmptyLanes = ({ locales, hues }) =>
  locales.map(code => <div key={code} className="lane" style={laneStyle(hues[code])} />);

function Tools({ index, total, onMove, onDuplicate, onRemove }) {
  const label = pad2(index + 1);
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
 * Column 1 of any array element: which one it is, where it lives, what you can
 * do to it. Stacked like a field row's label so the path stays readable rather
 * than being ellipsised against the controls.
 */
function ItemColumn({ index, total, path, onMove, onDuplicate, onRemove }) {
  return (
    <div className="c1">
      <div className="stack">
        <span className="n">{"Item " + (index + 1)}</span>
        <span className="k">{path}</span>
      </div>
      <span className="spacer" />
      <Tools index={index} total={total} onMove={onMove} onDuplicate={onDuplicate} onRemove={onRemove} />
    </div>
  );
}

/* ── named fields ─────────────────────────────────────────────────────── */

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
      <LocaleLanes
        node={node}
        locales={locales}
        hues={hues}
        describe={code => humanize(name) + " in " + localeMeta(code).name}
        onChange={(code, v) => onChange([...path, code], v)}
      />
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
        <AutoTextarea value={text} aria-label={humanize(name)} onChange={v => onChange(path, coerce(v, originalKind))} />
      </div>
    </div>
  );
});

/* ── array elements ───────────────────────────────────────────────────── */

/** An element that is itself an i18n leaf: one row, translations side by side. */
export const LocalisedItemRow = memo(function LocalisedItemRow({
  node, index, total, path, pathLabel, locales, hues, onChange, onMove, onDuplicate, onRemove,
}) {
  return (
    <div className="row row--item row--localised">
      <ItemColumn index={index} total={total} path={pathLabel} onMove={onMove} onDuplicate={onDuplicate} onRemove={onRemove} />
      <LocaleLanes
        node={node}
        locales={locales}
        hues={hues}
        describe={code => pathLabel + " in " + localeMeta(code).name}
        onChange={(code, v) => onChange([...path, index, code], v)}
      />
    </div>
  );
});

/** An element that is a plain string or number: one value, no locale dimension. */
export const ListItemRow = memo(function ListItemRow({
  value, index, total, pathLabel, itemKind, laneCount, onChange, onMove, onDuplicate, onRemove,
}) {
  const issues = formatIssues(value);
  const text = value === null ? "null" : String(value);
  return (
    <div className="row row--item row--listitem">
      <ItemColumn index={index} total={total} path={pathLabel} onMove={onMove} onDuplicate={onDuplicate} onRemove={onRemove} />
      <div
        className={"lane lane--wide" + (text ? "" : " is-empty") + (issues.length ? " has-flag" : "")}
        data-lanes={laneCount}
        style={{ flex: laneCount + " 1 0", "--lanes": laneCount }}
        title={issues.length ? "Contains " + issues.join(" and ") + "." : undefined}
      >
        <AutoTextarea value={text} aria-label={pathLabel} onChange={v => onChange(coerce(v, itemKind))} />
      </div>
    </div>
  );
});

/** A record element: a separator carrying its controls, then its own field rows. */
export function ItemStrip({ id, index, total, pathLabel, locales, hues, onMove, onDuplicate, onRemove }) {
  return (
    <div className="row row--strip" id={id}>
      <ItemColumn index={index} total={total} path={pathLabel} onMove={onMove} onDuplicate={onDuplicate} onRemove={onRemove} />
      <EmptyLanes locales={locales} hues={hues} />
    </div>
  );
}

/* ── array chrome ─────────────────────────────────────────────────────── */

const SHAPE_TEXT = {
  i18n: "localised text",
  string: "text · not localised",
  number: "number · not localised",
  boolean: "true or false · not localised",
};

export function Band({ name, count, shape }) {
  const description = shape
    ? shape.item === "object"
      ? shape.fields.map(f => f.key).join(" · ")
      : SHAPE_TEXT[shape.item] || shape.item
    : null;
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
      <EmptyLanes locales={locales} hues={hues} />
    </div>
  );
}
