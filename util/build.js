const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const MODE = process.argv[2]

if (MODE !== 'production' && MODE !== 'dev') {
    console.error('Usage: node build.js production|dev')
    process.exit(1)
}

const ROOT = path.resolve(__dirname, '..')
const VERSION = '2.1.8'
const LONG_VERSION = MODE === 'dev' ? `${VERSION}-dev` : VERSION

console.log(`Building Time Travel Extension - Mode: ${MODE}, Version: ${LONG_VERSION}`)

// Change to root directory
process.chdir(ROOT)

// Remove dist directory if it exists
if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true })
}

console.log('================== Chrome build ==================')

// Create dist/chrome directory
fs.mkdirSync('dist/chrome', { recursive: true })

// Run vite build
try {
    execSync(`npx vite build -m ${MODE}`, { stdio: 'inherit' })
} catch (error) {
    console.error('Vite build failed:', error)
    process.exit(1)
}

// Copy extra assets
fs.mkdirSync('dist/chrome/images', { recursive: true })

// Copy icon files
const iconFiles = fs.readdirSync('images').filter((file) => file.startsWith('icon') && file.endsWith('.png'))
iconFiles.forEach((file) => {
    fs.copyFileSync(`images/${file}`, `dist/chrome/images/${file}`)
})

// Copy locales
if (fs.existsSync('src/_locales')) {
    fs.cpSync('src/_locales', 'dist/chrome/_locales', { recursive: true })
}

// Create manifest.json with version substitution
let manifestContent = fs.readFileSync('src/manifest.json', 'utf8')
manifestContent = manifestContent.replace(/__VERSION_NAME__/g, LONG_VERSION)
manifestContent = manifestContent.replace(/__VERSION__/g, VERSION)
fs.writeFileSync('dist/chrome/manifest.json', manifestContent)

console.log('================== Firefox build ==================')

// Create Firefox version
fs.mkdirSync('dist/firefox', { recursive: true })

// Copy Chrome files to Firefox
fs.cpSync('dist/chrome', 'dist/firefox', { recursive: true })

// For now, use the same manifest for Firefox
// In a full implementation, you'd modify it according to Firefox requirements

console.log('========================================')
console.log(`current version is ${VERSION} (version_name: ${LONG_VERSION}).`)
console.log('========================================')

console.log('Build completed successfully!')
console.log('Chrome extension: dist/chrome/')
console.log('Firefox extension: dist/firefox/')

if (MODE === 'production') {
    console.log('\nTo install in Chrome:')
    console.log('1. Open chrome://extensions/')
    console.log('2. Enable "Developer mode"')
    console.log('3. Click "Load unpacked"')
    console.log('4. Select the dist/chrome directory')
}
