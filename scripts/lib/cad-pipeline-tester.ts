import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

interface TimingMetrics {
  uploadStart: number;
  uploadEnd: number;
  analysisStart: number;
  analysisEnd: number;
  gltfStart: number;
  gltfEnd: number;
}

interface TestResult {
  success: boolean;
  fileId: string;
  requestId: string;
  timings: {
    uploadDuration: number;
    analysisDuration: number;
    gltfDuration: number;
    totalDuration: number;
  };
  metrics: {
    bbox?: [number, number, number];
    volume_cm3?: number;
    surface_area_cm2?: number;
    [key: string]: any;
  };
  gltfUri?: string;
  error?: any;
}

export class CadPipelineTester {
  private supabase;
  private apiUrl: string;
  private token: string;
  private timings: TimingMetrics;

  constructor(supabaseUrl: string, supabaseKey: string, apiUrl: string, token: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.apiUrl = apiUrl;
    this.token = token;
    this.timings = {
      uploadStart: 0,
      uploadEnd: 0,
      analysisStart: 0,
      analysisEnd: 0,
      gltfStart: 0,
      gltfEnd: 0
    };
  }

  private async uploadFile(filePath: string): Promise<string> {
    this.timings.uploadStart = Date.now();
    
    // Get file metadata
    const fileName = path.basename(filePath);
    const fileContent = await fs.readFile(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    // Get upload URL
    const { data: { url, fields }, error: urlError } = await this.supabase
      .storage
      .from('cad-files')
      .createSignedUpload(fileName);

    if (urlError) throw new Error(`Failed to get signed URL: ${urlError.message}`);

    // Upload to storage
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append('file', new Blob([fileContent]));

    await axios.post(url, formData);

    // Create file record in DB
    const { data: file, error: dbError } = await this.supabase
      .from('files')
      .insert({
        name: fileName,
        type: fileExt.replace('.', ''),
        size: fileContent.length,
        storage_path: `cad-files/${fileName}`
      })
      .select()
      .single();

    if (dbError) throw new Error(`Failed to create file record: ${dbError.message}`);

    this.timings.uploadEnd = Date.now();
    return file.id;
  }

  private async startAnalysis(fileId: string): Promise<string> {
    this.timings.analysisStart = Date.now();
    
    const response = await axios.post(
      `${this.apiUrl}/api/cad/analyze`,
      { fileId },
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.jobId;
  }

  private async pollAnalysis(fileId: string): Promise<void> {
    while (true) {
      const { data: file } = await this.supabase
        .from('files')
        .select('cad_metrics')
        .eq('id', fileId)
        .single();

      if (file?.cad_metrics) {
        this.timings.analysisEnd = Date.now();
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async verifyGltf(fileId: string): Promise<string> {
    this.timings.gltfStart = Date.now();

    // Get GLTF URL
    const response = await axios.get(
      `${this.apiUrl}/api/cad/${fileId}/gltf`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );

    const gltfUri = response.data.url;

    // Verify we can download it
    const gltfResponse = await axios.get(gltfUri, {
      responseType: 'arraybuffer'
    });

    if (gltfResponse.status !== 200) {
      throw new Error(`Failed to download GLTF: ${gltfResponse.status}`);
    }

    // Verify it's a valid GLTF file (basic header check)
    const buffer = Buffer.from(gltfResponse.data);
    const header = buffer.toString('ascii', 0, 4);
    if (header !== 'glTF') {
      throw new Error('Invalid GLTF file format');
    }

    this.timings.gltfEnd = Date.now();
    return gltfUri;
  }

  async runTest(filePath: string): Promise<TestResult> {
    try {
      // Reset timings
      this.timings = {
        uploadStart: 0,
        uploadEnd: 0,
        analysisStart: 0,
        analysisEnd: 0,
        gltfStart: 0,
        gltfEnd: 0
      };

      // Run pipeline
      const fileId = await this.uploadFile(filePath);
      const jobId = await this.startAnalysis(fileId);
      await this.pollAnalysis(fileId);
      const gltfUri = await this.verifyGltf(fileId);

      // Get final metrics
      const { data: file } = await this.supabase
        .from('files')
        .select('cad_metrics')
        .eq('id', fileId)
        .single();

      // Calculate durations
      const timings = {
        uploadDuration: this.timings.uploadEnd - this.timings.uploadStart,
        analysisDuration: this.timings.analysisEnd - this.timings.analysisStart,
        gltfDuration: this.timings.gltfEnd - this.timings.gltfStart,
        totalDuration: this.timings.gltfEnd - this.timings.uploadStart
      };

      return {
        success: true,
        fileId,
        requestId: jobId,
        timings,
        metrics: file.cad_metrics,
        gltfUri
      };

    } catch (error: any) {
      return {
        success: false,
        fileId: '',
        requestId: '',
        timings: {
          uploadDuration: 0,
          analysisDuration: 0,
          gltfDuration: 0,
          totalDuration: 0
        },
        metrics: {},
        error: {
          message: error.message,
          response: error.response?.data
        }
      };
    }
  }

  static async writeReport(results: TestResult[], outputPath: string) {
    await fs.writeFile(
      outputPath,
      JSON.stringify(results, null, 2)
    );
  }
}
