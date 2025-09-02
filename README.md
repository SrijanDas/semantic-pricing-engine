# Semantic Pricing Engine

### Embedding + Database Design

-   Using pgvector with Supabase
-   Cosine similarity for semantic search
-   Dimension: text-embedding-3-small (1536)

### Schema Design

```sql
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    material_name TEXT NOT NULL,
    description TEXT NOT NULL,
    embedding vector(1536),
    unit_price DECIMAL NOT NULL,
    unit TEXT NOT NULL,
    quality_score FLOAT,
    region TEXT NOT NULL,
    source TEXT NOT NULL,
    vendor TEXT,
    vat_rate FLOAT,
    updated_at TIMESTAMP
);


CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    transcript TEXT NOT NULL,
    total_estimate DECIMAL NOT NULL,
    confidence_score FLOAT NOT NULL,
    created_at TIMESTAMP
);

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES quotes(id),
    label TEXT NOT NULL,
    material_ids INTEGER[] NOT NULL,
    estimated_duration NUMBER NOT NULL,
    margin_protected_price DECIMAL NOT NULL,
    confidence_score FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT TIMESTAMP
);

CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES quotes(quote_id),
    task_id INTEGER,
    verdict TEXT NOT NULL,
    user_type TEXT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP
);
```

### Test Script

```bash
# Create a quote
curl -X POST http://localhost:3000/api/generate-proposal \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Need materials for bathroom renovation including tiles"}'

# Get similar materials
curl -X POST http://localhost:3000/api/materials \
  -H "Content-Type: application/json" \
  -d '{"query": "ceramic floor tiles"}'

# Submit feedback
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "quote_id": "quote_123",
    "verdict": "accurate",
    "user_type": "contractor",
    "comment": "Prices match market rates"
  }'
```
