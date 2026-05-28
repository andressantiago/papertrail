export function TypingIndicator(): React.JSX.Element {
  return (
    <p className="typing" aria-label="Thinking">
      <span>Thinking</span>
      <span className="typing-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </p>
  );
}
