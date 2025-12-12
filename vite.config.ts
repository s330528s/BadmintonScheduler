import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 使用相對路徑 './' 可以讓應用程式在任何子路徑下運作 (例如 GitHub Pages)
  base: './', 
});