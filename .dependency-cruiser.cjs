/**
 * Ranh giới module — xem docs/agent/ARCHITECTURE.md §5.
 * Quy tắc "src/server/kho/** không import hàm giải nghĩa cài đặt quản lý lô"
 * được thêm khi module cài đặt đó tồn tại (T-010) — chưa có gì để trỏ tới lúc này.
 */
module.exports = {
  forbidden: [
    {
      name: 'shared-khong-import-server-client',
      comment: 'src/shared/** không được import từ src/server/** hay src/client/**',
      severity: 'error',
      from: { path: '^src/shared' },
      to: { path: '^src/(server|client)' },
    },
    {
      name: 'client-khong-import-server-tru-hop-dong',
      comment:
        'src/client/** không được import từ src/server/** (trừ kiểu trong src/shared/hop-dong/)',
      severity: 'error',
      from: { path: '^src/client' },
      to: { path: '^src/server' },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
