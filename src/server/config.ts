import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).default('./data/quaythuoc.sqlite'),
});

export const cauHinh = schema.parse(process.env);
