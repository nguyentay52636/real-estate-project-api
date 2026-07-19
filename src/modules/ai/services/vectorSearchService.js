import logger from '#shared/utils/logger.js';
import { fetchCatalogFromApi, fetchCatalogWithEmbeddings } from './crmKnowledgeCatalogClient.js';
import { isFuzzyWordMatch } from '#shared/utils/fuzzyMatch.js';
import { embed, hasEmbeddingProvider } from './embeddingService.js';

const VECTOR_THRESHOLD = parseFloat(process.env.VECTOR_SIMILARITY_THRESHOLD || '0.6');
const TEXT_THRESHOLD = parseFloat(process.env.VECTOR_TEXT_SEARCH_THRESHOLD || '0.3');

// Từ đệm/hư từ tiếng Việt — gần như không bao giờ xuất hiện trong nội dung tin đăng BĐS,
// nếu tính vào tổng trọng số sẽ kéo điểm mọi property xuống dù chúng vô nghĩa với tìm kiếm.
const STOPWORDS = new Set([
  'là', 'và', 'có', 'không', 'được', 'này', 'đó', 'thì', 'mà', 'cho', 'với', 'của',
  'các', 'những', 'một', 'ở', 'tại', 'còn', 'nào', 'gì', 'ai', 'sao', 'thế', 'nhé',
  'ạ', 'nhỉ', 'à', 'ừ', 'vâng', 'dạ', 'tôi', 'mình', 'bạn', 'anh', 'chị', 'em',
  'muốn', 'cần', 'xem', 'giúp', 'làm', 'ơn', 'vui', 'lòng', 'cũng', 'đang', 'sẽ',
  'đã', 'hãy', 'nên', 'phải', 'nếu', 'khi', 'lúc', 'như', 'nữa', 'rồi',
]);

function getThresholdForMode(mode) {
  return mode === 'text' ? TEXT_THRESHOLD : VECTOR_THRESHOLD;
}

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function stripEmbedding(doc) {
  const { embedding, ...rest } = doc;
  return rest;
}

function docToWords(doc) {
  const haystack = [
    doc.tieuDe,
    doc.moTa,
    doc.diaChi,
    doc.quanHuyen,
    String(doc.phongNgu),
    String(doc.gia),
  ]
    .join(' ')
    .toLowerCase();

  return haystack
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
}

/**
 * Trọng số kiểu IDF: từ xuất hiện ở càng nhiều BĐS trong catalog thì càng ít giá trị phân biệt
 * (VD "quận" có ở mọi BĐS nên gần như vô nghĩa khi tính điểm khớp), từ càng hiếm/đặc trưng
 * (VD số quận cụ thể, tên tiện ích) thì trọng số càng cao.
 */
function buildTermWeigher(catalog) {
  const docCount = catalog.length;
  const df = new Map();

  for (const doc of catalog) {
    const uniqueWords = new Set(docToWords(doc));
    for (const w of uniqueWords) {
      df.set(w, (df.get(w) || 0) + 1);
    }
  }

  return (term) => {
    const freq = df.get(term) || 0;
    return Math.log((docCount + 1) / (freq + 1)) + 0.1;
  };
}

function scoreDocByText(doc, terms, weigh = () => 1) {
  const haystackWords = docToWords(doc);

  let matchedWeight = 0;
  let totalWeight = 0;

  for (const term of terms) {
    const w = weigh(term);
    totalWeight += w;

    // Khớp nguyên từ (không phải substring thô — tránh kiểu "là" lọt vào giữa chữ "làm");
    // không có mới rơi xuống fuzzy để chịu được lỗi gõ thiếu/thừa 1 ký tự.
    if (haystackWords.includes(term)) {
      matchedWeight += w;
    } else if (haystackWords.some((hw) => isFuzzyWordMatch(hw, term))) {
      matchedWeight += w;
    }
  }

  return { ...stripEmbedding(doc), score: totalWeight > 0 ? matchedWeight / totalWeight : 0 };
}

/** Tìm theo từ khóa trên danh sách catalog (từ API hoặc DB) */
function searchByText(query, catalog, { limit = 3 } = {}) {
  const terms = String(query)
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
    // Giữ lại số dù chỉ 1 chữ số (VD "2" trong "Quận 2") — số quận/phòng ngủ vẫn có nghĩa dù ngắn
    .filter((t) => (t.length >= 2 || /^\p{N}+$/u.test(t)) && !STOPWORDS.has(t));

  if (!terms.length || !catalog?.length) return [];

  const weigh = buildTermWeigher(catalog);

  return catalog
    .map((doc) => scoreDocByText(doc, terms, weigh))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Tìm theo ngữ nghĩa — so cosine similarity giữa embedding câu hỏi và embedding từng BĐS */
function searchByEmbedding(queryEmbedding, catalog, { limit = 3 } = {}) {
  return catalog
    .map((doc) => ({ ...stripEmbedding(doc), score: cosineSimilarity(queryEmbedding, doc.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Semantic search thật: embed câu hỏi rồi so cosine similarity với embedding đã lưu sẵn
 * của từng BĐS (được tạo lúc thêm/sửa tin — xem crmKnowledgeService.js).
 * Trả null nếu không đủ điều kiện (thiếu provider/embedding) để gọi code rơi xuống text search.
 */
async function trySemanticSearch(message, options) {
  if (!hasEmbeddingProvider()) return null;

  const catalog = await fetchCatalogWithEmbeddings();
  const withEmbeddings = catalog.filter((doc) => Array.isArray(doc.embedding) && doc.embedding.length);

  if (!withEmbeddings.length) {
    logger.debug('[VectorSearch] Chưa có BĐS nào có embedding — fallback text search');
    return null;
  }

  const queryEmbedding = await embed(message);
  const results = searchByEmbedding(queryEmbedding, withEmbeddings, options);
  return { results, mode: 'vector' };
}

/**
 * AI pipeline: ưu tiên semantic search (embedding + cosine similarity); nếu không khả dụng
 * hoặc lỗi (hết credit, thiếu provider...) thì rơi xuống tìm theo từ khóa trên catalog.
 */
async function searchProperties(message, options = {}) {
  try {
    const semanticResult = await trySemanticSearch(message, options);
    if (semanticResult) {
      logger.debug(`[VectorSearch] Semantic: ${semanticResult.results.length} kết quả`);
      return semanticResult;
    }
  } catch (error) {
    logger.warn(`[VectorSearch] Semantic search lỗi (${error.message}) — fallback text search`);
  }

  const catalog = await fetchCatalogFromApi();

  logger.debug(`[VectorSearch] Catalog từ API: ${catalog.length} bài`);

  if (!catalog.length) {
    return { results: [], mode: 'catalog' };
  }

  const results = searchByText(message, catalog, options);
  return { results, mode: 'text' };
}

export { searchByText, searchByEmbedding, searchProperties, cosineSimilarity, getThresholdForMode, VECTOR_THRESHOLD, TEXT_THRESHOLD, scoreDocByText };
export default { searchByText, searchByEmbedding, searchProperties, cosineSimilarity, getThresholdForMode, VECTOR_THRESHOLD, TEXT_THRESHOLD, scoreDocByText };