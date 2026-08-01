// Tiny browser-only helpers shared by the two places an admin can attach a
// file/URL to a whiteboard element: the right-side PropertyPanel and the
// floating SelectionToolbar (property-panel.tsx, selection-toolbar.tsx).

export async function uploadWhiteboardFile(url: string, file: File): Promise<{ url: string | null; error: string | null }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(url, { method: "POST", body: formData });
  try {
    const json = await res.json();
    return res.ok ? { url: json.url, error: null } : { url: null, error: json.error ?? "Tải lên thất bại." };
  } catch {
    return { url: null, error: res.status === 413 ? "File quá lớn." : "Tải lên thất bại." };
  }
}

export function domainOfUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
