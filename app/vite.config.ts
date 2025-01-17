import path from 'node:path'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
	resolve: {
		alias: {
			'@generated-types/araza.json': path.resolve(__dirname, '..', 'target', 'idl', 'araza.json'),
			'@generated-types/araza': path.resolve(__dirname, '..', 'target', 'types', 'araza.ts'),
		},
	},
	plugins: [
		solid(),
		nodePolyfills({
			globals: {
				Buffer: true,
			},
		}),
	],
	optimizeDeps: {
		esbuildOptions: {},
	},
})
