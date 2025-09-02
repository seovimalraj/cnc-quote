import { FC } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface QuantitySelectorProps {
  value?: number;
  onChange?: (quantity: number) => void;
}

export const QuantitySelector: FC<QuantitySelectorProps> = ({ value = 1, onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="quantity">Quantity</Label>
      <Input
        id="quantity"
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange?.(parseInt(e.target.value, 10))}
      />
    </div>
  );
};
