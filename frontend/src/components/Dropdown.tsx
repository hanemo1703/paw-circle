import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Dropdown.module.scss';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  id?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  size?: 'md' | 'sm';
  // Shows an "X" button that resets the selection back to no value (the placeholder).
  clearable?: boolean;
}

export default function Dropdown({
  id,
  options,
  value,
  onChange,
  onBlur,
  placeholder = 'Chọn...',
  disabled,
  compact,
  size = 'md',
  clearable = false,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left?: number; right?: number; width?: number } | null>(
    null,
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuStyle(
        compact
          ? { top: rect.bottom + 4, right: window.innerWidth - rect.right }
          : { top: rect.bottom + 4, left: rect.left, width: rect.width },
      );
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
        onBlur?.();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = options.find((o) => o.value === value);

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
    onChange('');
    onBlur?.();
  }

  return (
    <div
      ref={wrapperRef}
      className={[
        styles.wrapper,
        compact && styles.compact,
        size === 'sm' && styles.sm,
        open && styles.open,
        clearable && styles.clearable,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        id={id}
        className={styles.trigger}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.value}>{selected ? selected.label : placeholder}</span>
        <span className={styles.caret} aria-hidden="true" />
      </button>
      {clearable && value && !disabled && (
        <button
          type="button"
          className={styles.clearBtn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClear}
          aria-label="Bỏ chọn"
        >
          <X size={12} />
        </button>
      )}
      {open &&
        menuStyle &&
        createPortal(
          <ul
            ref={listRef}
            className={[styles.list, compact && styles.listCompact].filter(Boolean).join(' ')}
            style={{
              position: 'fixed',
              top: menuStyle.top,
              left: menuStyle.left,
              right: menuStyle.right,
              width: menuStyle.width,
            }}
            role="listbox"
          >
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  className={[styles.option, opt.value === value && styles.optionSelected]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
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
