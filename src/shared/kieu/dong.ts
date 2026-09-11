export type Dong = number & { readonly __brand: 'Dong' };

export function dong(giaTri: number): Dong {
  if (!Number.isInteger(giaTri)) {
    throw new Error(`Dong phải là số nguyên, nhận được ${giaTri}`);
  }
  return giaTri as Dong;
}
