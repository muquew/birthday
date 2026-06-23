import {
  CalendarDays,
  Check,
  ChevronRight,
  ListFilter
} from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState
} from "react";
import type {
  PublicBirthdayViewMode,
  RangeFilter,
  SelectOption
} from "../model.js";

export function RangeTabs({
  value,
  onChange
}: {
  value: RangeFilter;
  onChange: (value: RangeFilter) => void;
}) {
  const options: Array<{ value: RangeFilter; label: string }> = [
    { value: "all", label: "全部" },
    { value: "today", label: "今天" },
    { value: "30", label: "30天" },
    { value: "90", label: "90天" }
  ];
  return (
    <div className="range-tabs" aria-label="生日范围">
      {options.map((option) => (
        <button
          key={option.value}
          className={value === option.value ? "active" : ""}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function PublicViewSwitch({
  value,
  onChange
}: {
  value: PublicBirthdayViewMode;
  onChange: (value: PublicBirthdayViewMode) => void;
}) {
  const options: Array<{ value: PublicBirthdayViewMode; label: string; icon: ReactNode }> = [
    { value: "list", label: "列表", icon: <ListFilter size={16} aria-hidden /> },
    { value: "calendar", label: "日历", icon: <CalendarDays size={16} aria-hidden /> }
  ];
  return (
    <div className="public-view-switch" role="tablist" aria-label="全部生日视图">
      {options.map((option) => (
        <button
          aria-selected={value === option.value}
          className={value === option.value ? "active" : ""}
          key={option.value}
          role="tab"
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function CustomSelect<T extends string>({
  ariaLabel,
  value,
  onChange,
  options,
  className
}: {
  ariaLabel: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<SelectOption<T>>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  const moveOptionFocus = (event: ReactKeyboardEvent<HTMLDivElement>, direction: 1 | -1) => {
    const buttons = Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>(".custom-select-option") ?? []
    );
    if (buttons.length === 0) {
      return;
    }
    const currentIndex = buttons.findIndex((button) => button === document.activeElement);
    const nextIndex =
      currentIndex === -1
        ? options.findIndex((option) => option.value === value)
        : currentIndex + direction;
    buttons[(nextIndex + buttons.length) % buttons.length]?.focus();
    event.preventDefault();
  };

  const openFromKeyboard = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowDown", "Enter", " "].includes(event.key)) {
      setOpen(true);
      event.preventDefault();
      window.requestAnimationFrame(() => {
        rootRef.current?.querySelector<HTMLButtonElement>("[aria-selected='true']")?.focus();
      });
    }
  };

  return (
    <div className={`custom-select ${className ?? ""}`} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="custom-select-trigger"
        type="button"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={openFromKeyboard}
      >
        <span>{selected.label}</span>
        <ChevronRight className="custom-select-arrow" size={16} aria-hidden />
      </button>
      {open ? (
        <div
          className="custom-select-menu"
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              rootRef.current?.querySelector<HTMLButtonElement>(".custom-select-trigger")?.focus();
              event.preventDefault();
            }
            if (event.key === "ArrowDown") {
              moveOptionFocus(event, 1);
            }
            if (event.key === "ArrowUp") {
              moveOptionFocus(event, -1);
            }
          }}
        >
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              className="custom-select-option"
              key={option.value}
              role="option"
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value ? <Check size={15} aria-hidden /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
