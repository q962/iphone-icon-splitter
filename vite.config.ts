import { fileURLToPath, URL } from 'node:url'

import { defineConfig, PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const injectEruda = () => (<PluginOption>{
  name: 'erudaInjector',
  transformIndexHtml: html => ({
    html,
    tags: [
      {
        tag: 'script',
        attrs: {
          src: '/node_modules/eruda/eruda'
        },
        injectTo: 'body'
      },
      {
        tag: 'script',
        injectTo: 'body',
        children: 'eruda.init()'
      }
    ]
  })
})

// https://vitejs.dev/config/
// export default defineConfig({
export default defineConfig
  (({ command
    , mode
    , isSsrBuild
    , isPreview
  }) => {
    void command
      , mode
      , isSsrBuild
      , isPreview;

    return {
      plugins: [
        vue(),
        vueDevTools(),
        command === 'serve' ? injectEruda() : null
      ],
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('./src', import.meta.url))
        }
      },
      server: {
        host: '0.0.0.0',
        port: 5174
      }
    }
  })
