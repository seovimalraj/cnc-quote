import { FC } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Material } from '@cnc-quote/shared';

interface MaterialSelectorProps {
  value?: string;
  materials?: Material[];
  onChange?: (material: Material) => void;
}

export const MaterialSelector: FC<MaterialSelectorProps> = ({ value, materials = [], onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="material">Material</Label>
      <Select
        value={value}
        onValueChange={(value) => {
          const material = materials.find((m) => m.id === value);
          if (material && onChange) {
            onChange(material);
          }
        }}
      >
        <SelectTrigger id="material">
          <SelectValue placeholder="Select a material" />
        </SelectTrigger>
        <SelectContent>
          {materials.map((material) => (
            <SelectItem key={material.id} value={material.id}>
              {material.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
