import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

interface CapabilityPayload {
  version?: 1;
  orgId?: string;
  supplierId?: string;
  processes?: string[];
  materials?: string[];
  machineGroups?: string[];
  throughputPerWeek?: number;
  leadDays?: number;
  certifications?: string[];
  regions?: string[];
  envelope?: any;
  notes?: string | null;
  active?: boolean;
}

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function writeArtifact(obj: any) {
  try {
    const artifactsDir = path.join(__dirname, '..', 'artifacts');
    await fs.mkdir(artifactsDir, { recursive: true });
    const file = path.join(artifactsDir, 'supplier-smoke.json');
    await fs.writeFile(file, JSON.stringify(obj, null, 2));
    console.log(`Wrote artifact: ${file}`);
  } catch (err) {
    console.warn('Failed to write artifact:', (err as Error).message);
  }
}

async function main() {
  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  const token = process.env.JWT_TOKEN;
  const supplierId = process.env.SUPPLIER_ID || 'S-TEST-1';
  const orgId = process.env.ORG_ID || 'org_test';
  const quoteId = process.env.QUOTE_ID; // optional

  if (!token) {
    console.error('Error: JWT_TOKEN environment variable is required');
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const result: any = { steps: [], at: new Date().toISOString() };

  // 1) Upsert a minimal capability
  try {
    const capability: CapabilityPayload = {
      version: 1,
      orgId,
      supplierId,
      processes: ['cnc_milling', 'cnc_turning'],
      materials: ['AL6061', 'SS304'],
      machineGroups: ['HAAS'],
      throughputPerWeek: 50,
      leadDays: 7,
      certifications: ['ISO9001'],
      regions: ['US'],
      active: true,
    };
    const { data, status } = await axios.put(`${apiUrl}/admin/suppliers/${supplierId}/capabilities`, capability, { headers });
    result.steps.push({ name: 'capability_upsert', status, ok: true, data: !!data });
  } catch (error: any) {
    const status = error?.response?.status ?? 0;
    result.steps.push({ name: 'capability_upsert', status, ok: false, error: error?.response?.data || error?.message });
  }

  // 2) Record an approval if QUOTE_ID provided
  if (quoteId) {
    try {
      const approval = {
        quoteId,
        approved: true,
        capacityCommitment: 5,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: 'qa-smoke',
      };
      const { data, status } = await axios.post(`${apiUrl}/admin/suppliers/${supplierId}/approvals`, approval, { headers });
      result.steps.push({ name: 'approval_create', status, ok: true, data: !!data });

      // optionally wait a moment for readiness bridge
      await sleep(1000);
      result.note = 'If readiness bridge is wired, quote may transition to ready';
    } catch (error: any) {
      const status = error?.response?.status ?? 0;
      result.steps.push({ name: 'approval_create', status, ok: false, error: error?.response?.data || error?.message });
    }
  } else {
    result.note = 'QUOTE_ID not provided; approval step skipped';
  }

  await writeArtifact(result);
  // Non-blocking smoke: always exit 0
  process.exit(0);
}

main().catch(async (err) => {
  await writeArtifact({ error: (err as Error).message, at: new Date().toISOString() });
  // Non-blocking
  process.exit(0);
});
