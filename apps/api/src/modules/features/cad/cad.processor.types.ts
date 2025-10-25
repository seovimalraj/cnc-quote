export interface CadAnalysisJobResult {
  status: string;
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
  features: {
    holes: number;
    pockets: number;
  };
  estimatedMachiningTime: number; // minutes
}

export interface CadConversionJobResult {
  status: string;
  outputFormat: string;
  outputPath: string;
}

export type CadJobResult = CadAnalysisJobResult | CadConversionJobResult;

export interface CadConversionJobData {
  targetFormat: string;
}
