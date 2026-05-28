interface SegmentedOption<V extends string> {
  value: V;
  label: string;
}

interface SegmentedProps<V extends string> {
  value: V;
  onChange: (next: V) => void;
  options: ReadonlyArray<SegmentedOption<V>>;
  ariaLabel?: string;
}

export function Segmented<V extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: SegmentedProps<V>) {
  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            className={`segmented__btn ${active ? 'segmented__btn--active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
