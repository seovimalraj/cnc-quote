interface SloMeasurement {
  duration: number;
  success: boolean;
  error?: any;
}

interface SloMetrics {
  p50: number;
  p95: number;
  failures: number;
  totalRuns: number;
}

interface SloConfig {
  name: string;
  target_p95: number;
  measurements: SloMeasurement[];
}

export class SloCalculator {
  private slos: SloConfig[];

  constructor() {
    this.slos = [];
  }

  addSlo(name: string, target_p95: number) {
    this.slos.push({
      name,
      target_p95,
      measurements: []
    });
  }

  addMeasurement(sloName: string, measurement: SloMeasurement) {
    const slo = this.slos.find(s => s.name === sloName);
    if (!slo) throw new Error(`SLO ${sloName} not found`);
    slo.measurements.push(measurement);
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  calculateMetrics(): Record<string, SloMetrics> {
    const results: Record<string, SloMetrics> = {};

    for (const slo of this.slos) {
      const successfulDurations = slo.measurements
        .filter(m => m.success)
        .map(m => m.duration);

      results[slo.name] = {
        p50: this.calculatePercentile(successfulDurations, 50),
        p95: this.calculatePercentile(successfulDurations, 95),
        failures: slo.measurements.filter(m => !m.success).length,
        totalRuns: slo.measurements.length
      };
    }

    return results;
  }

  verifyThresholds(): boolean {
    const metrics = this.calculateMetrics();
    let allPassed = true;

    for (const slo of this.slos) {
      const metric = metrics[slo.name];
      if (metric.p95 > slo.target_p95) {
        console.error(`SLO ${slo.name} failed: P95 ${metric.p95}ms exceeds target ${slo.target_p95}ms`);
        allPassed = false;
      }
    }

    return allPassed;
  }
}
