import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatPhoneNumber, formatPhoneInput } from '@/lib/phone-utils';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  formatOnBlur?: boolean;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, formatOnBlur = true, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(value);

    React.useEffect(() => {
      setDisplayValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = formatPhoneInput(e.target.value);
      setDisplayValue(newValue);
      onChange(newValue);
    };

    const handleBlur = () => {
      if (formatOnBlur && displayValue) {
        const formatted = formatPhoneNumber(displayValue);
        setDisplayValue(formatted);
        onChange(formatted);
      }
    };

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn('font-mono', className)}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };
