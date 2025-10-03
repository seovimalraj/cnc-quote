"use client";

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Clock,
  Zap,
  Shield,
  Droplet,
  Thermometer,
  Weight,
  ChevronDown,
  ChevronUp,
  Star
} from 'lucide-react';

interface Material {
  id: string;
  name: string;
  category: 'metal' | 'plastic' | 'composite';
  basePrice: number; // per cubic inch
  leadTimeDays: number;
  machinability: number; // 0-10
  strength: number; // 0-10
  corrosionResistance: number; // 0-10
  weightDensity: number; // g/cm³
  heatResistance: number; // °C
  commonUses: string[];
  stockAvailable: boolean;
  color?: string;
}

interface MaterialComparisonProps {
  currentMaterial?: string;
  partVolume?: number; // cubic inches
  quantity?: number;
  onMaterialChange?: (materialId: string) => void;
}

const MATERIALS: Material[] = [
  {
    id: 'al-6061',
    name: 'Aluminum 6061-T6',
    category: 'metal',
    basePrice: 2.50,
    leadTimeDays: 5,
    machinability: 9,
    strength: 7,
    corrosionResistance: 8,
    weightDensity: 2.7,
    heatResistance: 205,
    commonUses: ['Aerospace', 'Automotive', 'General machining'],
    stockAvailable: true,
    color: '#C0C0C0'
  },
  {
    id: 'al-7075',
    name: 'Aluminum 7075-T6',
    category: 'metal',
    basePrice: 4.20,
    leadTimeDays: 7,
    machinability: 7,
    strength: 9,
    corrosionResistance: 6,
    weightDensity: 2.8,
    heatResistance: 230,
    commonUses: ['Aerospace', 'High-stress components'],
    stockAvailable: true,
    color: '#B8B8B8'
  },
  {
    id: 'al-6063',
    name: 'Aluminum 6063',
    category: 'metal',
    basePrice: 2.10,
    leadTimeDays: 5,
    machinability: 10,
    strength: 5,
    corrosionResistance: 9,
    weightDensity: 2.7,
    heatResistance: 205,
    commonUses: ['Extrusions', 'Architectural', 'Low-stress parts'],
    stockAvailable: true,
    color: '#D3D3D3'
  },
  {
    id: 'ss-304',
    name: 'Stainless Steel 304',
    category: 'metal',
    basePrice: 3.80,
    leadTimeDays: 6,
    machinability: 6,
    strength: 8,
    corrosionResistance: 10,
    weightDensity: 8.0,
    heatResistance: 900,
    commonUses: ['Food industry', 'Marine', 'Chemical'],
    stockAvailable: true,
    color: '#E8E8E8'
  },
  {
    id: 'ss-316',
    name: 'Stainless Steel 316',
    category: 'metal',
    basePrice: 4.50,
    leadTimeDays: 7,
    machinability: 5,
    strength: 8,
    corrosionResistance: 10,
    weightDensity: 8.0,
    heatResistance: 900,
    commonUses: ['Marine', 'Medical', 'Chemical processing'],
    stockAvailable: true,
    color: '#F0F0F0'
  },
  {
    id: 'brass',
    name: 'Brass C360',
    category: 'metal',
    basePrice: 5.20,
    leadTimeDays: 6,
    machinability: 10,
    strength: 6,
    corrosionResistance: 7,
    weightDensity: 8.5,
    heatResistance: 450,
    commonUses: ['Fittings', 'Decorative', 'Electrical'],
    stockAvailable: true,
    color: '#B5A642'
  },
  {
    id: 'abs',
    name: 'ABS Plastic',
    category: 'plastic',
    basePrice: 1.20,
    leadTimeDays: 3,
    machinability: 9,
    strength: 4,
    corrosionResistance: 8,
    weightDensity: 1.05,
    heatResistance: 105,
    commonUses: ['Prototypes', 'Consumer products', 'Housings'],
    stockAvailable: true,
    color: '#FFE5B4'
  },
  {
    id: 'delrin',
    name: 'Delrin (Acetal)',
    category: 'plastic',
    basePrice: 1.80,
    leadTimeDays: 4,
    machinability: 10,
    strength: 6,
    corrosionResistance: 9,
    weightDensity: 1.42,
    heatResistance: 110,
    commonUses: ['Gears', 'Bushings', 'Precision parts'],
    stockAvailable: true,
    color: '#FFFACD'
  },
  {
    id: 'peek',
    name: 'PEEK',
    category: 'plastic',
    basePrice: 15.50,
    leadTimeDays: 10,
    machinability: 7,
    strength: 8,
    corrosionResistance: 10,
    weightDensity: 1.32,
    heatResistance: 260,
    commonUses: ['Medical implants', 'Aerospace', 'High-temp'],
    stockAvailable: false,
    color: '#F5DEB3'
  }
];

