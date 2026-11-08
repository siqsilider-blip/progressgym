import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const source = await readFile(new URL('../assets/app-store/app-icon-source.svg', import.meta.url))

const arrowSource = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <path d="M266 680 442 504l118 118 212-212" fill="none" stroke="#C98796" stroke-width="82" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M594 368h220v220" fill="none" stroke="#C98796" stroke-width="82" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`)

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

async function writeAdaptiveForeground(path, size) {
    await writeFile(
        new URL(path, import.meta.url),
        await sharp(arrowSource).resize(size, size).png().toBuffer()
    )
}

async function writeSplash(path, width, height) {
    const shortestSide = Math.min(width, height)
    const markSize = Math.round(shortestSide * 0.27)
    const markX = Math.round((width - markSize) / 2)
    const markY = Math.round((height - markSize) / 2 - shortestSide * 0.05)
    const titleY = Math.round(markY + markSize + shortestSide * 0.09)
    const titleSize = Math.max(18, Math.round(shortestSide * 0.055))
    const splashSource = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <radialGradient id="glow" cx="50%" cy="46%" r="42%">
            <stop offset="0" stop-color="#C98796" stop-opacity=".16"/>
            <stop offset="1" stop-color="#C98796" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="#111111"/>
        <rect width="${width}" height="${height}" fill="url(#glow)"/>
        <g transform="translate(${markX} ${markY}) scale(${markSize / 1024})">
          <path d="M266 680 442 504l118 118 212-212" fill="none" stroke="#C98796" stroke-width="82" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M594 368h220v220" fill="none" stroke="#C98796" stroke-width="82" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <text x="50%" y="${titleY}" text-anchor="middle" fill="#F5F2EE" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="800" letter-spacing="${Math.max(1, Math.round(shortestSide * 0.006))}">PROGREZZIA</text>
      </svg>`)

    await writeFile(new URL(path, import.meta.url), await sharp(splashSource).png().toBuffer())
}

await Promise.all([
    writePng('../public/icon-192.png', 192),
    writePng('../public/icon-512.png', 512),
    writePng('../public/icon-maskable-512.png', 512),
    writePng('../public/apple-touch-icon.png', 180),
    writePng('../src/app/icon.png', 512),
    writePng('../src/app/apple-icon.png', 180),
    writePng('../assets/app-store/app-icon-1024.png', 1024),
    writePng('../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024),
    ...[
        ['mdpi', 48, 108],
        ['hdpi', 72, 162],
        ['xhdpi', 96, 216],
        ['xxhdpi', 144, 324],
        ['xxxhdpi', 192, 432],
    ].flatMap(([density, iconSize, foregroundSize]) => [
        writePng(`../android/app/src/main/res/mipmap-${density}/ic_launcher.png`, iconSize),
        writePng(`../android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`, iconSize),
        writeAdaptiveForeground(`../android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`, foregroundSize),
    ]),
    writeSplash('../ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png', 2732, 2732),
    writeSplash('../ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png', 2732, 2732),
    writeSplash('../ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png', 2732, 2732),
    writeSplash('../android/app/src/main/res/drawable/splash.png', 480, 320),
    writeSplash('../android/app/src/main/res/drawable-port-mdpi/splash.png', 320, 480),
    writeSplash('../android/app/src/main/res/drawable-port-hdpi/splash.png', 480, 800),
    writeSplash('../android/app/src/main/res/drawable-port-xhdpi/splash.png', 720, 1200),
    writeSplash('../android/app/src/main/res/drawable-port-xxhdpi/splash.png', 960, 1600),
    writeSplash('../android/app/src/main/res/drawable-port-xxxhdpi/splash.png', 1280, 1920),
    writeSplash('../android/app/src/main/res/drawable-land-mdpi/splash.png', 480, 320),
    writeSplash('../android/app/src/main/res/drawable-land-hdpi/splash.png', 800, 480),
    writeSplash('../android/app/src/main/res/drawable-land-xhdpi/splash.png', 1200, 720),
    writeSplash('../android/app/src/main/res/drawable-land-xxhdpi/splash.png', 1600, 960),
    writeSplash('../android/app/src/main/res/drawable-land-xxxhdpi/splash.png', 1920, 1280),
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
