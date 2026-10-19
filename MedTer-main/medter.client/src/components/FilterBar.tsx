import { useState, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes } from "react";
import { Search, X, Sliders, ChevronDown } from "./icons";

export type FilterChip = {
  id: string;
  label: string;
  onClear: () => void;
};

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "size"> & {
  value: string;
  onChange: (value: string) => void;
  /** Visual size: default fills filter row; compact for admin headers */
  size?: "default" | "compact";
};

export function SearchField({
  value,
  onChange,
  placeholder,
  size = "default",
  className,
  ...rest
}: SearchFieldProps) {
  return (
    <div className={`fb-search${size === "compact" ? " fb-search--compact" : ""}${className ? ` ${className}` : ""}`}>
      <Search size={size === "compact" ? 15 : 16} aria-hidden />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        {...rest}
      />
      {value ? (
        <button
          type="button"
          className="fb-search-clear"
          aria-label="Clear"
          onClick={() => onChange("")}
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

type FilterSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  /** Empty/all option label. Omit for required selects (e.g. sort). */
  allLabel?: string;
  /** Highlight when value differs from this (defaults to empty string). */
  defaultValue?: string;
};

export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  defaultValue = "",
  className,
  ...rest
}: FilterSelectProps) {
  const active = value !== defaultValue;
  return (
    <select
      className={`fb-select control${active ? " fb-select--active" : ""}${className ? ` ${className}` : ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    >
      {allLabel != null && <option value="">{allLabel}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

type FilterToggleProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
  "aria-label"?: string;
};

export function FilterToggle({ active, onClick, children, title, ...rest }: FilterToggleProps) {
  return (
    <button
      type="button"
      className={`fb-toggle${active ? " active" : ""}`}
      onClick={onClick}
      title={title}
      aria-pressed={active}
      {...rest}
    >
      {children}
    </button>
  );
}

type FilterChipsProps = {
  chips: FilterChip[];
  clearLabel: string;
  onClearAll: () => void;
};

export function FilterChips({ chips, clearLabel, onClearAll }: FilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <div className="fb-chips" role="list">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className="fb-chip"
          role="listitem"
          onClick={chip.onClear}
          title={clearLabel}
        >
          <span>{chip.label}</span>
          <X size={12} aria-hidden />
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" className="fb-chips-clear" onClick={onClearAll}>
          {clearLabel}
        </button>
      )}
    </div>
  );
}

type ResultMetaProps = {
  shown: number;
  total: number;
  label: (shown: number, total: number) => string;
  hasFilters: boolean;
};

export function ResultMeta({ shown, total, label, hasFilters }: ResultMetaProps) {
  if (total === 0) return null;
  return (
    <div className={`fb-meta${hasFilters ? " fb-meta--filtered" : ""}`}>
      <Sliders size={13} aria-hidden />
      <span>{label(shown, total)}</span>
    </div>
  );
}

type FilterBarProps = {
  search?: ReactNode;
  filters?: ReactNode;
  chips?: ReactNode;
  meta?: ReactNode;
  className?: string;
  /** Hide filters behind a single toggle (closed by default). */
  collapsible?: boolean;
  /** Button label when collapsible. */
  filtersLabel?: string;
  /** Number of active filters — shown as a badge on the toggle. */
  activeCount?: number;
};

/** Unified filter shell used across list pages. */
export function FilterBar({
  search,
  filters,
  chips,
  meta,
  className,
  collapsible = false,
  filtersLabel = "Filters",
  activeCount = 0,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const showFilters = !collapsible || open;

  return (
    <div className={`filter-bar${collapsible ? " filter-bar--collapsible" : ""}${open ? " is-open" : ""}${className ? ` ${className}` : ""}`}>
      <div className="fb-row">
        {search ?? null}
        {collapsible && filters ? (
          <button
            type="button"
            className={`fb-filters-toggle${activeCount > 0 ? " has-active" : ""}${open ? " is-open" : ""}`}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="fb-filters-panel"
          >
            <Sliders size={15} aria-hidden />
            <span>{filtersLabel}</span>
            {activeCount > 0 && <span className="fb-filters-badge">{activeCount}</span>}
            <ChevronDown size={14} aria-hidden className="fb-filters-chevron" />
          </button>
        ) : null}
        {showFilters && filters ? (
          <div className="fb-filters" id={collapsible ? "fb-filters-panel" : undefined}>
            {filters}
          </div>
        ) : null}
      </div>
      {(chips || meta) && (
        <div className="fb-foot">
          {chips}
          {meta}
        </div>
      )}
    </div>
  );
}
