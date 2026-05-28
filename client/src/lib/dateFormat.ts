const MESSAGE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const DATE_DIVIDER_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function formatMessageTime(date: Date): string {
  return MESSAGE_TIME_FORMATTER.format(date);
}

export function formatDateDivider(date: Date): string {
  return DATE_DIVIDER_FORMATTER.format(date);
}
