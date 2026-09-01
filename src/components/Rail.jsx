import { isI18n, isObj, hasI18n } from "../lib/json-shape.js";
import { completeness } from "../lib/format.js";
import { localeMeta, tint } from "../lib/locales.js";
import { pathKey } from "../lib/rows.js";

function Dots({ node, locales, hues }) {
  const done = completeness(node, locales);
  return (
    <span className="dots">
      {locales.map(l => (
        <i
          key={l}
          style={{
            background: done[l] ? hues[l] : "transparent",
            boxShadow: done[l] ? "none" : "inset 0 0 0 1.5px " + tint(hues[l], 0.45),
          }}
          title={localeMeta(l).name + (done[l] ? " complete" : " has empty strings")}
        />
      ))}
    </span>
  );
}

export default function Rail({ doc, locales, hues, fieldCount, localised, onJump }) {
  const nodes = [];

  Object.keys(doc).forEach(key => {
    const value = doc[key];
    if (Array.isArray(value)) {
      nodes.push({ id: key, glyph: "[ ]", label: key + " · " + value.length, node: value });
      value.forEach((item, i) => {
        const title = isObj(item) && isI18n(item.title) ? item.title[locales[0]] : "";
        const own = isI18n(item) ? item[locales[0]] || Object.values(item).find(Boolean) || "" : "";
        const preview = typeof item === "string" ? item : own;
        nodes.push({
          id: key + "[" + i + "]",
          glyph: String(i + 1).padStart(2, "0"),
          label: title || preview || "item " + (i + 1),
          node: item,
          child: true,
          jump: pathKey([key]) + "[" + i + "]",
        });
      });
    } else if (isI18n(value)) {
      nodes.push({ id: key, glyph: "{}", label: key, node: value });
    } else if (isObj(value)) {
      nodes.push({ id: key, glyph: "{}", label: key, node: value });
    }
  });

  return (
    <aside className="rail">
      <div className="rail-top">
        <span className="eyebrow">Structure</span>
        <span className="eyebrow">{fieldCount} fields</span>
      </div>
      <nav className="tree">
        {nodes.map(n => (
          <button
            key={n.id}
            className={"node" + (n.child ? " node--child" : "")}
            onClick={n.jump ? () => onJump(n.jump) : undefined}
            title={n.jump ? "Jump to " + n.label : undefined}
          >
            <span className="g">{n.glyph}</span>
            <span className="t">{n.label}</span>
            {/* completeness dots are meaningless where nothing is localised */}
            {hasI18n(n.node) && <Dots node={n.node} locales={locales} hues={hues} />}
          </button>
        ))}
      </nav>
      {localised && (
        <div className="rail-note">Each dot is one locale. Hollow means the string is still empty.</div>
      )}
    </aside>
  );
}
