import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Composer } from "@client/components/Composer";

function renderComposer(overrides: Partial<React.ComponentProps<typeof Composer>> = {}) {
  const props: React.ComponentProps<typeof Composer> = {
    busy: false,
    disabled: false,
    error: null,
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    value: "Hello",
    ...overrides,
  };

  render(<Composer {...props} />);

  return props;
}

describe("Composer", () => {
  it("sends on button submit when the message has text", async () => {
    const user = userEvent.setup();
    const props = renderComposer({ value: "Hello" });

    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it("sends on Enter but keeps Shift+Enter for new lines", () => {
    const props = renderComposer({ value: "Hello" });
    const textarea = screen.getByRole("textbox", { name: "Message" });

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(props.onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it("disables input and send actions while unavailable", () => {
    renderComposer({ disabled: true, value: "Hello" });

    expect(screen.getByRole("textbox", { name: "Message" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  it("renders API errors as alerts", () => {
    renderComposer({ error: "OpenAI request failed." });

    expect(screen.getByRole("alert")).toHaveTextContent("OpenAI request failed.");
  });

  it("reports text changes", async () => {
    const user = userEvent.setup();
    const props = renderComposer({ value: "" });

    await user.type(screen.getByRole("textbox", { name: "Message" }), "Hi");

    expect(props.onChange).toHaveBeenCalledWith("H");
    expect(props.onChange).toHaveBeenCalledWith("i");
  });
});
