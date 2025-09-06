/* eslint-disable no-console */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(__dirname, "../backups");

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Get all tables
  const { data: tables, error: tablesError } = await supabase
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public");

  if (tablesError) {
    console.error("Error fetching tables:", tablesError);
    process.exit(1);
  }

  // Backup each table
  for (const table of tables!) {
    const { data, error } = await supabase.from(table.table_name).select("*");

    if (error) {
      console.error(`Error backing up table ${table.table_name}:`, error);
      continue;
    }

    const backupFile = path.join(backupDir, `${table.table_name}_${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
  }
}

backupDatabase().catch(console.error);
