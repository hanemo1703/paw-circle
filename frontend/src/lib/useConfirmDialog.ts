import { useState } from 'react';

export function useConfirmDialog<T = true>() {
  const [pending, setPending] = useState<T | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const open = (value: T = true as T) => setPending(value);
  const close = () => {
    setPending(null);
    setSubmitting(false);
  };

  return { pending, isOpen: pending !== null, submitting, setSubmitting, open, close };
}
