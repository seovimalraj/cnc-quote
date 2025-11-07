import type { ReactNode } from 'react'
import Link from 'next/link'
import { PlusIcon } from '@heroicons/react/20/solid'
import { createClient } from '@/lib/supabase/server'
import { REGION_OPTIONS, formatRegionMultiplier } from './utils'

type MaterialCategory = {
  id: string
  code: string
  name: string
}

type MaterialListItem = {
  id: string
  code: string
  name: string
  is_active: boolean
  updated_at: string
  cost_per_kg_base: number | null
  available_regions: string[] | null
  category?: {
    code: string | null
    name: string | null
  } | null
  region_multipliers?: {
    region: string
    multiplier: number
  }[] | null
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'all', label: 'All' },
  { value: 'inactive', label: 'Inactive' },
]

function getQueryParam(searchParams: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = searchParams?.[key]
  if (!value) return undefined
  if (Array.isArray(value)) return value[0]
  return value
}

const MATERIAL_LIST_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function formatUpdatedAt(timestamp: string) {
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) {
    return timestamp
  }

  return MATERIAL_LIST_DATE_FORMATTER.format(parsed)
}

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const supabase = await createClient()

  const [categoriesResponse] = await Promise.all([
    supabase
      .from('material_categories')
      .select('id, code, name')
      .order('name', { ascending: true }),
  ])

  const categories: MaterialCategory[] = categoriesResponse.data ?? []

  const search = (getQueryParam(searchParams, 'q') ?? '').trim()
  const status = getQueryParam(searchParams, 'status') || 'active'
  const region = getQueryParam(searchParams, 'region')
  const categoryCode = getQueryParam(searchParams, 'category')

  const materialsQuery = supabase
    .from('material_properties')
    .select(
      `
        id,
        code,
        name,
        is_active,
        updated_at,
        cost_per_kg_base,
        available_regions,
        category:material_categories ( code, name ),
        region_multipliers:material_region_multipliers ( region, multiplier )
      `
    )
    .order('name', { ascending: true })

  if (status === 'active') {
    materialsQuery.eq('is_active', true)
  } else if (status === 'inactive') {
    materialsQuery.eq('is_active', false)
  }

  if (search) {
    materialsQuery.or(`code.ilike.%${search}%,name.ilike.%${search}%`)
  }

  if (region && REGION_OPTIONS.includes(region as typeof REGION_OPTIONS[number])) {
    materialsQuery.contains('available_regions', [region])
  }

  if (categoryCode) {
    const category = categories.find((item) => item.code === categoryCode)
    if (category) {
      materialsQuery.eq('category_id', category.id)
    }
  }

  const { data: materialsData, error } = await materialsQuery

  // Mock data fallback if Supabase fails
  let materials: MaterialListItem[] = []
  
  if (error) {
    console.error('Failed to load materials from DB, using mock data:', error.message)
    // Use mock data
    materials = [
      {
        id: 'mock-1',
        code: 'AL-6061',
        name: 'Aluminum 6061-T6',
        is_active: true,
        updated_at: new Date().toISOString(),
        cost_per_kg_base: 8.50,
        available_regions: ['US', 'EU', 'ASIA'],
        category: { code: 'aluminum', name: 'Aluminum' },
        region_multipliers: [
          { region: 'US', multiplier: 1.0 },
          { region: 'EU', multiplier: 1.15 },
          { region: 'ASIA', multiplier: 0.95 },
        ],
      },
      {
        id: 'mock-2',
        code: 'AL-7075',
        name: 'Aluminum 7075-T6',
        is_active: true,
        updated_at: new Date().toISOString(),
        cost_per_kg_base: 12.75,
        available_regions: ['US', 'EU'],
        category: { code: 'aluminum', name: 'Aluminum' },
        region_multipliers: [
          { region: 'US', multiplier: 1.0 },
          { region: 'EU', multiplier: 1.2 },
        ],
      },
      {
        id: 'mock-3',
        code: 'SS-304',
        name: 'Stainless Steel 304',
        is_active: true,
        updated_at: new Date().toISOString(),
        cost_per_kg_base: 15.25,
        available_regions: ['US', 'EU', 'ASIA'],
        category: { code: 'stainless', name: 'Stainless Steel' },
        region_multipliers: [
          { region: 'US', multiplier: 1.0 },
          { region: 'EU', multiplier: 1.1 },
          { region: 'ASIA', multiplier: 0.9 },
        ],
      },
      {
        id: 'mock-4',
        code: 'SS-316',
        name: 'Stainless Steel 316',
        is_active: true,
        updated_at: new Date().toISOString(),
        cost_per_kg_base: 18.50,
        available_regions: ['US', 'EU'],
        category: { code: 'stainless', name: 'Stainless Steel' },
        region_multipliers: [
          { region: 'US', multiplier: 1.0 },
          { region: 'EU', multiplier: 1.15 },
        ],
      },
      {
        id: 'mock-5',
        code: 'TI-6AL4V',
        name: 'Titanium Ti-6Al-4V',
        is_active: true,
        updated_at: new Date().toISOString(),
        cost_per_kg_base: 85.00,
        available_regions: ['US'],
        category: { code: 'titanium', name: 'Titanium' },
        region_multipliers: [
          { region: 'US', multiplier: 1.0 },
        ],
      },
      {
        id: 'mock-6',
        code: 'BRASS-360',
        name: 'Brass C360',
        is_active: true,
        updated_at: new Date().toISOString(),
        cost_per_kg_base: 22.50,
        available_regions: ['US', 'EU', 'ASIA'],
        category: { code: 'brass', name: 'Brass & Copper' },
        region_multipliers: [
          { region: 'US', multiplier: 1.0 },
          { region: 'EU', multiplier: 1.05 },
          { region: 'ASIA', multiplier: 0.92 },
        ],
      },
      {
        id: 'mock-7',
        code: 'ABS',
        name: 'Plastic ABS',
        is_active: true,
        updated_at: new Date().toISOString(),
        cost_per_kg_base: 3.50,
        available_regions: ['US', 'EU', 'ASIA'],
        category: { code: 'plastic', name: 'Plastics' },
        region_multipliers: [
          { region: 'US', multiplier: 1.0 },
          { region: 'EU', multiplier: 1.08 },
          { region: 'ASIA', multiplier: 0.85 },
        ],
      },
      {
        id: 'mock-8',
        code: 'NYLON-PA6',
        name: 'Nylon PA6',
        is_active: false,
        updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        cost_per_kg_base: 5.25,
        available_regions: ['US'],
        category: { code: 'plastic', name: 'Plastics' },
        region_multipliers: [
          { region: 'US', multiplier: 1.0 },
        ],
      },
    ]
  } else {
    materials = (materialsData ?? []).map((row) => {
      const category = Array.isArray(row.category) ? row.category[0] ?? null : row.category
      const regionMultipliers = Array.isArray(row.region_multipliers)
        ? row.region_multipliers
        : row.region_multipliers ?? []

      return {
        id: row.id,
        code: row.code,
        name: row.name,
        is_active: row.is_active,
        updated_at: row.updated_at,
        cost_per_kg_base: row.cost_per_kg_base,
        available_regions: row.available_regions,
        category: category ? { code: category.code ?? null, name: category.name ?? null } : null,
        region_multipliers: regionMultipliers,
      } as MaterialListItem
    })
  }
  const appliedFilters = Boolean(search || region || (status && status !== 'active') || categoryCode)

  return (
    <div className="p-6 space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materials</h1>
          <p className="mt-2 text-sm text-gray-700">
            Inspect material pricing, regional multipliers, and availability controls.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/admin/catalog/materials/new"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            Add Material
          </Link>
        </div>
      </div>

      <form className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-4" method="GET">
        <div className="md:col-span-2">
          <label htmlFor="materials-search" className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <input
            id="materials-search"
            name="q"
            type="search"
            placeholder="Search by code or name"
            defaultValue={search}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={categoryCode || ''}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.code}>
                {category.name} ({category.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="region" className="block text-sm font-medium text-gray-700">
            Region
          </label>
          <select
            id="region"
            name="region"
            defaultValue={region || ''}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
          >
            <option value="">All regions</option>
            {REGION_OPTIONS.map((regionOption) => (
              <option key={regionOption} value={regionOption}>
                {regionOption}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 lg:col-span-4 flex items-center justify-end gap-3">
          {appliedFilters && (
            <Link
              href="/admin/catalog/materials"
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </Link>
          )}
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
          >
            Apply filters
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
                Material
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Category
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Regions &amp; Multipliers
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Cost Base ($/kg)
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Last Updated
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-6 text-right text-sm font-semibold text-gray-900">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {materials.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                  {appliedFilters
                    ? 'No materials match the selected filters yet.'
                    : 'No materials found. Add your first material to get started.'}
                </td>
              </tr>
            )}

            {materials.map((material) => {
              const multipliers = material.region_multipliers ?? []
              const availableRegions = material.available_regions ?? []

              let regionBadges: ReactNode[]

              if (multipliers.length > 0) {
                regionBadges = multipliers.map((entry) => (
                  <span
                    key={`${material.id}-${entry.region}`}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                  >
                    <span className="font-semibold text-gray-900">{entry.region}</span>
                    <span className="ml-1 text-gray-500">{formatRegionMultiplier(entry.multiplier)}</span>
                  </span>
                ))
              } else if (availableRegions.length > 0) {
                regionBadges = availableRegions.map((regionCode) => (
                  <span
                    key={`${material.id}-${regionCode}`}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                  >
                    {regionCode}
                  </span>
                ))
              } else {
                regionBadges = [
                  <span key="no-regions" className="text-xs text-gray-400">
                    No regional overrides
                  </span>,
                ]
              }

              return (
                <tr key={material.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-gray-900">
                    <div className="space-y-1">
                      <Link
                        href={`/admin/catalog/materials/${material.id}`}
                        className="text-primary hover:text-primary/80"
                      >
                        {material.name}
                      </Link>
                      <div className="text-xs text-gray-500">{material.code}</div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
                    {material.category?.name ?? '—'}
                    {material.category?.code ? (
                      <span className="ml-1 text-xs text-gray-400">({material.category.code})</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-700">
                    <div className="flex flex-wrap gap-2">{regionBadges}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
                    {material.cost_per_kg_base != null ? material.cost_per_kg_base.toFixed(2) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
                    {formatUpdatedAt(material.updated_at)}
                  </td>
                  <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        material.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {material.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
