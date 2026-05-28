import { ChevronDownIcon } from "./icons/ChevronDownIcon";

type ModelPillProps = {
  model: string;
};

export function ModelPill({ model }: ModelPillProps): React.JSX.Element {
  return (
    <div className="model-pill" title={model}>
      <span>{model}</span>
      <ChevronDownIcon />
    </div>
  );
}
