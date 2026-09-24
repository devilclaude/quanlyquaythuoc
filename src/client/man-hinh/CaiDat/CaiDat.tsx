import { useEffect, useState } from 'react';
import { CaiDatToanCucResSchema } from '../../../shared/hop-dong/cai-dat';
import { CongTac } from '../../thanh-phan';
import './CaiDat.css';

interface TrangThaiCaiDat {
  bat: boolean;
  /** true khi đang chờ phản hồi PUT — chặn bấm lại trong lúc chờ. */
  dangDoi: boolean;
  loi: string | undefined;
}

/**
 * Đọc phản hồi lỗi dạng `{ loi: string }` mà mọi route trong dự án trả về khi
 * không phải 2xx (xem `src/server/api/cai-dat.ts`, `hang-hoa.ts`). Không có
 * hợp đồng Zod riêng cho khung lỗi — chưa có task nào chuẩn hoá nó.
 */
async function docThongBaoLoi(res: Response, macDinh: string): Promise<string> {
  try {
    const json: unknown = await res.json();
    const thongBao = (json as { loi?: string } | undefined)?.loi;
    return thongBao ?? macDinh;
  } catch {
    return macDinh;
  }
}

interface KhoiCaiDatToanCucProps {
  trangThai: TrangThaiCaiDat;
  onDoi: (batMoi: boolean) => void;
}

/**
 * Phần hiển thị thuần (tách khỏi container để test bằng `renderToStaticMarkup`
 * mà không cần mock `fetch` — cùng khuôn với `ThongTinHangHoa`/`ChanHangHoa`
 * trong `ChiTietHangHoa.tsx`).
 */
export function KhoiCaiDatToanCuc({ trangThai, onDoi }: KhoiCaiDatToanCucProps) {
  return (
    <section className="cai-dat">
      <h2 className="cai-dat__tieu-de">Cài đặt</h2>
      <div className="cai-dat__dong">
        <div>
          <p className="cai-dat__nhan">Quản lý theo lô</p>
          <p className="cai-dat__mo-ta">
            Bật để nhập lô và hạn dùng khi nhập hàng, chọn theo hạn dùng gần nhất khi bán (FEFO). Áp dụng cho mọi
            hàng hoá chưa ghi đè riêng.
          </p>
        </div>
        <CongTac bat={trangThai.bat} onDoi={onDoi} disabled={trangThai.dangDoi} nhan="Quản lý theo lô" />
      </div>
      {trangThai.loi ? <p className="cai-dat__loi">{trangThai.loi}</p> : null}
    </section>
  );
}

/**
 * Màn cài đặt (T-010c) — chưa có screenshot KiotViet tham chiếu cho màn này
 * trong `docs/reference/kiotviet/` (BACKLOG.md ghi rõ), dựng theo token trong
 * `.claude/skills/design-system/`. Chỉ một công tắc: bật/tắt "quản lý theo lô"
 * toàn cục (T-010a/T-010b). Ghi đè riêng theo sản phẩm nằm ở chi tiết hàng hoá
 * (`ChiTietHangHoa`), không lặp lại ở đây.
 */
export function CaiDat() {
  const [trangThai, setTrangThai] = useState<TrangThaiCaiDat | undefined>(undefined);
  const [loiTai, setLoiTai] = useState<string | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/cai-dat/quan-ly-lo', { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setTrangThai({ bat: CaiDatToanCucResSchema.parse(json).bat, dangDoi: false, loi: undefined }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoiTai('Không tải được cài đặt');
      });

    return () => controller.abort();
  }, []);

  function doiToanCuc(batMoi: boolean) {
    if (!trangThai) return;
    setTrangThai({ ...trangThai, dangDoi: true, loi: undefined });

    fetch('/api/cai-dat/quan-ly-lo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bat: batMoi }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await docThongBaoLoi(res, 'Không đổi được cài đặt'));
        const json: unknown = await res.json();
        setTrangThai({ bat: CaiDatToanCucResSchema.parse(json).bat, dangDoi: false, loi: undefined });
      })
      .catch((err: unknown) => {
        setTrangThai((hienTai) =>
          hienTai
            ? { ...hienTai, dangDoi: false, loi: err instanceof Error ? err.message : 'Không đổi được cài đặt' }
            : hienTai,
        );
      });
  }

  if (loiTai) return <p className="cai-dat__loi">{loiTai}</p>;
  if (!trangThai) return <p>Đang tải…</p>;

  return <KhoiCaiDatToanCuc trangThai={trangThai} onDoi={doiToanCuc} />;
}
