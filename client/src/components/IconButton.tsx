type IconButtonProps = {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

export function IconButton({ label, children, onClick, disabled = false }: IconButtonProps): React.JSX.Element {
  return (
    <button className="icon-button" type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
