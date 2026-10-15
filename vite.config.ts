import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs allow deployment at a root domain or a repository subpath.
  base: './',
});
