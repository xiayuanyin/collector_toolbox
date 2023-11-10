import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsxPlugin from "@vitejs/plugin-vue-jsx";
import legacy from "@vitejs/plugin-legacy";
import { resolve } from 'path'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsxPlugin(),
    legacy({
      targets: ["defaults", "not IE 11"],
    })
  ],
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: [
      //配置别名
      { find: "@", replacement: resolve(__dirname, "src") },
    ]
  }
})
