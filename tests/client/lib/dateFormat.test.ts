import { describe, expect, it } from "vitest";
import { formatDateDivider, formatMessageTime } from "../../../client/src/lib/dateFormat";

describe("date formatting", () => {
  const date = new Date("2026-05-29T13:05:00.000Z");

  it("uses the app's configured message time format", () => {
    expect(formatMessageTime(date)).toBe(
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(date),
    );
  });

  it("uses the app's configured date divider format", () => {
    expect(formatDateDivider(date)).toBe(
      new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(date),
    );
  });
});
