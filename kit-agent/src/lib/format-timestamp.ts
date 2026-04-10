const KST_CLOCK = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

export function formatTimestamp(
  input: string | number | Date,
  fallback = "--:--:--",
): string {
  const d =
    input instanceof Date
      ? input
      : typeof input === "number"
        ? new Date(input)
        : new Date(String(input));
  if (Number.isNaN(d.getTime())) return fallback;
  return KST_CLOCK.format(d);
}

