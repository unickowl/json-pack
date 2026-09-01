import { memo, useDeferredValue, useMemo } from "react";
import { isI18n, kindOf, blankOfKind } from "../lib/json-shape.js";
import { documentStats } from "../lib/format.js";
import { localeMeta, tint } from "../lib/locales.js";
import { buildRows, pathKey } from "../lib/rows.js";
import { getIn, arrayInsert, arrayRemove, arrayMove } from "../lib/immutable.js";
import { FieldRow, ScalarRow, ListItemRow, LocalisedItemRow, Band, ItemStrip, AddRow } from "./Rows.jsx";
import Rail from "./Rail.jsx";
import { IconAlert } from "./Icons.jsx";

const MemoRail = memo(Rail);

// Removing an item is one keystroke away from being reversible, so the toast
// says how rather than a modal asking whether.
const undoKeys = () =>
  /Mac|iPhone|iPad/.test((typeof navigator !== "undefined" && (navigator.platform || navigator.userAgent)) || "")
    ? "\u2318Z"
    : "Ctrl+Z";

const stripId = (path, index) => "item-" + pathKey(path).replace(/[^\w]/g, "-") + "-" + index;

export default function Editor({ session, onValueChange, onArrayChange, onToast }) {
  const { doc, locales, hues, shapes, originalKinds, notices, localised } = session;

  const rows = useMemo(() => buildRows(doc), [doc]);

  // The table follows every keystroke. The readouts derived from the whole
  // document - counts, rail dots, title - are allowed to lag a frame behind,
  // which keeps typing off the critical path on large documents.
  const settled = useDeferredValue(doc);
  const stats = useMemo(() => documentStats(settled, locales), [settled, locales]);

  const title = useMemo(() => {
    const key = Object.keys(settled).find(k => isI18n(settled[k]));
    if (!key) return "Untitled block";
    return settled[key][locales[0]] || Object.values(settled[key]).find(Boolean) || "Untitled block";
  }, [settled, locales]);

  const shapeFor = path => shapes.get(pathKey(path)) || null;

  const addItem = path => {
    const shape = shapeFor(path);
    const kind = shape ? shape.item : "string";
    onArrayChange(path, arr => [...arr, blankOfKind(kind, shape && shape.fields, locales)], "add item");
    onToast(
      kind === "object" && shape.fields.length
        ? "Item added — " + shape.fields.map(f => f.key).join(", ")
        : "Item added"
    );
  };

  const jump = key => {
    const el = document.getElementById("item-" + key.replace(/[^\w]/g, "-"));
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    <div className="shell">
      <MemoRail doc={settled} locales={locales} hues={hues} fieldCount={stats.fields} localised={localised} onJump={jump} />
      <main>
        <div className="head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 9 }}>Document</div>
            <h1>{title}</h1>
            <p>
              {localised
                ? stats.fields + " translatable fields · " + locales.length + " locales · " +
                  stats.written + " of " + stats.total + " strings written"
                : "Nothing in this document is localised · " + stats.strings +
                  (stats.strings === 1 ? " text value" : " text values")}
              {stats.flagged ? " · " + stats.flagged + " with invisible characters" : ""}
            </p>
          </div>
          {localised && (
            <div className="legend">
              {locales.map(code => (
                <span key={code} style={{ color: hues[code] }}>
                  <i style={{ background: hues[code] }} />
                  <span>{localeMeta(code).name}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {notices.map((text, i) => (
          <div className="notice" key={i}>
            <IconAlert />
            <span>{text}</span>
          </div>
        ))}

        <div className="thead">
          <div className="h h--label">Field</div>
          {locales.map(code => (
            <div key={code} className="h h--lane" style={localised ? { background: tint(hues[code], 0.03), color: hues[code] } : undefined}>
              {localised ? (
                <>
                  <span>{code}</span>
                  <em>{localeMeta(code).name}</em>
                </>
              ) : (
                <span>Value</span>
              )}
            </div>
          ))}
        </div>

        <div className="table">
          {rows.map(row => {
            if (row.type === "field") {
              return (
                <FieldRow
                  key={row.key}
                  node={getIn(doc, row.path)}
                  path={row.path}
                  label={row.label}
                  locales={locales}
                  hues={hues}
                  onChange={onValueChange}
                />
              );
            }
            if (row.type === "scalar") {
              const value = getIn(doc, row.path);
              return (
                <ScalarRow
                  key={row.key}
                  value={value}
                  path={row.path}
                  label={row.label}
                  originalKind={originalKinds.get(pathKey(row.path)) ?? kindOf(value)}
                  laneCount={locales.length}
                  onChange={onValueChange}
                />
              );
            }
            if (row.type === "band") {
              return <Band key={row.key} name={row.name} count={row.count} shape={shapeFor(row.path)} />;
            }
            if (row.type === "localisedItem") {
              return (
                <LocalisedItemRow
                  key={row.key}
                  node={getIn(doc, [...row.path, row.index])}
                  index={row.index}
                  total={row.total}
                  path={row.path}
                  pathLabel={row.key}
                  locales={locales}
                  hues={hues}
                  onChange={onValueChange}
                  onMove={(from, to) => onArrayChange(row.path, arr => arrayMove(arr, from, to), "move item")}
                  onDuplicate={i => {
                    onArrayChange(row.path, arr => arrayInsert(arr, i + 1, { ...arr[i] }), "duplicate item");
                    onToast("Item duplicated");
                  }}
                  onRemove={i => {
                    onArrayChange(row.path, arr => arrayRemove(arr, i), "remove item");
                    onToast("Item removed — undo with " + undoKeys());
                  }}
                />
              );
            }
            if (row.type === "listitem") {
              const shape = shapeFor(row.path);
              return (
                <ListItemRow
                  key={row.key}
                  value={getIn(doc, [...row.path, row.index])}
                  index={row.index}
                  total={row.total}
                  itemKind={shape ? shape.item : "string"}
                  laneCount={locales.length}
                  pathLabel={row.key}
                  onChange={v => onValueChange([...row.path, row.index], v)}
                  onMove={(from, to) => onArrayChange(row.path, arr => arrayMove(arr, from, to), "move item")}
                  onDuplicate={i => {
                    onArrayChange(row.path, arr => arrayInsert(arr, i + 1, arr[i]), "duplicate item");
                    onToast("Item duplicated");
                  }}
                  onRemove={i => {
                    onArrayChange(row.path, arr => arrayRemove(arr, i), "remove item");
                    onToast("Item removed — undo with " + undoKeys());
                  }}
                />
              );
            }
            if (row.type === "strip") {
              return (
                <ItemStrip
                  key={row.key}
                  id={stripId(row.path, row.index)}
                  index={row.index}
                  total={row.total}
                  pathLabel={row.key}
                  locales={locales}
                  hues={hues}
                  onMove={(from, to) => onArrayChange(row.path, arr => arrayMove(arr, from, to), "move item")}
                  onDuplicate={i => {
                    onArrayChange(row.path, arr => arrayInsert(arr, i + 1, JSON.parse(JSON.stringify(arr[i]))), "duplicate item");
                    onToast("Item duplicated");
                  }}
                  onRemove={i => {
                    onArrayChange(row.path, arr => arrayRemove(arr, i), "remove item");
                    onToast("Item removed — undo with " + undoKeys());
                  }}
                />
              );
            }
            return (
              <AddRow
                key={row.key}
                locales={locales}
                hues={hues}
                empty={row.empty}
                onAdd={() => addItem(row.path)}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
