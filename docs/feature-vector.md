# MongoDB Atlas Vector Search Index — CrmKnowledge

Tạo index **một lần** trên MongoDB Atlas để bật `$vectorSearch` cho AI tư vấn CRM.

## Bước 1: Vào Atlas



## Bước 2: Cấu hình index

- **Database**: database của project (theo `DB_URL`)
- **Collection**: `crmknowledges`
- **Index name**: `crm_knowledge_vector_index` (khớp `VECTOR_SEARCH_INDEX` trong `.env`)

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "trangThai"
    }
  ]
}
```

## Bước 3: Biến môi trường

```env
GEMINI_API_KEY=your_gemini_api_key
VECTOR_SEARCH_INDEX=crm_knowledge_vector_index
VECTOR_SIMILARITY_THRESHOLD=0.6
GEMINI_CHAT_MODEL=gemini-2.0-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
```

## Lưu ý

- Embedding model `text-embedding-004` sinh vector **768 chiều** — phải khớp `numDimensions`.
- Nếu chưa tạo index, backend tự **fallback** tính cosine similarity trong Node.js (chậm hơn, dùng dev/test).
- Sau khi admin tạo bài CRM, document phải có field `embedding` mới search được.
