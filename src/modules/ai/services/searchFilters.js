/**
 * Trích tiêu chí tìm BĐS từ câu hỏi tiếng Việt: quận, giá, số phòng ngủ.
 */

import { DISTRICT_ADJACENCY } from './hcmcGeography.js';

const NAMED_DISTRICTS = Object.keys(DISTRICT_ADJACENCY)
  .filter((d) => !/^Quận \d+$/i.test(d))
  .sort((a, b) => b.length - a.length);

function toVnd(amount, unitHint = '') {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const u = String(unitHint).toLowerCase();
  if (/t[ỷy]|ty|billion/i.test(u)) return Math.round(n * 1_000_000_000);
  // Mặc định triệu (tr / triệu / m)
  if (n < 1000) return Math.round(n * 1_000_000);
  return Math.round(n);
}

/** @returns {{ district: string|null, phongNgu: number|null, minPrice: number|null, maxPrice: number|null }} */
export function extractSearchFilters(message) {
  const text = String(message || '');
  const lower = text.toLowerCase();

  let district = null;
  const qMatch = text.match(/quận\s*(\d{1,2})/i);
  if (qMatch) {
    district = `Quận ${Number(qMatch[1])}`;
  } else {
    for (const name of NAMED_DISTRICTS) {
      const re = new RegExp(name.replace(/\s+/g, '\\s*'), 'i');
      if (re.test(text)) {
        district = name;
        break;
      }
    }
  }

  let phongNgu = null;
  const pnMatch =
    lower.match(/(\d+)\s*(?:phòng\s*ngủ|phong\s*ngu|pn\b|p\.?\s*n\.?)/i) ||
    lower.match(/(?:phòng\s*ngủ|phong\s*ngu|pn)\s*[:=]?\s*(\d+)/i);
  if (pnMatch) {
    const n = Number(pnMatch[1]);
    if (n >= 1 && n <= 10) phongNgu = n;
  }

  let minPrice = null;
  let maxPrice = null;

  const rangeMatch = lower.match(
    /(?:từ|tu)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr\b|tỷ|ty|m)?\s*(?:đến|-|~|tới|toi)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr\b|tỷ|ty|m)?/i,
  );
  if (rangeMatch) {
    minPrice = toVnd(rangeMatch[1].replace(',', '.'), rangeMatch[2] || rangeMatch[4] || 'triệu');
    maxPrice = toVnd(rangeMatch[3].replace(',', '.'), rangeMatch[4] || rangeMatch[2] || 'triệu');
  } else {
    const underMatch = lower.match(
      /(?:dưới|duoi|max|tối\s*đa|toi\s*da|<=|<)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr\b|tỷ|ty|m)?/i,
    );
    const overMatch = lower.match(
      /(?:trên|tren|min|từ|tu|>=|>)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr\b|tỷ|ty|m)?/i,
    );
    const aroundMatch = lower.match(
      /(?:khoảng|khoang|tầm|tam|giá|gia)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr\b|tỷ|ty|m)?/i,
    );

    if (underMatch) {
      maxPrice = toVnd(underMatch[1].replace(',', '.'), underMatch[2] || 'triệu');
    }
    if (overMatch && !underMatch) {
      minPrice = toVnd(overMatch[1].replace(',', '.'), overMatch[2] || 'triệu');
    }
    if (aroundMatch && minPrice == null && maxPrice == null) {
      const mid = toVnd(aroundMatch[1].replace(',', '.'), aroundMatch[2] || 'triệu');
      if (mid) {
        minPrice = Math.round(mid * 0.8);
        maxPrice = Math.round(mid * 1.2);
      }
    }
  }

  return { district, phongNgu, minPrice, maxPrice };
}

export function hasStructuredFilters(filters) {
  if (!filters) return false;
  return Boolean(
    filters.district ||
      filters.phongNgu != null ||
      filters.minPrice != null ||
      filters.maxPrice != null,
  );
}

/**
 * Lọc cứng theo tiêu chí. `mode`:
 * - full: quận + giá + PN
 * - softDistrict: bỏ quận, giữ giá + PN
 * - priceBeds: chỉ giá + PN
 */
export function applyStructuredFilters(docs, filters, mode = 'full') {
  if (!filters || !docs?.length) return docs || [];

  return docs.filter((doc) => {
    if (mode === 'full' && filters.district) {
      const q = String(doc.quanHuyen || '').trim().toLowerCase();
      if (q !== String(filters.district).trim().toLowerCase()) return false;
    }

    const gia = Number(doc.gia);
    if (Number.isFinite(gia)) {
      if (filters.minPrice != null && gia < filters.minPrice) return false;
      if (filters.maxPrice != null && gia > filters.maxPrice) return false;
    }

    if (filters.phongNgu != null) {
      const pn = Number(doc.phongNgu);
      if (!Number.isFinite(pn) || pn !== filters.phongNgu) return false;
    }

    return true;
  });
}

/** Nới dần bộ lọc khi quá ít kết quả */
export function filterCatalogProgressive(catalog, filters) {
  if (!hasStructuredFilters(filters)) return { pool: catalog, applied: 'none' };

  const full = applyStructuredFilters(catalog, filters, 'full');
  if (full.length >= 2) return { pool: full, applied: 'full' };

  const soft = applyStructuredFilters(catalog, filters, 'softDistrict');
  if (soft.length >= 1) return { pool: soft, applied: 'softDistrict' };

  const priceBeds = applyStructuredFilters(catalog, { ...filters, district: null }, 'priceBeds');
  if (priceBeds.length >= 1) return { pool: priceBeds, applied: 'priceBeds' };

  return { pool: catalog, applied: 'none' };
}

export function formatFilterSummary(filters) {
  if (!hasStructuredFilters(filters)) return '';
  const parts = [];
  if (filters.district) parts.push(filters.district);
  if (filters.phongNgu != null) parts.push(`${filters.phongNgu} phòng ngủ`);
  if (filters.minPrice != null && filters.maxPrice != null) {
    parts.push(
      `${(filters.minPrice / 1e6).toFixed(0)}–${(filters.maxPrice / 1e6).toFixed(0)} triệu`,
    );
  } else if (filters.maxPrice != null) {
    parts.push(`dưới ${(filters.maxPrice / 1e6).toFixed(0)} triệu`);
  } else if (filters.minPrice != null) {
    parts.push(`từ ${(filters.minPrice / 1e6).toFixed(0)} triệu`);
  }
  return parts.join(', ');
}

export default {
  extractSearchFilters,
  hasStructuredFilters,
  applyStructuredFilters,
  filterCatalogProgressive,
  formatFilterSummary,
};
