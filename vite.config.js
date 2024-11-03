import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    https: true, // HTTPS üzerinden çalışacak
    host: '0.0.0.0', // Tüm IP adreslerinden erişime aç
    port: 5173, // İsteğe bağlı olarak başka bir port numarası verebilirsin
  },
  plugins: [react(), basicSsl()],
})
