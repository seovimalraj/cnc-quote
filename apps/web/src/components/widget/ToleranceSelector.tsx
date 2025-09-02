import { FC } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Tolerance } from '@cnc-quote/shared';

interface ToleranceSelectorProps {
  value?: string;
  tolerances?: Tolerance[];
  onChange?: (tolerance: Tolerance) => void;
}

export const ToleranceSelector: FC<ToleranceSelectorProps> = ({ value, tolerances = [], onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="tolerance">Tolerance</Label>
      <Select
        value={value}
        onValueChange={(value) => {
          const tolerance = tolerances.find((t) => t.id === value);
          if (tolerance && onChange) {
            onChange(tolerance);
          }
        }}
      >
        <SelectTrigger id="tolerance">
          <SelectValue placeholder="Select a tolerance" />
        </SelectTrigger>
        <SelectContent>
          {tolerances.map((tolerance) => (
            <SelectItem key={tolerance.id} value={tolerance.id}>
              {tolerance.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
