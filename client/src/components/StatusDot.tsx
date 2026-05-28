type StatusDotProps = {
  ready: boolean;
};

export function StatusDot({ ready }: StatusDotProps): React.JSX.Element {
  return <span className={ready ? "status-dot is-ready" : "status-dot is-offline"} aria-hidden />;
}
