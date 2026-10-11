import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { caiDatFetchToanCuc } from './xac-thuc/fetch-xac-thuc';
import { SU_KIEN_HET_PHIEN } from './xac-thuc/use-xac-thuc';
import './design/tokens.css';

// Một chỗ duy nhất bắt 401 của mọi /api/* — phải cài TRƯỚC khi render để không sót request nào.
caiDatFetchToanCuc(() => window.dispatchEvent(new Event(SU_KIEN_HET_PHIEN)));

const phanTu = document.getElementById('root');
if (!phanTu) {
  throw new Error('Không tìm thấy #root trong index.html');
}

createRoot(phanTu).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
