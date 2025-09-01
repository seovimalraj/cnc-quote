import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { Machine, MachineLimit, MachineSpec } from "@cnc-quote/shared";

@Injectable()
export class MachineService {
  private supabase;

  constructor(private readonly config: ConfigService) {
    this.supabase = createClient(
      this.config.getOrThrow("SUPABASE_URL"),
      this.config.getOrThrow("SUPABASE_SERVICE_KEY"),
    );
  }

  async findAll() {
    const { data, error } = await this.supabase.from("machines").select(`
        *,
        machine_specs(*),
        machine_limits(*)
      `);

    if (error) {
      throw error;
    }

    return data as (Machine & { machine_specs: MachineSpec[]; machine_limits: MachineLimit[] })[];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from("machines")
      .select(
        `
        *,
        machine_specs(*),
        machine_limits(*)
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    return data as Machine & { machine_specs: MachineSpec[]; machine_limits: MachineLimit[] };
  }
}
