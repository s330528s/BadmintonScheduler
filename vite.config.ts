import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 設定 base 路徑，必須與您的 GitHub Repository 名稱一致
  // 例如: https://username.github.io/BadmintonScheduler/ -> base: '/BadmintonScheduler/'
  base: '/BadmintonScheduler/', 
});