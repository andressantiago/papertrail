import type { KeyboardEvent } from "react";
import { AlertIcon } from "./icons/AlertIcon";
import { SendIcon } from "./icons/SendIcon";

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
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
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
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "OpenAI API is not configured." : "Ask the API anything..."}
        rows={2}
        disabled={disabled || busy}
        aria-label="Message"
      />
      <div className="composer-actions">
        <button className="send-button" type="submit" disabled={disabled || busy || !value.trim()}>
          <SendIcon />
          <span>{busy ? "Sending" : "Send"}</span>
        </button>
      </div>
    </form>
  );
}
