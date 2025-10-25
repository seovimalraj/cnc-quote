# Quick Start: AI/ML Integration

## 🚀 What's New

We've added production-ready AI/ML infrastructure for:
- **Local LLM inference** (Ollama + BGE-M3 embeddings)
- **Semantic search** (Postgres + pgvector)
- **ML-based pricing** (LightGBM + CAD features)
- **OpenAI-compatible API** (unified gateway)

## ⚡ Quick Setup (5 minutes)

### 1. Install & Start Ollama

```bash
# Install
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
./scripts/ollama-pull.sh

# Verify
curl http://localhost:11434/api/version
```

### 2. Setup Database (pgvector)

```bash
# Run migration
psql $DATABASE_URL -f sql/migrations/20251025_pgvector_embeddings.sql
```

### 3. Generate Embeddings

```bash
# Embed materials, finishes, etc.
pnpm tsx scripts/embed-docs.ts --type=materials
pnpm tsx scripts/embed-docs.ts --type=finishes
```

### 4. Test API

```bash
# Start API
pnpm --filter @cnc-quote/api start:dev

# Test chat
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:7b-instruct",
    "messages": [{"role": "user", "content": "Explain CNC tolerances"}]
  }'

# Test embeddings
curl -X POST http://localhost:3000/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "bge-m3",
    "input": "aluminum 6061 properties"
  }'
```

## 🎯 Use Cases

### Semantic Search (RAG)
```typescript
// Search materials by description
const embedding = await fetch('/v1/embeddings', {
  method: 'POST',
  body: JSON.stringify({ input: 'corrosion resistant metal' })
});

const results = await supabase.rpc('match_documents', {
  query_embedding: embedding.data[0].embedding,
  match_count: 5
});
```

### DFM Suggestions
```typescript
// Get design optimization suggestions
const response = await fetch('/v1/chat/completions', {
  method: 'POST',
  body: JSON.stringify({
    model: 'qwen2.5:7b-instruct',
    messages: [{
      role: 'system',
      content: 'You are a CNC manufacturing expert. Suggest cost optimizations.'
    }, {
      role: 'user',
      content: `Part: Aluminum 6061, 100x50x25mm, tolerance ±0.05mm, quantity 100`
    }]
  })
});
```

### ML Pricing
```bash
# Extract CAD features
curl -X POST http://localhost:8001/extract-features \
  -F "file=@part.step"

# Train pricing model
python scripts/train-pricing-model.py \
  --data historical_quotes.csv \
  --output models/pricing_v1.txt

# Use in production (integrate with PricingEngineV2Service)
```

## 📦 Optional: LiteLLM Gateway

For unified routing to multiple LLM backends:

```bash
# Start LiteLLM + Qdrant
docker-compose -f docker-compose.litellm.yml up -d

# Configure NestJS to route through LiteLLM
# Update OLLAMA_HOST=http://localhost:4000 in .env
```

## 📚 Full Documentation

- **AI/ML Integration:** [`docs/AI_ML_INTEGRATION.md`](./docs/AI_ML_INTEGRATION.md)
- **Ollama Setup:** [`docs/runbooks/ollama-setup.md`](./docs/runbooks/ollama-setup.md)
- **API Reference:** OpenAPI at `/api/docs`

## 🏗️ Architecture

```
User → NestJS API → /v1/* (OpenAI proxy)
                  ├─→ Ollama (qwen2.5, llava, bge-m3)
                  ├─→ LiteLLM (optional gateway)
                  └─→ CAD Service (FastAPI + OpenCascade)
                  
Data → Postgres+pgvector → Semantic Search
Features → LightGBM → ML Pricing
```

## ⚙️ Environment Variables

```bash
# .env
OLLAMA_HOST=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen2.5:7b-instruct
OLLAMA_EMBEDDING_MODEL=bge-m3
CAD_SERVICE_URL=http://localhost:8001
```

## 🎓 Next Steps

1. **Integrate ML pricing** into `PricingEngineV2Service`
2. **Add RAG** for intelligent DFM suggestions
3. **Fine-tune** models on your data
4. **A/B test** ML vs rule-based pricing

---

**Questions?** See full docs or open an issue.
