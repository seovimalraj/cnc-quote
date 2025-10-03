/**
 * Formula Syntax Guide Component
 * Reference documentation for formula DSL
 */

import React from 'react';

export const FormulaSyntaxGuide: React.FC = () => {
  return (
    <div className="p-6 bg-gray-50 border rounded">
      <h3 className="text-lg font-semibold mb-4">Formula DSL Syntax Guide</h3>

      {/* Context Variables */}
      <div className="mb-6">
        <h4 className="font-medium mb-2">Context Variables</h4>
        <div className="space-y-1 text-sm font-mono bg-white p-3 rounded">
          <div><span className="text-blue-600">area_m2</span> / <span className="text-blue-600">sa</span> - Surface area in m²</div>
          <div><span className="text-blue-600">volume_cm3</span> / <span className="text-blue-600">v_cm3</span> - Volume in cm³</div>
          <div><span className="text-blue-600">qty</span> - Quantity</div>
          <div><span className="text-blue-600">material</span> - Material code (e.g., "AL6061", "SS304")</div>
          <div><span className="text-blue-600">region</span> - Region code ("US", "EU", "IN", "CN")</div>
          <div><span className="text-blue-600">color</span> - Finish color param</div>
          <div><span className="text-blue-600">finish_grade</span> - Finish grade param</div>
          <div><span className="text-blue-600">setup_minutes</span> - Setup time estimate</div>
          <div><span className="text-blue-600">run_minutes_per_part</span> - Run time per part</div>
        </div>
      </div>

      {/* Helper Functions */}
      <div className="mb-6">
        <h4 className="font-medium mb-2">Helper Functions</h4>
        
        <div className="space-y-4">
          <div className="bg-white p-3 rounded">
            <p className="font-mono text-sm text-green-600 mb-1">
              tiered(value, tiers[])
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Tiered pricing lookup based on value thresholds
            </p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`tiered(sa, [
  {upTo: 0.1, price: 18},
  {upTo: 0.5, price: 35},
  {upTo: 2.0, price: 90},
  {upTo: 10.0, price: 280}
])
// Returns 18 if sa ≤ 0.1
// Returns 35 if 0.1 < sa ≤ 0.5
// Returns 90 if 0.5 < sa ≤ 2.0
// Returns 280 if 2.0 < sa ≤ 10.0`}
            </pre>
          </div>

          <div className="bg-white p-3 rounded">
            <p className="font-mono text-sm text-green-600 mb-1">
              regionMult(region, processCode)
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Region-specific multiplier (default: US=1.0, EU=1.15, IN=0.85, CN=0.75)
            </p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`regionMult(region, "ANODIZE")
// Returns 1.0 for US
// Returns 1.15 for EU
// Returns 0.85 for IN
// Returns 0.75 for CN`}
            </pre>
          </div>

          <div className="bg-white p-3 rounded">
            <p className="font-mono text-sm text-green-600 mb-1">
              hazardFee(material)
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Special material handling fee
            </p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`hazardFee(material)
// Returns 25 for Titanium
// Returns 50 for Beryllium
// Returns 15 for Inconel
// Returns 0 for other materials`}
            </pre>
          </div>
        </div>
      </div>

      {/* Math Functions */}
      <div className="mb-6">
        <h4 className="font-medium mb-2">Math Utilities</h4>
        <div className="bg-white p-3 rounded">
          <div className="grid grid-cols-3 gap-2 text-sm font-mono">
            <div>ceil(x)</div>
            <div>floor(x)</div>
            <div>round(x)</div>
            <div>max(a, b)</div>
            <div>min(a, b)</div>
            <div>abs(x)</div>
            <div>sqrt(x)</div>
            <div>pow(x, y)</div>
          </div>
        </div>
      </div>

      {/* Operators */}
      <div className="mb-6">
        <h4 className="font-medium mb-2">Operators</h4>
        <div className="bg-white p-3 rounded">
          <div className="grid grid-cols-4 gap-2 text-sm font-mono">
            <div>+ - * /</div>
            <div>%</div>
            <div>&gt; &lt; &gt;= &lt;=</div>
            <div>=== !==</div>
            <div>&& ||</div>
            <div>? :</div>
          </div>
        </div>
      </div>

      {/* Example Formulas */}
      <div>
        <h4 className="font-medium mb-2">Example Formulas</h4>
        <div className="space-y-3">
          <div className="bg-white p-3 rounded">
            <p className="text-sm font-semibold mb-1">Bead Blast Cost</p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto font-mono">
{`tiered(sa,[
  {upTo:0.1,price:18},
  {upTo:0.5,price:35},
  {upTo:2.0,price:90}
]) * qty * regionMult(region,"BEAD_BLAST")`}
            </pre>
          </div>

          <div className="bg-white p-3 rounded">
            <p className="text-sm font-semibold mb-1">Anodize with Color Multiplier</p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto font-mono">
{`tiered(sa,[
  {upTo:0.1,price:25},
  {upTo:0.5,price:55}
]) * qty * (color==="black"?1.1:1) * regionMult(region,"ANODIZE")`}
            </pre>
          </div>

          <div className="bg-white p-3 rounded">
            <p className="text-sm font-semibold mb-1">Lead Time with Area Penalty</p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto font-mono">
{`ceil(3 + (sa > 0.5 ? 2 : 0) + (qty > 50 ? 1 : 0))`}
            </pre>
          </div>
        </div>
      </div>

      {/* Security Notes */}
      <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm font-semibold text-yellow-800 mb-1">Security Notes</p>
        <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1">
          <li>Formulas are executed in a sandbox with 50ms timeout</li>
          <li>Unsafe patterns (eval, Function, require, etc.) are blocked</li>
          <li>Maximum formula length: 2000 characters</li>
          <li>Helper functions are frozen to prevent tampering</li>
        </ul>
      </div>
    </div>
  );
};
