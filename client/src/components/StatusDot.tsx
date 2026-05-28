type StatusDotProps = {
  configured: boolean;
};

export function StatusDot({ configured }: StatusDotProps): React.JSX.Element {
  return <span className={configured ? "status-dot is-ready" : "status-dot is-offline"} aria-hidden="true" />;
}
