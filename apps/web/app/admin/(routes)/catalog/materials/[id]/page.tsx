import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatRegionMultiplier } from '../utils'

type MaterialDetailRecord = {
  id: string
  code: string
  name: string
  standard: string | null
  composition_json: Record<string, unknown> | null
  processes: string[] | null
  available_regions: string[] | null
  density_kg_m3: number | null
  machinability_index: number | null
  hardness_hb: number | null
  tensile_mpa: number | null
  melting_c: number | null
  cost_per_kg_base: number | null
  supplier_ref: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  category?: {
    id: string | null
    code: string | null
    name: string | null
  } | null
  region_multipliers?: { id: string; region: string; multiplier: number }[] | null
  aliases?: { id: string; alias: string }[] | null
  machine_materials?: {
    id: string
    machine_id: string
    cutting_speed_m_min: number | null
    machine: {
      id: string
      name: string
      process_type: string
    }
  }[] | null
}

function numberOrDash(value: number | null | undefined, options?: Intl.NumberFormatOptions) {
  if (value === null || value === undefined) {
    return '—'
  }

  return new Intl.NumberFormat('en-US', options).format(value)
}

const MATERIAL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function formatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return MATERIAL_DATE_FORMATTER.format(parsed)
}

export default async function MaterialDetailPage({
  params: { id },
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('material_properties')
    .select(
      `
        id,
        code,
        name,
        standard,
        composition_json,
        processes,
        available_regions,
        density_kg_m3,
        machinability_index,
        hardness_hb,
        tensile_mpa,
        melting_c,
        cost_per_kg_base,
        supplier_ref,
        is_active,
        created_at,
        updated_at,
        category:material_categories ( id, code, name ),
        region_multipliers:material_region_multipliers ( id, region, multiplier ),
        aliases:material_aliases ( id, alias ),
        machine_materials:machine_materials (
          id,
          machine_id,
          cutting_speed_m_min,
          machine:machines ( id, name, process_type )
        )
      `
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load material ${id}: ${error.message}`)
  }

  if (!data) {
    notFound()
  }

  const material = data as unknown as MaterialDetailRecord
  const aliases = material.aliases ?? []
  const processes = material.processes ?? []
  const availableRegions = material.available_regions ?? []
  const multipliers = material.region_multipliers ?? []

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">Material</p>
          <h1 className="text-3xl font-semibold text-gray-900">{material.name}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Code {material.code} · Updated {formatDate(material.updated_at)}
          </p>
        </div>
        <span
          className={`inline-flex items-center self-start rounded-full px-3 py-1 text-sm font-semibold ${
            material.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {material.is_active ? 'Active' : 'Inactive'}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
            <p className="mt-1 text-sm text-gray-600">
              Core identifiers and commercial settings for this material entry.
            </p>
          </div>
          <dl className="grid gap-x-6 gap-y-5 px-6 py-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {material.category?.name ?? '—'}
                {material.category?.code ? (
                  <span className="ml-1 text-xs text-gray-400">({material.category.code})</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Standard</dt>
              <dd className="mt-1 text-sm text-gray-900">{material.standard ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Base Cost</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {material.cost_per_kg_base != null
                  ? `$${material.cost_per_kg_base.toFixed(2)} per kg`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Supplier Reference</dt>
              <dd className="mt-1 text-sm text-gray-900">{material.supplier_ref ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(material.created_at)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(material.updated_at)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Availability</h2>
          </div>
          <div className="space-y-4 px-6 py-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Allowed Regions</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableRegions.length > 0 ? (
                  availableRegions.map((region) => (
                    <span
                      key={region}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                    >
                      {region}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">Not specified</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Aliases</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {aliases.length > 0 ? (
                  aliases.map((alias) => (
                    <span
                      key={alias.id}
                      className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                    >
                      {alias.alias}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">No alternate names</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Processes</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {processes.length > 0 ? (
                  processes.map((process) => (
                    <span
                      key={process}
                      className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                    >
                      {process}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">No process tags</span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Mechanical Properties</h2>
        </div>
        <dl className="grid gap-x-6 gap-y-5 px-6 py-6 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Density</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {material.density_kg_m3 != null
                ? `${numberOrDash(material.density_kg_m3, { maximumFractionDigits: 1 })} kg/m³`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Machinability Index</dt>
            <dd className="mt-1 text-sm text-gray-900">{numberOrDash(material.machinability_index)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Hardness (HB)</dt>
            <dd className="mt-1 text-sm text-gray-900">{numberOrDash(material.hardness_hb)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Tensile Strength (MPa)</dt>
            <dd className="mt-1 text-sm text-gray-900">{numberOrDash(material.tensile_mpa)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Melting Point (°C)</dt>
            <dd className="mt-1 text-sm text-gray-900">{numberOrDash(material.melting_c)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Region Multipliers</h2>
              <p className="mt-1 text-sm text-gray-600">
                Additional pricing modifiers applied by region. Defaults to 1.00 when not specified.
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-6">
          {multipliers.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Region
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Multiplier
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white text-sm">
                  {multipliers.map((multiplier) => (
                    <tr key={multiplier.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{multiplier.region}</td>
                      <td className="px-4 py-3 text-gray-700">{formatRegionMultiplier(multiplier.multiplier)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No custom multipliers configured yet.</p>
          )}
        </div>
      </section>

      {material.composition_json && Object.keys(material.composition_json).length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Composition</h2>
          </div>
          <div className="overflow-x-auto px-6 py-6">
            <pre className="max-h-80 overflow-auto rounded-md bg-gray-900 p-4 text-xs text-gray-100">
              {JSON.stringify(material.composition_json, null, 2)}
            </pre>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Machine Mappings</h2>
          <p className="mt-1 text-sm text-gray-600">
            Machines configured to run this material along with baseline cutting speeds.
          </p>
        </div>
        <div className="px-6 py-6">
          {material.machine_materials && material.machine_materials.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Machine
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Process Type
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Cutting Speed (m/min)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white text-sm">
                  {material.machine_materials.map((mapping) => (
                    <tr key={mapping.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{mapping.machine.name}</td>
                      <td className="px-4 py-3 text-gray-700">{mapping.machine.process_type}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {mapping.cutting_speed_m_min != null
                          ? numberOrDash(mapping.cutting_speed_m_min, {
                              maximumFractionDigits: 0,
                            })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No machine mappings have been created yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}
