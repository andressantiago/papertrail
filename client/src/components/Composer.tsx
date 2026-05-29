import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { AlertIcon } from "@client/components/icons/AlertIcon";
import { SendIcon } from "@client/components/icons/SendIcon";

type ComposerProps = {
  value: string;
  disabled: boolean;
  busy: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function Composer({
  value,
  disabled,
  busy,
  error,
  onChange,
  onSubmit,
}: ComposerProps): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const refocusWhenReadyRef = useRef(false);

  useEffect(() => {
    if (!busy && !disabled && refocusWhenReadyRef.current) {
      refocusWhenReadyRef.current = false;
      textareaRef.current?.focus();
    }
  }, [busy, disabled]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      refocusWhenReadyRef.current = Boolean(value.trim()) && !disabled && !busy;
      onSubmit();
    }
  }

  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {error ? (
        <div className="composer-error" role="alert">
          <AlertIcon />
          <span>{error}</span>
        </div>
      ) : null}
      <div className="composer-input">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "OpenAI API is not configured." : "Ask the API anything..."}
          rows={2}
          disabled={disabled || busy}
          aria-label="Message"
        />
        <button
          className="composer-send"
          type="submit"
          disabled={disabled || busy || !value.trim()}
          aria-label={busy ? "Sending message" : "Send message"}
        >
          <SendIcon />
        </button>
      </div>
    </form>
  );
}
