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
 * chọn file nhập hàng.png`: tiêu đề "Nhập hàng", khối "Thêm sản phẩm từ file
 * excel" kèm liên kết tải file mẫu và nút "Chọn file dữ liệu". Màn đầy đủ
 * trong ảnh (bảng dòng đã nhập, panel nhà cung cấp/mã phiếu) thuộc T-040c —
 * CHƯA build (BACKLOG.md T-040c vẫn TODO) — slice này chỉ dựng đúng khối nhập
 * từ Excel, không dựng lại toàn bộ khung màn nhập hàng thủ công.
 */
export function KhoiNhapTuExcel({ dangTai, ketQua, loiTai, onChonFile }: KhoiNhapTuExcelProps) {
  return (
    <section className="nhap-hang-excel">
      <h1 className="nhap-hang-excel__tieu-de">Nhập hàng</h1>
      <div className="nhap-hang-excel__khoi">
        <p className="nhap-hang-excel__mo-ta">Thêm sản phẩm từ file excel</p>
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
