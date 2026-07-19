function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

function isFuzzyWordMatch(word, target) {
  const w = word.normalize('NFC');
  const t = target.normalize('NFC');
  if (w === t) return true;

  // Từ quá ngắn (là, và, có, ký...) rất phổ biến và hay là tiền tố của từ dài khác
  // (VD "là" ⊂ "làm") — không cho fuzzy để tránh khớp nhầm.
  if (t.length <= 2) return false;

  const dist = levenshtein(w, t);
  const lengthDiff = Math.abs(w.length - t.length);

  // Từ ngắn (3-5): tiếng Việt đổi hẳn nghĩa chỉ vì khác dấu (VD "bạn" vs "bến"),
  // nên CHỈ cho phép lệch kiểu gõ thiếu/thừa 1 ký tự (khác độ dài), không cho phép
  // thay ký tự (cùng độ dài) — tránh khớp nhầm sang từ khác nghĩa hoàn toàn.
  if (t.length <= 5) {
    return dist === 1 && lengthDiff === 1;
  }

  // Từ dài hơn: an toàn hơn khi cho sai lệch rộng hơn (thay/thiếu/thừa tối đa 2 ký tự)
  return dist <= 2;
}

/** true nếu mọi từ trong `phrase` đều xuất hiện (đúng hoặc gần đúng do gõ sai) trong `words` */
function fuzzyPhraseIncluded(phrase, words) {
  const phraseWords = phrase.normalize('NFC').split(/\s+/).filter(Boolean);
  return phraseWords.every((pw) => words.some((w) => isFuzzyWordMatch(w, pw)));
}

export { levenshtein, isFuzzyWordMatch, fuzzyPhraseIncluded };
export default { levenshtein, isFuzzyWordMatch, fuzzyPhraseIncluded };
