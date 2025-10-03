"use client";

import React, { useMemo } from 'react';
import { 
  Lightbulb, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  Zap,
  Package
} from 'lucide-react';
import type { Feature } from '../viewer/CadViewer3D';

interface SmartRecommendationsProps {
  features: Feature[];
  currentMaterial?: string;
  currentProcess?: string;
  currentQuantity?: number;
  partComplexity?: number;
}

interface Recommendation {
  id: string;
  type: 'cost' | 'speed' | 'quality' | 'material' | 'design';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  savingsPercent?: number;
  icon: React.ReactNode;
}

export function SmartRecommendations({ 
  features, 
  currentMaterial = 'Aluminum 6061',
  currentProcess = 'CNC',
  currentQuantity = 1,
  partComplexity = 0.5
}: Readonly<SmartRecommendationsProps>) {
  
  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];

    // Analyze features for recommendations
    const holes = features.filter(f => f.type === 'hole');
    const threads = features.filter(f => f.type === 'thread');
    const pockets = features.filter(f => f.type === 'pocket');
    const fillets = features.filter(f => f.type === 'fillet');

    // Small holes cost optimization
    const smallHoles = holes.filter(h => 
      h.properties?.diameter && h.properties.diameter < 3
    );
    if (smallHoles.length > 5) {
      recs.push({
        id: 'small-holes',
        type: 'cost',
        priority: 'high',
        title: 'Optimize Small Hole Diameters',
        description: `${smallHoles.length} holes are smaller than 3mm. Increasing to 3mm+ can reduce tool costs by 15-20%.`,
        impact: 'Reduce machining time and tool wear',
        savingsPercent: 18,
        icon: <TrendingDown className="w-4 h-4" />
      });
    }

    // Threading optimization
    if (threads.length > 3) {
      recs.push({
        id: 'threading',
        type: 'cost',
        priority: 'medium',
        title: 'Consider Press-Fit Inserts',
        description: `${threads.length} threaded features detected. Using press-fit inserts can reduce costs by 25% for low quantities.`,
        impact: 'Lower machining time, better thread quality',
        savingsPercent: 25,
        icon: <DollarSign className="w-4 h-4" />
      });
    }

    // Material alternative
    if (currentMaterial === 'Aluminum 6061' && partComplexity < 0.6) {
      recs.push({
        id: 'material-alt',
        type: 'material',
        priority: 'medium',
        title: 'Alternative Material: Aluminum 6063',
        description: 'For this part complexity, 6063 offers similar strength at 12% lower cost with better machinability.',
        impact: 'Cost savings without sacrificing quality',
        savingsPercent: 12,
        icon: <Package className="w-4 h-4" />
      });
    }

    // Quantity optimization
    if (currentQuantity < 10 && partComplexity > 0.5) {
      recs.push({
        id: 'quantity',
        type: 'cost',
        priority: 'high',
        title: 'Quantity Break at 10 Units',
        description: 'Unit price drops by 35% at 10 pieces. Consider ordering more to optimize cost per part.',
        impact: 'Significant per-unit savings',
        savingsPercent: 35,
        icon: <TrendingDown className="w-4 h-4" />
      });
    }

    // Deep pocket warning
    const deepPockets = pockets.filter(p => 
      p.properties?.depth && p.properties.depth > 50
    );
    if (deepPockets.length > 0) {
      recs.push({
        id: 'deep-pockets',
        type: 'design',
        priority: 'medium',
        title: 'Deep Pocket Optimization',
        description: `${deepPockets.length} pockets deeper than 50mm detected. Consider reducing depth or splitting operations.`,
        impact: 'Reduce cycle time by 20-30%',
        savingsPercent: 25,
        icon: <AlertTriangle className="w-4 h-4" />
      });
    }

    // Sharp corners recommendation
    const sharpFillets = fillets.filter(f => 
      f.properties?.radius && f.properties.radius < 1
    );
    if (sharpFillets.length > 10) {
      recs.push({
        id: 'fillets',
        type: 'quality',
        priority: 'low',
        title: 'Increase Fillet Radii',
        description: `${sharpFillets.length} fillets under 1mm radius. Increasing to 2mm+ improves tool life and reduces costs.`,
        impact: 'Better surface finish, lower tool wear',
        savingsPercent: 8,
        icon: <CheckCircle className="w-4 h-4" />
      });
    }

    // Lead time optimization
    if (currentQuantity > 20) {
      recs.push({
        id: 'lead-time',
        type: 'speed',
        priority: 'medium',
        title: 'Expedited Manufacturing Available',
        description: 'For quantities over 20, we can parallelize operations and reduce lead time by 40% for +15% cost.',
        impact: 'Get parts 5 days faster',
        icon: <Clock className="w-4 h-4" />
      });
    }

    // Process recommendation
    if (currentProcess === 'CNC' && partComplexity < 0.3 && currentQuantity > 50) {
      recs.push({
        id: 'process-sheet-metal',
        type: 'cost',
        priority: 'high',
        title: 'Consider Sheet Metal Fabrication',
        description: 'For simple geometries and higher quantities, sheet metal can reduce costs by 60%.',
        impact: 'Massive cost savings, faster production',
        savingsPercent: 60,
        icon: <Zap className="w-4 h-4" />
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [features, currentMaterial, currentProcess, currentQuantity, partComplexity]);

  const totalPotentialSavings = useMemo(() => {
    return recommendations
      .filter(r => r.savingsPercent)
      .reduce((sum, r) => sum + (r.savingsPercent || 0), 0);
  }, [recommendations]);

  if (recommendations.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Optimized Design
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No optimization recommendations at this time. Your part is well-designed for manufacturing!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with total savings */}
      <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Smart Recommendations
            </h3>
            <p className="text-xs opacity-90">
              AI-powered suggestions to optimize your quote
            </p>
          </div>
          {totalPotentialSavings > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold">↓{totalPotentialSavings}%</div>
              <div className="text-[10px] opacity-80">Potential Savings</div>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations list */}
      <div className="space-y-2">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer ${
              rec.priority === 'high'
                ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                : rec.priority === 'medium'
                ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg ${
                  rec.priority === 'high'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : rec.priority === 'medium'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }`}
              >
                {rec.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {rec.title}
                  </h4>
                  {rec.savingsPercent && (
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                      ↓{rec.savingsPercent}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {rec.description}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-500 italic">
                  💡 {rec.impact}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Apply recommendations CTA */}
      <button className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold text-sm hover:from-green-600 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
        <Zap className="w-4 h-4" />
        Apply All Recommendations
      </button>
    </div>
  );
}
