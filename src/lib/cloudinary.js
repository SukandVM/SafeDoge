// ─────────────────────────────────────────────────────────────
// Cloudinary — free photo uploads (no credit card needed)
// Sign up free at cloudinary.com
//
// Credentials are read from .env (never commit them):
//   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME    Dashboard → Cloud name
//   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET Settings → Upload → Add upload preset →
//                                        set "Signing Mode" to UNSIGNED → save
// ─────────────────────────────────────────────────────────────

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || ''
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ''

/**
 * Upload a local image URI to Cloudinary.
 * Returns the secure public URL of the uploaded image.
 */
export async function uploadToCloudinary(localUri, folder = 'incidents') {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary is not configured. Add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and ' +
      'EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET to your .env file.',
    )
  }

  const filename = localUri.split('/').pop() || `photo_${Date.now()}.jpg`
  const ext      = filename.split('.').pop()?.toLowerCase() || 'jpg'
  const mime     = ext === 'png' ? 'image/png' : 'image/jpeg'

  const formData = new FormData()
  formData.append('file', { uri: localUri, name: filename, type: mime })
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Cloudinary upload failed')
  }

  const data = await response.json()
  return data.secure_url   // permanent public URL
}
