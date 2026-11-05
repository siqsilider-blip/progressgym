import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const source = await readFile(new URL('../assets/app-store/app-icon-source.svg', import.meta.url))

async function renderIcon(size) {
    return sharp(source)
        .resize(size, size)
        .flatten({ background: '#111111' })
        .removeAlpha()
        .png()
        .toBuffer()
}

async function writePng(path, size) {
    await writeFile(new URL(path, import.meta.url), await renderIcon(size))
}

await Promise.all([
    writePng('../public/icon-192.png', 192),
    writePng('../public/icon-512.png', 512),
    writePng('../public/icon-maskable-512.png', 512),
    writePng('../public/apple-touch-icon.png', 180),
    writePng('../src/app/icon.png', 512),
    writePng('../src/app/apple-icon.png', 180),
    writePng('../assets/app-store/app-icon-1024.png', 1024),
])

const badgeSource = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <path d="M266 680 442 504l118 118 212-212" fill="none" stroke="#fff" stroke-width="96" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M594 368h220v220" fill="none" stroke="#fff" stroke-width="96" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`)

await writeFile(
    new URL('../public/badge-72.png', import.meta.url),
    await sharp(badgeSource).resize(72, 72).png().toBuffer()
)

const faviconSizes = [16, 32, 48, 64]
const faviconImages = await Promise.all(faviconSizes.map(renderIcon))
const directorySize = 6 + faviconImages.length * 16
const directory = Buffer.alloc(directorySize)
directory.writeUInt16LE(0, 0)
directory.writeUInt16LE(1, 2)
directory.writeUInt16LE(faviconImages.length, 4)

let offset = directorySize
faviconImages.forEach((image, index) => {
    const size = faviconSizes[index]
    const entry = 6 + index * 16
    directory.writeUInt8(size, entry)
    directory.writeUInt8(size, entry + 1)
    directory.writeUInt8(0, entry + 2)
    directory.writeUInt8(0, entry + 3)
    directory.writeUInt16LE(1, entry + 4)
    directory.writeUInt16LE(32, entry + 6)
    directory.writeUInt32LE(image.length, entry + 8)
    directory.writeUInt32LE(offset, entry + 12)
    offset += image.length
})

await writeFile(
    new URL('../src/app/favicon.ico', import.meta.url),
    Buffer.concat([directory, ...faviconImages])
)

console.log('Iconos de marca generados.')
