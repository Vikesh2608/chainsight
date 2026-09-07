"use client";

import { toast } from "sonner";

/*
 * Clears every ChainSight key from localStorage and reloads, so the
 * app returns to its seed data. Handy when demoing.
 */
export default function DemoReset() {
  function reset() {
    toast("Reset all ChainSight data to the demo baseline?", {
      action: {
        label: "Reset",
        onClick: () => {
          try {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith("chainsight_")) {
                keys.push(key);
              }
            }
            keys.forEach((k) => localStorage.removeItem(k));
          } catch {
            // ignore storage errors
          }
          window.location.reload();
        },
      },
    });
  }

  return (
    <button
      onClick={reset}
      className="text-xs text-slate-500 underline-offset-2 transition hover:text-slate-300 hover:underline"
    >
      Reset demo data
    </button>
  );
}
