import { LabeledSwitch } from '@/components/ui/labeled-switch';

interface RepeatsToggleProps {
  value: boolean;
  onValueChange: (repeats: boolean) => void;
}

/** The goal form's Repeats switch: on, the goal is written again every new period. */
export function RepeatsToggle({ value, onValueChange }: RepeatsToggleProps) {
  return <LabeledSwitch label="Repeats" value={value} onValueChange={onValueChange} />;
}
