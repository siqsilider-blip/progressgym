import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const background = '#111111'
const transparent = { r: 0, g: 0, b: 0, alpha: 0 }
const emblem = await readFile(new URL('../assets/app-store/progrezzia-emblem.webp', import.meta.url))
const logo = await readFile(new URL('../assets/app-store/progrezzia-logo.webp', import.meta.url))

async function renderMark(size, fill, monochrome = false) {
    const markSize = Math.round(size * fill)
    let mark = await sharp(emblem).resize(markSize, markSize, { fit: 'contain', background: transparent }).png().toBuffer()
    if (monochrome) {
        const alpha = await sharp(mark).extractChannel('alpha').raw().toBuffer()
        mark = await sharp({ create: { width: markSize, height: markSize, channels: 3, background: '#ffffff' } })
            .joinChannel(alpha, { raw: { width: markSize, height: markSize, channels: 1 } }).png().toBuffer()
    }
    return sharp({ create: { width: size, height: size, channels: 4, background: transparent } })
        .composite([{ input: mark, gravity: 'centre' }]).png().toBuffer()
}

async function renderIcon(size, fill = 0.72) {
    return sharp(await renderMark(size, fill)).flatten({ background }).removeAlpha().png().toBuffer()
}

async function writePng(path, size, fill) {
    await writeFile(new URL(path, import.meta.url), await renderIcon(size, fill))
}

async function writeAdaptiveForeground(path, size) {
    await writeFile(new URL(path, import.meta.url), await renderMark(size, 0.56))
}

async function writeSplash(path, width, height) {
    const logoWidth = Math.round(Math.min(width, height) * 0.34)
    const lockup = await sharp(logo).resize({ width: logoWidth }).png().toBuffer()
    const splash = await sharp({ create: { width, height, channels: 3, background } })
        .composite([{ input: lockup, gravity: 'centre' }]).removeAlpha().png().toBuffer()
    await writeFile(new URL(path, import.meta.url), splash)
}

await Promise.all([
    writeFile(new URL('../public/brand/progrezzia-emblem.webp', import.meta.url), await sharp(emblem).resize({ height: 160 }).webp({ quality: 92 }).toBuffer()),
    writeFile(new URL('../public/brand/progrezzia-logo.webp', import.meta.url), await sharp(logo).resize({ width: 570 }).webp({ quality: 92 }).toBuffer()),
    writePng('../public/icon-192.png', 192),
    writePng('../public/icon-512.png', 512),
    writePng('../public/icon-maskable-512.png', 512, 0.65),
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

await Promise.all([
    writeFile(new URL('../public/badge-72.png', import.meta.url), await renderMark(72, 0.82, true)),
    writeFile(new URL('../android/app/src/main/res/drawable-nodpi/ic_launcher_monochrome.png', import.meta.url), await renderMark(432, 0.56, true)),
    writeFile(new URL('../android/app/src/main/res/drawable-nodpi/ic_stat_progrezzia.png', import.meta.url), await renderMark(96, 0.9, true)),
    writeFile(new URL('../native-shell/brand-mark.webp', import.meta.url), await sharp(emblem).resize({ height: 112 }).webp().toBuffer()),
])

const faviconSizes = [16, 32, 48, 64]
const faviconImages = await Promise.all(faviconSizes.map((size) => renderIcon(size)))
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
