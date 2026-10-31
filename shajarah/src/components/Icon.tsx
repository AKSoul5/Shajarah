// The app's few icons, drawn as fine lines in the colour of the text around
// them (no emoji: they render differently on every system and clash with
// the parchment and gold).

const PATHS = {
  tree: "M12 21v-7m0 0-3-3m3 3 3-3M12 14V9m-6 2.5a4 4 0 0 1 2-7.4 4.5 4.5 0 0 1 8 0 4 4 0 0 1 2 7.4 3.5 3.5 0 0 1-3 2H9a3.5 3.5 0 0 1-3-2Z",
  pen: "m15 5 4 4M4 20l1-5L16 4l4 4L9 19l-5 1Z",
  family: "M8 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm8 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 20v-3a5 5 0 0 1 10 0v3m-2-3a5 5 0 0 1 10 0v3",
  printer: "M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7v-7Z",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5M9 13h6m-6 4h6",
  archive: "M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Zm-1-4h18v4H3V4Zm7 8h4",
  palette: "M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.4-1.9l-.5-1.2a1.5 1.5 0 0 1 1.4-2.1H17a4 4 0 0 0 4-4c0-4.9-4-8.8-9-8.8ZM7.5 11h.01M10 7h.01M14.5 7h.01M17 11h.01",
  trunk: "M9 21c1-3 1-8 0-12m6 12c-1-3-1-8 0-12M5 21h14M9 9 6 5m3 4 3-4m3 4 3-4m-3 4-3-4",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  eyeOff: "M3 3l18 18M10.6 5.1A9.6 9.6 0 0 1 12 5c5 0 8.5 4.5 9.5 7a12 12 0 0 1-2.6 3.6M6.3 6.4A12.4 12.4 0 0 0 2.5 12c1 2.5 4.5 7 9.5 7a9.5 9.5 0 0 0 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2",
  branch: "M6 21V8m0 0a3 3 0 1 0 0-.01M6 14c0-3 3-4 6-4h2m0 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z",
  dotted: "M3 12h.01M7.5 12h.01M12 12h.01M16.5 12h.01M21 12h.01",
  search: "M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM21 21l-5.2-5.2",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z",
} as const;

export type IconName = keyof typeof PATHS;

/** A line icon, 1em square by default; `filled` fills it with the text colour (a pinned star). */
export function Icon({ name, className = "h-4 w-4", filled = false }: { name: IconName; className?: string; filled?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`inline-block shrink-0 ${className}`} fill={filled ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth={name === "dotted" ? 3 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}
