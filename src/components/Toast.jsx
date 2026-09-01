import { useEffect, useState } from "react";
import { IconCheck, IconAlert } from "./Icons.jsx";

export default function Toast({ toast, onHide }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;
    setShown(true);
    const hide = setTimeout(() => setShown(false), toast.bad ? 5000 : 2100);
    const clear = setTimeout(onHide, (toast.bad ? 5000 : 2100) + 300);
    return () => { clearTimeout(hide); clearTimeout(clear); };
  }, [toast, onHide]);

  return (
    <div className={"toast" + (shown ? " is-up" : "") + (toast?.bad ? " is-bad" : "")} role="status" aria-live="polite">
      {toast?.bad ? <IconAlert /> : <IconCheck />}
      <span>{toast?.message || ""}</span>
    </div>
  );
}
