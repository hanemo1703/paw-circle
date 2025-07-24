import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './MultiSelectDropdown.module.scss';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  id?: string;
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  allLabel?: string;
}

// Empty `selected` array means "Tất cả" (all) — no filtering applied for this group.
export default function MultiSelectDropdown({
  id,
  label,
  options,
  selected,
  onChange,
  allLabel = 'Tất cả',
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuStyle({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 200) });
    }
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        !(listRef.current && listRef.current.contains(target))
      ) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const triggerText =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? allLabel
        : `Đã chọn ${selected.length}`;

  return (
    <div ref={wrapperRef} className={[styles.wrapper, open && styles.open].filter(Boolean).join(' ')}>
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        id={id}
        className={[styles.trigger, selected.length > 0 && styles.triggerActive].filter(Boolean).join(' ')}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.value}>{triggerText}</span>
        <span className={styles.caret} aria-hidden="true" />
      </button>
      {open &&
        menuStyle &&
        createPortal(
          <ul
            ref={listRef}
            className={styles.list}
            style={{ position: 'fixed', top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
            role="listbox"
          >
            <li>
              <button
                type="button"
                className={[styles.option, selected.length === 0 && styles.optionSelected].filter(Boolean).join(' ')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChange([])}
              >
                {allLabel}
              </button>
            </li>
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  className={[styles.option, selected.includes(opt.value) && styles.optionSelected]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleOption(opt.value)}
                >
                  <span
                    className={[styles.checkbox, selected.includes(opt.value) && styles.checkboxChecked]
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden="true"
                  />
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>,
          document.querySelector('.app-root') ?? document.body,
        )}
    </div>
  );
}
