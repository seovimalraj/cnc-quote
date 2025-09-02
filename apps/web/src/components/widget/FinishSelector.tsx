import { FC } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Finish } from '@cnc-quote/shared';

interface FinishSelectorProps {
  value?: string;
  finishes?: Finish[];
  onChange?: (finish: Finish) => void;
}

export const FinishSelector: FC<FinishSelectorProps> = ({ value, finishes = [], onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="finish">Surface Finish</Label>
      <Select
        value={value}
        onValueChange={(value) => {
          const finish = finishes.find((f) => f.id === value);
          if (finish && onChange) {
            onChange(finish);
          }
        }}
      >
        <SelectTrigger id="finish">
          <SelectValue placeholder="Select a finish" />
        </SelectTrigger>
        <SelectContent>
          {finishes.map((finish) => (
            <SelectItem key={finish.id} value={finish.id}>
              {finish.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
