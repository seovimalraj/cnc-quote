import { Injectable, OnModuleInit, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable({ scope: Scope.REQUEST })
export class SupabaseService implements OnModuleInit {
  private _client: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this._client = createClient(this.config.getOrThrow("SUPABASE_URL"), this.config.getOrThrow("SUPABASE_SERVICE_KEY"));
  }

  get client() {
    return this._client;
  }
}
