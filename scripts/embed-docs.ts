#!/usr/bin/env ts-node
/**
 * Embedding pipeline script
 * Chunks documents, generates embeddings via Ollama BGE-M3, and stores in Postgres+pgvector
 * 
 * Usage:
 *   pnpm tsx scripts/embed-docs.ts --type materials
 *   pnpm tsx scripts/embed-docs.ts --type finishes --org-id <uuid>
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.DATABASE_URL || 'http://localhost:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'bge-m3';

// Chunk size for text splitting (characters)
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

interface EmbedRequest {
  docType: string;
  docId: string;
  docTitle: string;
  docContent: string;
  docUrl?: string;
  orgId?: string;
}

interface ChunkData {
  docType: string;
  docId: string;
  docTitle: string;
  docContent: string;
  docUrl?: string;
  chunkIndex: number;
  chunkTotal: number;
  orgId?: string;
}

/**
 * Split text into overlapping chunks
 */
function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start >= text.length) break;
  }
  
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Generate embedding via Ollama
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  return data.embedding;
}

/**
 * Upsert chunk embedding to Postgres
 */
async function upsertEmbedding(supabase: any, chunk: ChunkData, embedding: number[]) {
  const { error } = await supabase
    .from('document_embeddings')
    .upsert({
      doc_type: chunk.docType,
      doc_id: chunk.docId,
      doc_title: chunk.docTitle,
      doc_content: chunk.docContent,
      doc_url: chunk.docUrl,
      chunk_index: chunk.chunkIndex,
      chunk_total: chunk.chunkTotal,
      embedding: `[${embedding.join(',')}]`, // pgvector format
      model_name: EMBEDDING_MODEL,
      org_id: chunk.orgId || null,
    }, {
      onConflict: 'doc_type,doc_id,chunk_index',
    });

  if (error) {
    console.error('Upsert error:', error);
    throw error;
  }
}

/**
 * Process a single document
 */
async function processDocument(supabase: any, doc: EmbedRequest) {
  console.log(`Processing: ${doc.docType}/${doc.docId} - ${doc.docTitle}`);
  
  // Chunk the content
  const chunks = chunkText(doc.docContent);
  console.log(`  Split into ${chunks.length} chunks`);
  
  // Generate embeddings and upsert
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    console.log(`  Chunk ${i + 1}/${chunks.length} (${chunkText.length} chars)...`);
    
    const embedding = await generateEmbedding(chunkText);
    console.log(`  Generated embedding (${embedding.length} dimensions)`);
    
    await upsertEmbedding(supabase, {
      docType: doc.docType,
      docId: doc.docId,
      docTitle: doc.docTitle,
      docContent: chunkText,
      docUrl: doc.docUrl,
      chunkIndex: i,
      chunkTotal: chunks.length,
      orgId: doc.orgId,
    }, embedding);
    
    console.log(`  Upserted chunk ${i + 1}/${chunks.length}`);
  }
  
  console.log(`✓ Completed: ${doc.docTitle}\n`);
}

/**
 * Load sample documents (replace with your actual data sources)
 */
async function loadDocuments(type: string): Promise<EmbedRequest[]> {
  const docsDir = path.join(__dirname, '../docs');
  
  // Example: Load from markdown files or database
  // For now, return sample data
  
  if (type === 'materials') {
    return [
      {
        docType: 'material',
        docId: 'aluminum-6061',
        docTitle: 'Aluminum 6061',
        docContent: `Aluminum 6061 is a precipitation-hardened aluminum alloy containing magnesium and silicon. 
        Excellent mechanical properties and corrosion resistance. Widely used for structural applications, 
        marine fittings, furniture, and general machining. Machinability rating: 4/5. 
        Typical applications: aircraft fittings, marine hardware, bicycle frames, camera lenses.
        Properties: Tensile strength 310 MPa, Yield strength 276 MPa, Hardness 95 Brinell.
        Weldability: Excellent with TIG/MIG. Corrosion resistance: Good in most environments.`,
        docUrl: '/materials/aluminum-6061',
      },
      {
        docType: 'material',
        docId: 'stainless-304',
        docTitle: 'Stainless Steel 304',
        docContent: `304 stainless steel is an austenitic chromium-nickel alloy. Excellent corrosion resistance,
        high strength, and good formability. Most widely used stainless grade. Non-magnetic in annealed condition.
        Typical applications: food processing equipment, kitchen appliances, chemical containers, architectural trim.
        Properties: Tensile strength 515 MPa, Yield strength 205 MPa. Machinability: 3/5 (work hardens).
        Weldability: Excellent. Temperature range: -196°C to 870°C. Food-safe and biocompatible.`,
        docUrl: '/materials/stainless-304',
      },
    ];
  }
  
  if (type === 'finishes') {
    return [
      {
        docType: 'finish',
        docId: 'anodize-type-ii',
        docTitle: 'Anodize Type II (Standard)',
        docContent: `Type II anodizing creates a thin, hard, corrosion-resistant oxide layer on aluminum parts.
        Layer thickness: 0.0002-0.001 inches. Available colors: clear, black, red, blue, gold.
        Improves wear resistance and provides decorative finish. RoHS compliant. Lead time: 3-5 days.
        Typical applications: consumer electronics, sporting goods, architectural components.
        Compatible materials: Aluminum 6061, 7075, 5052. Not recommended for welded parts (color mismatch).`,
        docUrl: '/finishes/anodize-type-ii',
      },
    ];
  }
  
  // Add more document types as needed
  return [];
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const typeArg = args.find(a => a.startsWith('--type='))?.split('=')[1];
  const orgIdArg = args.find(a => a.startsWith('--org-id='))?.split('=')[1];
  
  if (!typeArg) {
    console.error('Usage: pnpm tsx scripts/embed-docs.ts --type=<materials|finishes|tolerances> [--org-id=<uuid>]');
    process.exit(1);
  }
  
  console.log(`Embedding pipeline started for type: ${typeArg}`);
  console.log(`Ollama host: ${OLLAMA_HOST}`);
  console.log(`Embedding model: ${EMBEDDING_MODEL}\n`);
  
  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // Load documents
  const docs = await loadDocuments(typeArg);
  console.log(`Loaded ${docs.length} documents\n`);
  
  // Process each document
  for (const doc of docs) {
    if (orgIdArg) {
      doc.orgId = orgIdArg;
    }
    await processDocument(supabase, doc);
  }
  
  console.log(`\n✓ Embedding pipeline completed. Processed ${docs.length} documents.`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
