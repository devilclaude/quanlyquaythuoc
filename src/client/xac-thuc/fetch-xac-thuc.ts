/**
 * Đường không tính là "hết phiên" dù trả 401: sai mật khẩu cũng là 401, và
 * `/api/auth/toi` là câu hỏi lúc mở app — 401 ở đó nghĩa là "chưa đăng nhập", do
 * `useXacThuc` tự xử lý, không phải phiên vừa hết hạn.
 */
const DUONG_BO_QUA = new Set(['/api/auth/dang-nhap', '/api/auth/toi']);

function layDuongApi(input: RequestInfo | URL): string | undefined {
  const goc = typeof location !== 'undefined' ? location.origin : 'http://localhost';
  const chuoi = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  let url: URL;
  try {
    url = new URL(chuoi, goc);
  } catch {
    return undefined;
  }
  if (url.origin !== goc) return undefined;
  return url.pathname.startsWith('/api/') ? url.pathname : undefined;
}

/**
 * Bọc `fetch` để MỘT chỗ bắt `401` của mọi `/api/*` — không phải sửa từng màn hình.
 * Trả nguyên `Response` cho nơi gọi (màn vẫn tự xử lý lỗi của mình); callback chỉ để
 * đưa người dùng về màn đăng nhập.
 */
export function boocFetch(fetchGoc: typeof fetch, khiHetPhien: () => void): typeof fetch {
  return async (input, init) => {
    const res = await fetchGoc(input, init);
    if (res.status === 401) {
      const duong = layDuongApi(input);
      if (duong !== undefined && !DUONG_BO_QUA.has(duong)) khiHetPhien();
    }
    return res;
  };
}

/** Thay `fetch` toàn cục; trả hàm khôi phục bản gốc. */
export function caiDatFetchToanCuc(khiHetPhien: () => void): () => void {
  const goc = globalThis.fetch;
  globalThis.fetch = boocFetch(goc.bind(globalThis), khiHetPhien);
  return () => {
    globalThis.fetch = goc;
  };
}
