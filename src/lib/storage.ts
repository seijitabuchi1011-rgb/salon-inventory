import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase'

export async function uploadProductImage(productId: string, dataUrl: string): Promise<string> {
  const storageRef = ref(storage, `product-images/${productId}.jpg`)
  await uploadString(storageRef, dataUrl, 'data_url')
  return getDownloadURL(storageRef)
}
