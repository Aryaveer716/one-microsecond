import { copyFile, mkdir } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const destination = new URL('dist/vendor/', root)
const files = {
  'three.module.js': 'three/build/three.module.js',
  'three.core.js': 'three/build/three.core.js',
  'OrbitControls.js': 'three/examples/jsm/controls/OrbitControls.js',
  'LICENSE-three.txt': 'three/LICENSE',
  'space-grotesk.woff2': '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2',
  'LICENSE-space-grotesk.txt': '@fontsource-variable/space-grotesk/LICENSE'
}

await mkdir(destination, { recursive: true })
await Promise.all(Object.entries(files).map(([target, source]) =>
  copyFile(new URL('node_modules/' + source, root), new URL(target, destination))
))
