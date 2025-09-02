export type Technology = 'cnc' | 'sheet_metal' | 'injection_molding';

export type ProcessType = 'milling' | 'turning' | 'laser_cutting' | 'press_brake' | 'injection';

export interface Machine {
  id: string;
  organization_id: string;
  name: string;
  technology: Technology;
  process_type: ProcessType;
  model: string;
  manufacturer: string;
  year: number;
  status: 'active' | 'maintenance' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface MachineSpec {
  id: string;
  machine_id: string;
  key: string;
  value: string | number;
  unit?: string;
  created_at: string;
  updated_at: string;
}

export interface MachineLimit {
  id: string;
  machine_id: string;
  dimension: 'x' | 'y' | 'z' | 'diameter';
  min: number;
  max: number;
  unit: 'mm' | 'inch';
  created_at: string;
  updated_at: string;
}

export interface MachineMessage {
  id: string;
  machine_id: string;
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  params?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
