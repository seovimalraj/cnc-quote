# AI/ML Integration Guide

This document describes the AI/ML infrastructure for the CNC Quote platform.

## Architecture Overview

```
┌─────────────────┐
│   Web Client    │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ NestJS   │──────► OpenAI Proxy Controller (/v1/*)
    │   API    │         │
    └────┬─────┘         │
         │               ├──► Ollama (local models)
         │               └──► LiteLLM (unified gateway)
         │
         ├──► CAD Service (FastAPI + OpenCascade)
         │     └──► Feature Extraction
         │
         └──► Postgres + pgvector
               └──► Semantic Search
```

## Components

### 1. Ollama (Local LLM Server)

**Setup:**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
./scripts/ollama-pull.sh
# or manually:
ollama pull qwen2.5:7b-instruct
ollama pull llava:7b
ollama pull bge-m3
```

**Verify:**
```bash
curl http://localhost:11434/api/version
```

**Models:**
- `qwen2.5:7b-instruct` - General text generation (7B params)
- `llava:7b` - Vision + language (image analysis)
- `bge-m3` - Embeddings (1024 dimensions)

### 2. LiteLLM Proxy (OpenAI Gateway)

**Purpose:** Provides OpenAI-compatible API that routes to multiple backends

**Setup:**
```bash
# Start LiteLLM + Qdrant
docker-compose -f docker-compose.litellm.yml up -d

# Check health
curl http://localhost:4000/health
```

**Configuration:** See `litellm-config.yaml`

**Usage:**
```bash
# Chat completion
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer sk-1234" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-7b-instruct",
    "messages": [{"role": "user", "content": "Explain CNC milling"}]
  }'
```

### 3. OpenAI Proxy Controller (NestJS)

**Endpoints:**
- `POST /v1/chat/completions` - Chat with LLM
- `POST /v1/embeddings` - Generate embeddings

**Example:**
```typescript
// From your frontend
const response = await fetch('/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'qwen2.5:7b-instruct',
    messages: [{ role: 'user', content: 'What is aluminum 6061?' }]
  })
});
```

### 4. Document Embeddings + Semantic Search

**Setup pgvector:**
```bash
# Run migration
psql $DATABASE_URL -f sql/migrations/20251025_pgvector_embeddings.sql
```

**Generate embeddings:**
```bash
# Embed materials documentation
pnpm tsx scripts/embed-docs.ts --type=materials

# Embed finishes
pnpm tsx scripts/embed-docs.ts --type=finishes

# With org isolation
pnpm tsx scripts/embed-docs.ts --type=tolerances --org-id=<uuid>
```

**Query semantic search:**
```sql
-- Find similar documents
SELECT 
  doc_title,
  doc_content,
  1 - (embedding <=> '[0.1, 0.2, ...]'::vector) AS similarity
FROM document_embeddings
WHERE doc_type = 'material'
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

**From NestJS:**
```typescript
const embedding = await this.ollama.embed('aluminum corrosion resistance');
const results = await this.supabase
  .rpc('match_documents', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 5
  });
```

### 5. CAD Feature Extraction (OpenCascade)

**FastAPI Service:**
```bash
# Install dependencies
cd apps/cad-service
pip install fastapi uvicorn python-multipart OCP numpy

# Run service
python cad_features.py
# or
uvicorn cad_features:app --host 0.0.0.0 --port 8001 --reload
```

**Extract features:**
```bash
curl -X POST http://localhost:8001/extract-features \
  -F "file=@part.step"
```

**Response:**
```json
{
  "success": true,
  "features": {
    "dim_x": 100.5,
    "dim_y": 50.2,
    "dim_z": 25.1,
    "volume": 126432.5,
    "surface_area": 12543.2,
    "face_count": 24,
    "edge_count": 48,
    "complexity_score": 0.342
  },
  "feature_vector": [100.5, 50.2, 25.1, ...]
}
```

### 6. ML-Based Pricing (LightGBM)

**Train model:**
```bash
# Prepare training data (CSV with CAD features + prices)
# Columns: dim_x, dim_y, dim_z, volume, face_count, ..., material_id, quantity, price

python scripts/train-pricing-model.py \
  --data training_data.csv \
  --output models/pricing_model.txt \
  --test-split 0.2
```

**Use in production:**
```python
import lightgbm as lgb

# Load model
model = lgb.Booster(model_file='models/pricing_model.txt')

# Predict price
features = [100.5, 50.2, 25.1, ...]  # From CAD extraction
price = model.predict([features])[0]
```

**Integration flow:**
```
1. User uploads STEP file
2. CAD service extracts features
3. Features + material + quantity → LightGBM
4. Model predicts base price
5. Apply markups/adjustments
6. Return quote to user
```

## Environment Variables

```bash
# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen2.5:7b-instruct
OLLAMA_EMBEDDING_MODEL=bge-m3

# LiteLLM
LITELLM_MASTER_KEY=sk-1234
LITELLM_DATABASE_URL=postgresql://...

# CAD Service
CAD_SERVICE_URL=http://localhost:8001

# Supabase (for pgvector)
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Production Deployment

1. **Run Ollama on VPS:**
   ```bash
   ollama serve --host 0.0.0.0
   ```

2. **Start LiteLLM proxy:**
   ```bash
   docker-compose -f docker-compose.litellm.yml up -d
   ```

3. **Deploy CAD service:**
   ```bash
   # Docker or systemd
   uvicorn cad_features:app --host 0.0.0.0 --port 8001
   ```

4. **Run embedding pipeline:**
   ```bash
   pnpm tsx scripts/embed-docs.ts --type=materials
   pnpm tsx scripts/embed-docs.ts --type=finishes
   ```

5. **Train pricing model:**
   ```bash
   python scripts/train-pricing-model.py --data historical_quotes.csv
   ```

## Performance Considerations

- **Ollama:** ~7B models need 8-16GB RAM, GPU optional but recommended
- **LiteLLM:** Lightweight, ~100MB RAM
- **pgvector HNSW:** Sub-second search on 100K+ vectors
- **LightGBM:** <1ms prediction latency

## Monitoring

- LiteLLM dashboard: `http://localhost:4000/ui`
- Qdrant dashboard: `http://localhost:6333/dashboard`
- CAD service health: `http://localhost:8001/health`

## Next Steps

1. Integrate pricing model into `PricingEngineV2Service`
2. Add RAG (Retrieval Augmented Generation) for DFM suggestions
3. Fine-tune models on internal data
4. Add A/B testing for ML predictions vs rule-based pricing
