import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { chiNhanh, donViTinh, loHang, sanPham, theKho, tonKhoLo } from './schema';

type Db = ReturnType<typeof drizzle>;

// Dữ liệu minh hoạ cho T-004c: một sản phẩm bật quản lý lô (nhiều đơn vị, nhiều
// lô thật) và một sản phẩm ở chế độ tồn phẳng (chỉ lô ngầm định), để chứng minh
// hai chế độ chạy trên cùng một mô hình dữ liệu (SPEC.md §3.2).
export function seedDuLieuMinhHoa(db: Db) {
  const chiNhanhId = 'cn-demo-chinh';
  db.insert(chiNhanh).values({ id: chiNhanhId, ten: 'Quầy chính' }).run();

  const sanPhamNhieuLo = 'sp-demo-paracetamol';
  db.insert(sanPham)
    .values({ id: sanPhamNhieuLo, maHang: 'SP001', ten: 'Paracetamol 500mg' })
    .run();
  db.insert(donViTinh)
    .values([
      { id: 'dvt-demo-vien', sanPhamId: sanPhamNhieuLo, ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 },
      { id: 'dvt-demo-vi', sanPhamId: sanPhamNhieuLo, ten: 'vỉ', heSo: 12, laCoSo: false, giaBan: 6000 },
      {
        id: 'dvt-demo-hop',
        sanPhamId: sanPhamNhieuLo,
        ten: 'hộp',
        heSo: 180,
        laCoSo: false,
        giaBan: 90000,
      },
    ])
    .run();

  const loThat1 = 'lo-demo-lot001';
  const loThat2 = 'lo-demo-lot002';
  db.insert(loHang)
    .values([
      { id: loThat1, sanPhamId: sanPhamNhieuLo, soLo: 'LOT001', hsd: '2027-06-30' },
      { id: loThat2, sanPhamId: sanPhamNhieuLo, soLo: 'LOT002', hsd: '2026-12-31' },
    ])
    .run();

  const nhapLoThat1 = 900; // 5 hộp × 180 viên
  const nhapLoThat2 = 360; // 2 hộp × 180 viên
  db.insert(theKho)
    .values([
      {
        id: 'tk-demo-nhap-lot001',
        chiNhanhId,
        loId: loThat1,
        loai: 'NHAP',
        soLuong: nhapLoThat1,
        thoiGian: '2026-09-01T02:00:00.000Z',
      },
      {
        id: 'tk-demo-nhap-lot002',
        chiNhanhId,
        loId: loThat2,
        loai: 'NHAP',
        soLuong: nhapLoThat2,
        thoiGian: '2026-09-05T02:00:00.000Z',
      },
    ])
    .run();
  db.insert(tonKhoLo)
    .values([
      { loId: loThat1, chiNhanhId, ton: nhapLoThat1 },
      { loId: loThat2, chiNhanhId, ton: nhapLoThat2 },
    ])
    .run();

  const sanPhamTonPhang = 'sp-demo-nuoc-muoi';
  db.insert(sanPham)
    .values({ id: sanPhamTonPhang, maHang: 'SP002', ten: 'Nước muối sinh lý 500ml' })
    .run();
  db.insert(donViTinh)
    .values({
      id: 'dvt-demo-chai',
      sanPhamId: sanPhamTonPhang,
      ten: 'chai',
      heSo: 1,
      laCoSo: true,
      giaBan: 15000,
    })
    .run();

  const [loMacDinh] = db.select().from(loHang).where(eq(loHang.sanPhamId, sanPhamTonPhang)).all();
  if (!loMacDinh) throw new Error('trigger lô ngầm định không chạy cho ' + sanPhamTonPhang);

  const nhapTonPhang = 50;
  db.insert(theKho)
    .values({
      id: 'tk-demo-nhap-nuoc-muoi',
      chiNhanhId,
      loId: loMacDinh.id,
      loai: 'NHAP',
      soLuong: nhapTonPhang,
      thoiGian: '2026-09-01T02:00:00.000Z',
    })
    .run();
  db.insert(tonKhoLo).values({ loId: loMacDinh.id, chiNhanhId, ton: nhapTonPhang }).run();

  return { chiNhanhId, sanPhamNhieuLo, sanPhamTonPhang };
}
