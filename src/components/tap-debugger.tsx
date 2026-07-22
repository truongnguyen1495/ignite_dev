"use client";

import { useEffect } from "react";

// Temporary, on-device diagnostic for the "hamburger dead on old iOS Safari"
// bug — no-ops unless ?debug=tap is in the URL, so it's a harmless no-op in
// normal use. Reports (via alert, since iOS Safari has no on-device console
// without a Mac) exactly which element document.elementFromPoint() finds at
// the raw touch coordinates, using touchstart (not click) so it still fires
// even when whatever is broken prevents a click from ever being synthesized.
// Remove once the real bug is found — this isn't meant to ship long-term.
export function TapDebugger() {
  useEffect(() => {
    if (!window.location.search.includes("debug=tap")) return;

    function handler(e: TouchEvent) {
      const touch = e.touches[0] ?? e.changedTouches[0];
      if (!touch) return;
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const info = el
        ? `<${el.tagName.toLowerCase()}> class="${el.className || "(không có class)"}"`
        : "không có phần tử nào ở đó";
      alert(`Chạm tại (${Math.round(touch.clientX)}, ${Math.round(touch.clientY)}):\n${info}`);
    }

    document.addEventListener("touchstart", handler, { capture: true });
    return () => document.removeEventListener("touchstart", handler, { capture: true });
  }, []);

  return null;
}
