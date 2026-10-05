import type { ChangeEvent } from "react";

import { cn } from "@/utils/cn";

const inputClass =
  "mt-1 w-full rounded-md border border-border bg-panel-2 px-2.5 py-1.5 font-mono text-sm tabular-nums text-text placeholder:text-faint";

function FieldLabel({ htmlFor, label, unit }: { htmlFor: string; label: string; unit?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-muted">
      {label}
      {unit ? <span className="ml-1 text-faint">({unit})</span> : null}
    </label>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} label={label} />
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

export function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  hint,
  min,
  max,
  step,
  className,
}: {
  id: string;
  label: string;
  unit?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} label={label} unit={unit} />
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className={inputClass}
      />
      {hint ? <p className="mt-1 text-[11px] leading-snug text-faint">{hint}</p> : null}
    </div>
  );
}

export function SelectField<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  className,
}: {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  className?: string;
}) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} label={label} />
      <select
        id={id}
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as T)}
        className={cn(inputClass, "cursor-pointer")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
