import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).default('./data/quaythuoc.sqlite'),
  // Danh sách origin được gọi API từ trình duyệt, ngăn cách bằng dấu phẩy.
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o.length > 0),
    ),
});

export const cauHinh = schema.parse(process.env);
