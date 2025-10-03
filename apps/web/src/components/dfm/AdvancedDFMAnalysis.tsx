import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  AlertCircle,
  CheckCircle,
  TrendingDown,
  Sparkles,
  Zap,
  DollarSign,
  Clock,
  AlertTriangle,
  Info,
  Lightbulb,
  Package,
  Layers,
  Settings,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AdvancedDFMAnalysisProps {
  partData: {
    name: string;
    material: string;
    dimensions: { x: number; y: number; z: number };
    volume: number;
    surfaceArea: number;
    features: {
      holes?: Array<{ id: string; diameter: number; depth: number }>;
      pockets?: Array<{ id: string; depth: number; width: number }>;
      threads?: Array<{ id: string; size: string; depth: number }>;
      thinWalls?: Array<{ location: string; thickness: number }>;
      complexity: number;
    };
    tolerance: string;
    finish: string;
    quantity: number;
    process: string;
    application?: string;
  };
  onOptimizationApplied?: (optimization: any) => void;
}

export function AdvancedDFMAnalysis({ partData, onOptimizationApplied }: AdvancedDFMAnalysisProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    analyzePartAdvanced();
  }, [partData]);

  const analyzePartAdvanced = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dfm/analyze-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(partData),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Advanced DFM analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 animate-pulse text-purple-500" />
            AI-Powered DFM Analysis
          </CardTitle>
          <CardDescription>Analyzing your part with AI and ML...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Analysis Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={analyzePartAdvanced} variant="outline" className="mt-4">
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI-Powered DFM Analysis
            </CardTitle>
            <CardDescription>Comprehensive design analysis with ML insights</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3 w-3" />
              AI Enhanced
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overview Scores */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className={cn('border-2', getScoreBgColor(analysis.manufacturabilityScore))}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className={cn('text-3xl font-bold', getScoreColor(analysis.manufacturabilityScore))}>
                  {analysis.manufacturabilityScore}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Manufacturability</div>
                <Progress value={analysis.manufacturabilityScore} className="mt-2 h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className={cn('border-2', getScoreBgColor(analysis.costEfficiency))}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className={cn('text-3xl font-bold', getScoreColor(analysis.costEfficiency))}>
                  {analysis.costEfficiency}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Cost Efficiency</div>
                <Progress value={analysis.costEfficiency} className="mt-2 h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="text-center">
                <Badge className={cn('text-base px-4 py-1', getRiskColor(analysis.qualityRisk))}>
                  {analysis.qualityRisk.toUpperCase()}
                </Badge>
                <div className="text-sm text-muted-foreground mt-2">Quality Risk</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Summary */}
        {analysis.aiInsights?.summary && (
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-purple-900">{analysis.aiInsights.summary}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="material">Material</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="cost">Cost</TabsTrigger>
            <TabsTrigger value="process">Process</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Critical Issues */}
            {analysis.aiInsights?.criticalIssues?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Critical Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.aiInsights.criticalIssues.map((issue: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Quick Wins */}
            {analysis.aiInsights?.quickWins?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Quick Wins
                  </CardTitle>
                  <CardDescription>Easy improvements for immediate cost savings</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {analysis.aiInsights.quickWins.map((win: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-sm">{win}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => onOptimizationApplied?.({ suggestion: win, type: 'quick-win' })}
                          >
                            Apply
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Material Tab */}
          <TabsContent value="material" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Material: {analysis.materialAnalysis.currentMaterial}</CardTitle>
                <CardDescription>
                  {analysis.materialAnalysis.isOptimal ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Optimal choice for this application
                    </span>
                  ) : (
                    <span className="text-yellow-600 flex items-center gap-1">
                      <Info className="h-4 w-4" />
                      Consider alternative materials
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              {analysis.materialAnalysis.compatibilityIssues?.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Compatibility Issues:</p>
                    <ul className="space-y-1">
                      {analysis.materialAnalysis.compatibilityIssues.map((issue: string, idx: number) => (
                        <li key={idx} className="text-sm text-red-600 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Material Alternatives */}
            {analysis.materialAnalysis.alternatives?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Alternative Materials</h3>
                {analysis.materialAnalysis.alternatives.map((alt: any, idx: number) => (
                  <Card key={idx} className="hover:border-purple-300 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{alt.material}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{alt.reason}</p>
                        </div>
                        <Badge variant="outline">{alt.score}/100</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Cost Impact:</span>
                          <span className={cn('ml-2 font-medium', alt.costImpact < 0 ? 'text-green-600' : 'text-red-600')}>
                            {alt.costImpact > 0 ? '+' : ''}
                            {alt.costImpact}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Performance:</span>
                          <span className="ml-2 font-medium">{alt.performanceImpact}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() => onOptimizationApplied?.({ material: alt.material, type: 'material' })}
                      >
                        Switch to {alt.material}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-4">
            {/* Holes */}
            {analysis.featureAnalysis.holes?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Holes ({analysis.featureAnalysis.holes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.featureAnalysis.holes.map((hole: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-sm">
                            <span className="font-medium">Ø{hole.diameter}mm</span>
                            <span className="text-muted-foreground mx-2">×</span>
                            <span>{hole.depth}mm deep</span>
                          </div>
                          <Badge variant={hole.toolingCost === 'high' ? 'destructive' : 'outline'}>
                            {hole.toolingCost} cost
                          </Badge>
                        </div>
                        {hole.issues?.length > 0 && (
                          <div className="space-y-1">
                            {hole.issues.map((issue: string, i: number) => (
                              <p key={i} className="text-xs text-red-600 flex items-start gap-1">
                                <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                {issue}
                              </p>
                            ))}
                          </div>
                        )}
                        {hole.suggestions?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {hole.suggestions.map((suggestion: string, i: number) => (
                              <p key={i} className="text-xs text-blue-600 flex items-start gap-1">
                                <Lightbulb className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                {suggestion}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pockets */}
            {analysis.featureAnalysis.pockets?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pockets ({analysis.featureAnalysis.pockets.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.featureAnalysis.pockets.map((pocket: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-sm">
                            <span className="font-medium">{pocket.width}mm wide</span>
                            <span className="text-muted-foreground mx-2">×</span>
                            <span>{pocket.depth}mm deep</span>
                          </div>
                          <div className="text-right text-xs">
                            <div>Difficulty: {pocket.toolingDifficulty}/100</div>
                            <Progress value={pocket.toolingDifficulty} className="w-20 h-1 mt-1" />
                          </div>
                        </div>
                        {pocket.issues?.length > 0 && (
                          <div className="space-y-1">
                            {pocket.issues.map((issue: string, i: number) => (
                              <p key={i} className="text-xs text-yellow-600 flex items-start gap-1">
                                <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                {issue}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Thin Walls */}
            {analysis.featureAnalysis.thinWalls?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Thin Walls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.featureAnalysis.thinWalls.map((wall: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-sm">
                            <span className="font-medium">{wall.location}</span>
                            <span className="text-muted-foreground mx-2">—</span>
                            <span>{wall.thickness}mm thick</span>
                          </div>
                          <Badge className={getRiskColor(wall.risk)}>{wall.risk} risk</Badge>
                        </div>
                        {wall.suggestions?.map((suggestion: string, i: number) => (
                          <p key={i} className="text-xs text-blue-600 mt-2 flex items-start gap-1">
                            <Lightbulb className="h-3 w-3 flex-shrink-0 mt-0.5" />
                            {suggestion}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Cost Tab */}
          <TabsContent value="cost" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cost Optimization Opportunities
                </CardTitle>
                <CardDescription>
                  Potential savings: {analysis.costOptimization.potentialSavings}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Savings Summary */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Current Estimate</span>
                    <span className="text-lg font-bold">${analysis.costOptimization.currentEstimate}</span>
                  </div>
                  <TrendingDown className="h-6 w-6 text-green-600 mx-auto my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-700">Optimized Estimate</span>
                    <span className="text-xl font-bold text-green-700">
                      ${analysis.costOptimization.optimizedEstimate.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-3">
                  {analysis.costOptimization.recommendations.map((rec: any, idx: number) => (
                    <Card key={idx} className="hover:border-green-300 transition-colors">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <Badge variant="outline" className="mb-2">
                              {rec.category}
                            </Badge>
                            <p className="text-sm">{rec.suggestion}</p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-lg font-bold text-green-600">-{rec.impact}%</div>
                            <div className="text-xs text-muted-foreground">{rec.effort} effort</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 w-full"
                          onClick={() => onOptimizationApplied?.(rec)}
                        >
                          Apply Optimization
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Process Tab */}
          <TabsContent value="process" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Manufacturing Process
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm text-muted-foreground">Primary Process:</span>
                  <span className="ml-2 font-medium">{analysis.processRecommendations.primaryProcess}</span>
                </div>

                {analysis.processRecommendations.secondaryProcesses?.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Secondary Processes:</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {analysis.processRecommendations.secondaryProcesses.map((proc: string, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {proc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Setup Time</div>
                      <div className="font-medium">{analysis.processRecommendations.estimatedSetupTime}h</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Machining Time</div>
                      <div className="font-medium">{analysis.processRecommendations.estimatedMachiningTime}h</div>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">Fixture Complexity:</span>
                  <Badge className="ml-2" variant={analysis.processRecommendations.fixtureComplexity === 'complex' ? 'destructive' : 'outline'}>
                    {analysis.processRecommendations.fixtureComplexity}
                  </Badge>
                </div>

                {analysis.processRecommendations.toolingRequirements?.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground block mb-2">Tooling Requirements:</span>
                    <ul className="space-y-1">
                      {analysis.processRecommendations.toolingRequirements.map((tool: string, idx: number) => (
                        <li key={idx} className="text-sm flex items-center gap-2">
                          <Package className="h-3 w-3" />
                          {tool}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tolerance Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tolerance Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Current Tolerance:</span>
                  <span className="ml-2 font-medium">{analysis.toleranceAnalysis.current}</span>
                  {!analysis.toleranceAnalysis.isRealistic && (
                    <Badge variant="destructive" className="ml-2">
                      Unrealistic
                    </Badge>
                  )}
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">Cost Impact:</span>
                  <span className="ml-2 font-medium">{analysis.toleranceAnalysis.costImpact}</span>
                </div>

                {analysis.toleranceAnalysis.alternativeTolerance && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-900 mb-1">Recommendation:</p>
                    <p className="text-sm text-green-800">
                      Use {analysis.toleranceAnalysis.alternativeTolerance} to save{' '}
                      {analysis.toleranceAnalysis.savings}%
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() =>
                        onOptimizationApplied?.({
                          tolerance: analysis.toleranceAnalysis.alternativeTolerance,
                          type: 'tolerance',
                        })
                      }
                    >
                      Apply Tolerance
                    </Button>
                  </div>
                )}

                {analysis.toleranceAnalysis.recommendations?.length > 0 && (
                  <div className="space-y-2">
                    {analysis.toleranceAnalysis.recommendations.map((rec: string, idx: number) => (
                      <p key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                        <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        {rec}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-6 border-t">
          <Button onClick={analyzePartAdvanced} variant="outline" className="flex-1">
            Re-analyze
          </Button>
          <Button className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <Sparkles className="h-4 w-4 mr-2" />
            Apply All Optimizations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
