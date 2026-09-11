export type SoLuongCoSo = number & { readonly __brand: 'SoLuongCoSo' };
export type SoLuongHienThi = number & { readonly __brand: 'SoLuongHienThi' };

export function soLuongCoSo(giaTri: number): SoLuongCoSo {
  if (!Number.isInteger(giaTri)) {
    throw new Error(`SoLuongCoSo phải là số nguyên, nhận được ${giaTri}`);
  }
  return giaTri as SoLuongCoSo;
}

export function soLuongHienThi(giaTri: number): SoLuongHienThi {
  if (!Number.isInteger(giaTri)) {
    throw new Error(`SoLuongHienThi phải là số nguyên, nhận được ${giaTri}`);
  }
  return giaTri as SoLuongHienThi;
}
