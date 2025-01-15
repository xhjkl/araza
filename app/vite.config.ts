import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'

export default defineConfig({
	plugins: [solid()],
	optimizeDeps: {
		esbuildOptions: {
			define: {
				global: 'globalThis',
			},
			plugins: [NodeGlobalsPolyfillPlugin({ buffer: true })],
		},
	},
})
