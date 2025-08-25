export function escapeHtml(text: string): string {
  return text
    ? text.replace(/[&<>"']/g, (m) => {
        const map: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        };
        return map[m];
      })
    : "";
}