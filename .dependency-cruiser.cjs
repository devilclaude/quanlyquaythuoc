/**
 * Ranh giới module — xem docs/agent/ARCHITECTURE.md §5.
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
    {
      name: 'kho-khong-import-giai-nghia-cai-dat',
      comment:
        'src/server/kho/** không được import hàm giải nghĩa cài đặt quản lý lô (SPEC.md §3.2, ARCHITECTURE.md §5) — cài đặt chỉ dùng ở validation form, render UI, và bộ lọc báo cáo cận date; module kho luôn chạy một đường code duy nhất trên mô hình theo lô.',
      severity: 'error',
      from: { path: '^src/server/kho' },
      to: { path: '^src/shared/cai-dat' },
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
