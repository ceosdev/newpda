import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { formatBRL } from '@/lib/utils';

/** Largest value the field accepts: R$ 999.999,99. */
const MAX_CENTS = 99_999_999;

type CurrencyInputProps = {
  /** Current amount in cents, or null/undefined when the field is empty. */
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

/**
 * Brazilian Real currency field with a cents-accumulator mask. The value is
 * always an integer of cents (or null when empty); the user types only digits
 * and each one shifts the number one place left (1 -> R$ 0,01; 8000 ->
 * R$ 80,00). Empty input -> null. No locale parsing, no floating point.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput({ value, onChange, ...props }, ref) {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const digits = event.target.value.replace(/\D/g, '');
      if (digits === '') {
        onChange(null);
        return;
      }
      onChange(Math.min(Number.parseInt(digits, 10), MAX_CENTS));
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={value == null ? '' : formatBRL(value)}
        onChange={handleChange}
      />
    );
  },
);
