import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Material } from '@cnc-quote/shared'

export default async function MaterialDetailPage({
  params: { id }
}: {
  params: { id: string }
}) {
  const supabase = createClient(cookies())
  const { data: material }: { data: Material | null } = await supabase
    .from('materials')
    .select(`
      *,
      material_costing(*),
      machine_materials(
        *,
        machine:machines(*)
      )
    `)
    .eq('id', id)
    .single()

  if (!material) {
    notFound()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Material Details</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and edit material properties and configurations
          </p>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form action="/api/materials" method="POST" className="space-y-6">
            <input type="hidden" name="id" value={material.id} />
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  defaultValue={material.name}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <div className="mt-1">
                <select
                  id="category"
                  name="category"
                  defaultValue={material.category}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                >
                  <option value="metal">Metal</option>
                  <option value="plastic">Plastic</option>
                  <option value="composite">Composite</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="density" className="block text-sm font-medium text-gray-700">
                  Density (g/cm³)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    step="0.0001"
                    name="density"
                    id="density"
                    defaultValue={material.density}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cost_per_kg" className="block text-sm font-medium text-gray-700">
                  Cost per kg ($)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    step="0.01"
                    name="cost_per_kg"
                    id="cost_per_kg"
                    defaultValue={material.cost_per_kg}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900">Material Costing</h3>
              <div className="mt-4 space-y-4">
                {material.material_costing?.map((cost) => (
                  <div key={cost.id} className="grid grid-cols-1 gap-4 sm:grid-cols-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Type
                      </label>
                      <select
                        name={`costing[${index}].type`}
                        defaultValue={cost.costing_type}
                        className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                      >
                        <option value="volume">Volume</option>
                        <option value="weight">Weight</option>
                        <option value="area">Area</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Min Quantity
                      </label>
                      <input
                        type="number"
                        name={`costing[${index}].min`}
                        defaultValue={cost.min_quantity}
                        className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Max Quantity
                      </label>
                      <input
                        type="number"
                        name={`costing[${index}].max`}
                        defaultValue={cost.max_quantity}
                        className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Unit Cost ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name={`costing[${index}].cost`}
                        defaultValue={cost.unit_cost}
                        className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="rounded bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Add Cost Tier
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-end gap-x-3">
                <button
                  type="button"
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900">Machine Mappings</h3>
          <div className="mt-4 divide-y divide-gray-200">
            {material.machine_materials?.map((machineMaterial) => (
              <div key={machineMaterial.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{machineMaterial.machine.name}</h4>
                    <p className="text-sm text-gray-500">
                      Speed: {machineMaterial.cutting_speed_m_min} m/min
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Edit Mapping
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
