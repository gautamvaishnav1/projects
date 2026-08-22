import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, Search } from "lucide-react";

export interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
}) {
  return (
    <AnimatePresence>
      {open && <PaletteInner onClose={onClose} items={items} />}
    </AnimatePresence>
  );
}

function PaletteInner({ onClose, items }: { onClose: () => void; items: PaletteItem[] }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[idx]?.run();
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 pt-[16vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: -8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="cc-glass w-[min(560px,92vw)] overflow-hidden rounded-2xl shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search size={16} className="shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            placeholder="Type a command or destination…"
            className="w-full bg-transparent font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
          />
          <kbd className="cc-kbd">esc</kbd>
        </div>
        <div className="max-h-[46vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-slate-500">No matches</div>
          )}
          {filtered.map((it, i) => (
            <button
              key={it.id}
              onMouseEnter={() => setIdx(i)}
              onClick={() => {
                it.run();
                onClose();
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${
                i === idx ? "bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/40" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <span>{it.label}</span>
              <span className="flex items-center gap-3">
                {it.hint && <span className="font-mono text-[11px] text-slate-500">{it.hint}</span>}
                {i === idx && <CornerDownLeft size={13} className="text-cyan-400" />}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-white/10 px-4 py-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <kbd className="cc-kbd">↑</kbd>
            <kbd className="cc-kbd">↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="cc-kbd">↵</kbd> run
          </span>
          <span className="ml-auto font-mono">codecity ⌘K</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
