# Quick Commands Reference

## 🚀 Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start API (dev mode)
pnpm --filter @cnc-quote/api start:dev

# Start web app
pnpm --filter @cnc-quote/web dev

# Run tests
pnpm test
```

## 🤖 AI/ML Setup

```bash
# 1. Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Pull models (one command)
./scripts/ollama-pull.sh

# Or manually:
ollama pull qwen2.5:7b-instruct
ollama pull llava:7b
ollama pull bge-m3

# 3. Start Ollama
ollama serve

# 4. Verify
curl http://localhost:11434/api/version
```

## 🗄️ Database

```bash
# Enable pgvector
psql $DATABASE_URL -f sql/migrations/20251025_pgvector_embeddings.sql

# Generate embeddings
pnpm tsx scripts/embed-docs.ts --type=materials
pnpm tsx scripts/embed-docs.ts --type=finishes
```

## 🧪 Testing AI/ML

```bash
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
    "input": "aluminum properties"
  }'

# CAD feature extraction
curl -X POST http://localhost:8001/extract-features \
  -F "file=@part.step"
```

## 🐳 Docker

```bash
# Start LiteLLM + Qdrant
docker-compose -f docker-compose.litellm.yml up -d

# Start all services (main)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all
docker-compose down
```

## 🔨 Build & Deploy

```bash
# Full production build
pnpm build

# Build API only
pnpm --filter @cnc-quote/api build

# Build web only
pnpm --filter @cnc-quote/web build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## 🔍 Debugging

```bash
# Check module loading
cd apps/api && node dist/apps/api/src/main.js

# Check API health
curl http://localhost:3000/health

# Check Ollama status
curl http://localhost:11434/api/tags

# View API logs
tail -f apps/api/logs/combined.log
```

## 📦 ML Training

```bash
# Train pricing model
python scripts/train-pricing-model.py \
  --data historical_quotes.csv \
  --output models/pricing_v1.txt

# Start CAD service
cd apps/cad-service
pip install -r requirements.txt
python cad_features.py
```

## 🧹 Cleanup

```bash
# Clean build artifacts
pnpm clean

# Kill processes
pkill -f "node.*main.js"
pkill -f ollama

# Remove node_modules
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
```

## 📝 Git

```bash
# Check status
git status

# View recent commits
git log --oneline -10

# Latest commit
git show HEAD

# Push to remote
git push origin main
```

## 🔐 Environment

```bash
# Copy example
cp .env.example .env

# Required variables:
# OLLAMA_HOST=http://localhost:11434
# OLLAMA_DEFAULT_MODEL=qwen2.5:7b-instruct
# OLLAMA_EMBEDDING_MODEL=bge-m3
# DATABASE_URL=postgresql://...
# SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
```

## 📚 Documentation

- **Quick Start:** [`AI_ML_QUICKSTART.md`](./AI_ML_QUICKSTART.md)
- **Full Guide:** [`docs/AI_ML_INTEGRATION.md`](./docs/AI_ML_INTEGRATION.md)
- **Production Status:** [`PRODUCTION_READY_FEATURES.md`](./PRODUCTION_READY_FEATURES.md)
- **API Docs:** http://localhost:3000/api/docs

---

**Tip:** Bookmark this file for quick reference during development!
