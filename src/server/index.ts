import { serve } from '@hono/node-server';
import { taoApp } from './app';
import { cauHinh } from './config';

serve({ fetch: taoApp().fetch, port: cauHinh.PORT }, (info) => {
  console.log(`Server chạy ở cổng ${info.port}`);
});