export function LiveMaterialComparison({ 
  currentMaterial = 'al-6061',
  partVolume = 5,
  quantity = 1,
  onMaterialChange
}: Readonly<MaterialComparisonProps>) {
  const [sortBy, setSortBy] = useState<'price' | 'leadTime' | 'strength'>('price');
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'metal' | 'plastic'>('all');

  const current = useMemo(() => 
    MATERIALS.find(m => m.id === currentMaterial) || MATERIALS[0],
    [currentMaterial]
  );

  const filteredMaterials = useMemo(() => {
    let filtered = MATERIALS.filter(m => 
      selectedCategory === 'all' || m.category === selectedCategory
    );

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'price') {
        return a.basePrice - b.basePrice;
      } else if (sortBy === 'leadTime') {
        return a.leadTimeDays - b.leadTimeDays;
      } else {
        return b.strength - a.strength;
      }
    });

    return showAllMaterials ? filtered : filtered.slice(0, 4);
  }, [selectedCategory, sortBy, showAllMaterials]);

  const calculatePrice = (material: Material) => {
    const materialCost = material.basePrice * partVolume * quantity;
    const setupCost = 150; // Base setup
    const laborMultiplier = (11 - material.machinability) * 0.1;
    const laborCost = (50 + materialCost * laborMultiplier);
    return materialCost + setupCost + laborCost;
  };

  const getPriceDiff = (material: Material) => {
    const currentPrice = calculatePrice(current);
    const newPrice = calculatePrice(material);
    const diff = ((newPrice - currentPrice) / currentPrice) * 100;
    return diff;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white">
        <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Live Material Comparison
        </h3>
        <p className="text-xs opacity-90">
          Real-time pricing for {quantity} {quantity === 1 ? 'part' : 'parts'} • {partVolume.toFixed(1)} in³ each
        </p>
      </div>

      {/* Current selection */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-500 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full border-2 border-gray-300" 
              style={{ backgroundColor: current.color }}
            />
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {current.name}
            </span>
            <Star className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              ${calculatePrice(current).toFixed(2)}
            </div>
            <div className="text-[10px] text-gray-500">Current Selection</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-xs text-gray-500 mb-1">Lead Time</div>
            <div className="flex items-center justify-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Clock className="w-3 h-3" />
              {current.leadTimeDays}d
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Strength</div>
            <div className="flex items-center justify-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Shield className="w-3 h-3" />
              {current.strength}/10
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Corrosion</div>
            <div className="flex items-center justify-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Droplet className="w-3 h-3" />
              {current.corrosionResistance}/10
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Density</div>
            <div className="flex items-center justify-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Weight className="w-3 h-3" />
              {current.weightDensity}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedCategory('metal')}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              selectedCategory === 'metal'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Metal
          </button>
          <button
            onClick={() => setSelectedCategory('plastic')}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              selectedCategory === 'plastic'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Plastic
          </button>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="price">Sort by Price</option>
          <option value="leadTime">Sort by Lead Time</option>
          <option value="strength">Sort by Strength</option>
        </select>
      </div>

      {/* Material alternatives */}
      <div className="space-y-2">
        {filteredMaterials.map((material) => {
          if (material.id === currentMaterial) return null;
          
          const priceDiff = getPriceDiff(material);
          const price = calculatePrice(material);
          const isCheaper = priceDiff < 0;
          const isSignificant = Math.abs(priceDiff) > 5;

          return (
            <button
              key={material.id}
              onClick={() => onMaterialChange?.(material.id)}
              className="w-full p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full border border-gray-300" 
                    style={{ backgroundColor: material.color }}
                  />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {material.name}
                  </span>
                  {!material.stockAvailable && (
                    <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] rounded">
                      Special Order
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    ${price.toFixed(2)}
                  </div>
                  {isSignificant && (
                    <div className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${
                      isCheaper ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {isCheaper ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <TrendingUp className="w-3 h-3" />
                      )}
                      {Math.abs(priceDiff).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {material.leadTimeDays}d
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {material.strength}/10
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {material.machinability}/10
                </span>
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3" />
                  {material.heatResistance}°C
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Show more/less button */}
      {MATERIALS.filter(m => 
        selectedCategory === 'all' || m.category === selectedCategory
      ).length > 4 && (
        <button
          onClick={() => setShowAllMaterials(!showAllMaterials)}
          className="w-full py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          {showAllMaterials ? (
            <>
              Show Less <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              Show More Materials <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
