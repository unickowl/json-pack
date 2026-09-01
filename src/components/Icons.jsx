const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const IconCode = () => (
  <svg viewBox="0 0 24 24" {...stroke}><path d="M8 4 4 12l4 8M16 4l4 8-4 8" /></svg>
);
export const IconCopy = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6.5A3.5 3.5 0 0 0 3 6.5v6A2.5 2.5 0 0 0 5.5 15" />
  </svg>
);
export const IconUp = () => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><path d="M12 19V6M6 12l6-6 6 6" /></svg>
);
export const IconDown = () => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><path d="M12 5v13M18 12l-6 6-6-6" /></svg>
);
export const IconDelete = () => (
  <svg viewBox="0 0 24 24" {...stroke}><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7" /></svg>
);
export const IconPlus = () => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9}><path d="M12 5.5v13M5.5 12h13" /></svg>
);
export const IconClose = () => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconCheck = () => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M4 12.5l5 5L20 6.5" /></svg>
);
export const IconAlert = () => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><path d="M12 8v5M12 16.5v.5M12 3.5 2.5 20h19L12 3.5Z" /></svg>
);

export const IconUndo = () => (
  <svg viewBox="0 0 24 24" {...stroke}><path d="M8.5 5 4 9.5 8.5 14" /><path d="M4 9.5h9A5.5 5.5 0 0 1 13 20.5H9.5" /></svg>
);
export const IconRedo = () => (
  <svg viewBox="0 0 24 24" {...stroke}><path d="M15.5 5 20 9.5 15.5 14" /><path d="M20 9.5h-9A5.5 5.5 0 0 0 11 20.5h3.5" /></svg>
);
