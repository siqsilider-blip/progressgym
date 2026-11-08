import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

function blobAsBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo preparar la imagen.'))
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : ''
      const separator = value.indexOf(',')
      if (separator === -1) reject(new Error('No se pudo preparar la imagen.'))
      else resolve(value.slice(separator + 1))
    }
    reader.readAsDataURL(blob)
  })
}

export async function shareNativeImage(blob: Blob, filename: string) {
  if (!Capacitor.isNativePlatform()) return false

  const canShare = await Share.canShare()
  if (!canShare.value) return false

  const safeName = filename.replace(/[^a-z0-9._-]/gi, '-')
  const saved = await Filesystem.writeFile({
    path: safeName,
    data: await blobAsBase64(blob),
    directory: Directory.Cache,
    recursive: true,
  })

  await Share.share({
    title: 'Progreso en Progrezzia',
    text: 'Comparativa de progreso creada en Progrezzia.',
    files: [saved.uri],
    dialogTitle: 'Compartir comparativa',
  })

  return true
}
