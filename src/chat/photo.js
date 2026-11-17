/*
 * Chat photos. Before upload, a photo is redrawn in the browser as a JPEG of at
 * most 1600px: it loads faster for everyone, and redrawing drops the hidden
 * camera data (EXIF), such as the GPS location where it was taken.
 */
const MAX_SIDE = 1600
const MAX_BYTES = 4.8 * 1024 * 1024
const MAX_INPUT = 30 * 1024 * 1024

const looksLikePhoto = (file) => file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|gif)$/i.test(file.name)

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This photo’s format isn’t supported here. Try a JPEG or PNG, or take a screenshot of it.'))
    }
    img.src = url
  })
}

const toBlob = (canvas, quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))

/** Returns { blob, width, height, previewUrl } ready to upload. Throws an Error with a friendly message. */
export async function preparePhoto(file) {
  if (!file || !looksLikePhoto(file)) throw new Error('Please choose a photo.')
  if (file.size > MAX_INPUT) throw new Error('That photo is too large. Please choose one under 30 MB.')
  const { img, url } = await loadImage(file)
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff' // transparent PNGs get a white background, not black
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    let blob = await toBlob(canvas, 0.85)
    if (blob && blob.size > MAX_BYTES) blob = await toBlob(canvas, 0.7)
    if (!blob || blob.size > MAX_BYTES) throw new Error('We couldn’t prepare that photo. Please try another one.')
    return { blob, width, height, previewUrl: URL.createObjectURL(blob) }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Uploads a prepared photo to the person's own upload folder. Returns its storage path. */
export async function uploadPhoto(uid, blob) {
  const [{ getStorage, ref, uploadBytes }, { app }] = await Promise.all([import('firebase/storage'), import('../lib/firebase')])
  const name = `${crypto.randomUUID().replace(/-/g, '')}.jpg`
  const path = `chat-uploads/${uid}/${name}`
  await uploadBytes(ref(getStorage(app), path), blob, { contentType: 'image/jpeg' })
  return path
}
