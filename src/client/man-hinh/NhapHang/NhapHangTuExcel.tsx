import { useState } from 'react';
import { KetQuaNhapTuExcelResSchema, type KetQuaNhapTuExcelRes } from '../../../shared/hop-dong/nhap-tu-excel';
import './NhapHangTuExcel.css';

interface KhoiNhapTuExcelProps {
  dangTai: boolean;
  ketQua: KetQuaNhapTuExcelRes | undefined;
  /** Lỗi KHÔNG theo dòng — mạng đứt, server lỗi bất ngờ, thiếu file. */
  loiTai: string | undefined;
  onChonFile: (file: File) => void;
}

/**
 * Phần hiển thị thuần (T-043, SPEC.md §6.2 "Có đường nhập hàng loạt từ file
 * Excel"). Đối chiếu `docs/reference/kiotviet/Quản trị/Nhập hàng/Giao diện
 * chọn file nhập hàng.png`: khối "Thêm sản phẩm từ file excel" kèm liên kết
 * tải file mẫu và nút "Chọn file dữ liệu". Gắn liền bên dưới màn Nhập hàng
 * tạo tay (T-040c1, `NhapHang.tsx`) — không còn tiêu đề "Nhập hàng" riêng
 * (trùng với tiêu đề màn cha); BACKLOG.md T-043 đã ghi sẵn "khi T-040c build,
 * hai màn nên gộp lại" — đây là chỗ gộp.
 */
export function KhoiNhapTuExcel({ dangTai, ketQua, loiTai, onChonFile }: KhoiNhapTuExcelProps) {
  return (
    <section className="nhap-hang-excel">
      <div className="nhap-hang-excel__khoi">
        <h2 className="nhap-hang-excel__mo-ta">Thêm sản phẩm từ file excel</h2>
        <p className="nhap-hang-excel__mau">
          (Tải về file mẫu: <a href="/api/phieu-nhap/mau-excel">Excel file</a>)
        </p>
        <label className="nhap-hang-excel__chon-file nut nut--chinh">
          Chọn file dữ liệu
          <input
            type="file"
            accept=".xlsx"
            disabled={dangTai}
            className="nhap-hang-excel__input-file"
            onChange={(su) => {
              const file = su.target.files?.[0];
              su.target.value = '';
              if (file) onChonFile(file);
            }}
          />
        </label>

        {dangTai ? <p className="nhap-hang-excel__trang-thai">Đang tải lên…</p> : null}

        {loiTai ? <p className="nhap-hang-excel__loi">{loiTai}</p> : null}

        {ketQua?.thanhCong ? (
          <p className="nhap-hang-excel__thanh-cong">
            Đã tạo phiếu nhập <strong>{ketQua.phieu.ma}</strong>, đã ghi kho.
          </p>
        ) : null}

        {ketQua && !ketQua.thanhCong ? (
          <ul className="nhap-hang-excel__danh-sach-loi">
            {ketQua.loi.map((dong) => (
              <li key={`${dong.dong}-${dong.thongDiep}`}>{dong.thongDiep}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

/** Container: gọi `POST /api/phieu-nhap/tu-excel` ngay khi chọn file. */
export function NhapHangTuExcel() {
  const [dangTai, setDangTai] = useState(false);
  const [ketQua, setKetQua] = useState<KetQuaNhapTuExcelRes | undefined>(undefined);
  const [loiTai, setLoiTai] = useState<string | undefined>(undefined);

  function taiLenFile(file: File) {
    setDangTai(true);
    setKetQua(undefined);
    setLoiTai(undefined);

    const form = new FormData();
    form.set('file', file, file.name);

    fetch('/api/phieu-nhap/tu-excel', { method: 'POST', body: form })
      .then(async (res) => {
        const than = KetQuaNhapTuExcelResSchema.safeParse(await res.json());
        if (than.success) {
          setKetQua(than.data);
        } else {
          setLoiTai('Tải lên thất bại — thử lại');
        }
      })
      .catch(() => setLoiTai('Không tải lên được — kiểm tra kết nối mạng'))
      .finally(() => setDangTai(false));
  }

  return <KhoiNhapTuExcel dangTai={dangTai} ketQua={ketQua} loiTai={loiTai} onChonFile={taiLenFile} />;
}
