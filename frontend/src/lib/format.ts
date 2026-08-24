export function formatDateTime(value?: string | null): string {
  if (!value) return "TBD";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function extractMeetingId(link: string): string | null {
  const match = link.match(/https:\/\/meet\.google\.com\/([a-zA-Z0-9-]+)/);
  if (match) return match[1];
  const parts = link.split("/");
  const last = parts[parts.length - 1];
  return last && last.includes("-") ? last : null;
}
