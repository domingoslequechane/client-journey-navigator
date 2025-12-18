import * as React from 'react';
import PhoneInputWithCountry from 'react-phone-number-input';
import { cn } from '@/lib/utils';
import 'react-phone-number-input/style.css';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  defaultCountry?: 'MZ' | 'PT' | 'BR' | 'AO' | 'ZA' | 'US';
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, placeholder = '+258 84 123 4567', disabled, defaultCountry = 'MZ', ...props }, ref) => {
    return (
      <PhoneInputWithCountry
        international
        countryCallingCodeEditable={false}
        defaultCountry={defaultCountry}
        value={value || ''}
        onChange={(newValue) => onChange(newValue || '')}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'phone-input-container flex h-10 w-full rounded-md border border-input bg-background text-sm ring-offset-background',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };
