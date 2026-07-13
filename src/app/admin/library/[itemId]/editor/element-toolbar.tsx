import { Type, Image as ImageIcon, Square, MousePointerClick, Video, Music } from "lucide-react";
import type { BookElementType } from "@/lib/library-book-elements";

const TOOLS: { type: BookElementType; label: string; icon: typeof Type }[] = [
  { type: "text", label: "Chữ", icon: Type },
  { type: "image", label: "Ảnh", icon: ImageIcon },
  { type: "shape", label: "Hình khối", icon: Square },
  { type: "button", label: "Nút bấm", icon: MousePointerClick },
  { type: "video", label: "Video", icon: Video },
  { type: "audio", label: "Audio", icon: Music },
];

// Leftmost column of the editor — click to drop a new element of that type
// onto the currently selected page at a sane default position/size
// (createDefaultElement), then the admin drags/resizes it into place.
export function ElementToolbar({ onAdd }: { onAdd: (type: BookElementType) => void }) {
  return (
    <div className="flex w-20 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface py-3">
      {TOOLS.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onAdd(type)}
          className="flex w-16 flex-col items-center gap-1 rounded-lg py-2 text-[11px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
    </div>
  );
}
