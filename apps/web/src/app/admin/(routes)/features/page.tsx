import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { PlusIcon } from '@heroicons/react/20/solid'
import { FeatureType, FeatureRule } from '@cnc-quote/shared'

export default async function FeaturesPage() {
  const supabase = createClient(cookies())
  
  // Get all feature types with their rules
  const { data: featureTypes }: { data: (FeatureType & { machine_feature_rules: (FeatureRule & { machine: { name: string; process_type: string } })[] })[] | null } = await supabase
    .from('feature_types')
    .select(`
      *,
      machine_feature_rules(
        *,
        machine:machines(
          name,
          process_type
        )
      ),
      sheet_features(
        *,
        machine:machines(
          name,
          process_type
        )
      ),
      im_features(
        *,
        machine:machines(
          name,
          process_type
        )
      )
    `)
    .order('type')

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Feature Rules</h1>
          <p className="mt-2 text-sm text-gray-700">
            Define manufacturing features and their machine-specific rules
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5 inline-block" aria-hidden="true" />
            Add Feature Type
          </button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            {featureTypes?.map((feature) => (
              <div 
                key={feature.id}
                className="mb-8 overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg"
              >
                <div className="px-4 py-5 sm:px-6 bg-gray-50">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">
                    {feature.name}
                    <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {feature.type}
                    </span>
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    {feature.description}
                  </p>
                </div>

                {/* CNC Rules */}
                {feature.machine_feature_rules?.length > 0 && (
                  <div className="border-t border-gray-200">
                    <div className="px-4 py-5 sm:p-6">
                      <h4 className="text-sm font-semibold text-gray-900">CNC Rules</h4>
                      <div className="mt-4">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead>
                            <tr>
                              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Machine</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Complexity</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Dimensions</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Time</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Multiplier</th>
                              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {feature.machine_feature_rules.map((rule) => (
                              <tr key={rule.id}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900">
                                  {rule.machine.name}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {rule.complexity}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {rule.min_dimension}-{rule.max_dimension}mm
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  +{rule.setup_time_minutes}m setup, +{rule.cycle_time_minutes}m cycle
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {rule.cost_multiplier}×
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                  <button
                                    type="button"
                                    className="text-primary hover:text-primary/80"
                                  >
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sheet Metal Rules */}
                {feature.sheet_features?.length > 0 && (
                  <div className="border-t border-gray-200">
                    <div className="px-4 py-5 sm:p-6">
                      <h4 className="text-sm font-semibold text-gray-900">Sheet Metal Rules</h4>
                      <div className="mt-4">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead>
                            <tr>
                              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Machine</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Thickness</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Specs</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Time</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Multiplier</th>
                              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {feature.sheet_features.map((rule) => (
                              <tr key={rule.id}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900">
                                  {rule.machine.name}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {rule.thickness_range}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  R{rule.min_bend_radius}mm, {rule.max_bend_angle}°
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  +{rule.setup_time_minutes}m setup, +{rule.cycle_time_minutes}m cycle
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {rule.cost_multiplier}×
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                  <button
                                    type="button"
                                    className="text-primary hover:text-primary/80"
                                  >
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Injection Molding Rules */}
                {feature.im_features?.length > 0 && (
                  <div className="border-t border-gray-200">
                    <div className="px-4 py-5 sm:p-6">
                      <h4 className="text-sm font-semibold text-gray-900">Injection Molding Rules</h4>
                      <div className="mt-4">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead>
                            <tr>
                              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Machine</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Complexity</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Wall Thickness</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Draft</th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Multiplier</th>
                              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {feature.im_features.map((rule) => (
                              <tr key={rule.id}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900">
                                  {rule.machine.name}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {rule.complexity}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {rule.min_wall_thickness}-{rule.max_wall_thickness}mm
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {rule.draft_angle}°
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {rule.cost_multiplier}×
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                  <button
                                    type="button"
                                    className="text-primary hover:text-primary/80"
                                  >
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
