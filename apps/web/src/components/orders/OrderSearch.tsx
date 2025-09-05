import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface OrderSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function OrderSearch({ value, onChange, placeholder = 'Search...' }: OrderSearchProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="relative">
      <div
        className={`
          relative flex items-center
          ${isFocused ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        `}
      >
        <Search className="absolute left-3 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="pl-10 pr-10 w-64"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
