/*
 * Firebase connection. These values are public by design (every Firebase
 * website ships them); the database is protected by firestore.rules and the
 * Cloud Functions, not by keeping this config secret.
 * Analytics is deliberately NOT loaded (it would set tracking cookies).
 */
import { initializeApp } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'

const firebaseConfig = {
  apiKey: 'AIzaSyCNWHdhN2f4GQXQuZHdLtlbNccwcyRfA-g',
  authDomain: 'dearly-club.firebaseapp.com',
  projectId: 'dearly-club',
  storageBucket: 'dearly-club.firebasestorage.app',
  messagingSenderId: '668970733267',
  appId: '1:668970733267:web:8a85febc2c3fce63fc4e26',
}

export const app = initializeApp(firebaseConfig)
export const functions = getFunctions(app, 'europe-west1')

/** Call a Cloud Function by name and return its data. */
export async function callFunction(name, data) {
  const fn = httpsCallable(functions, name)
  const result = await fn(data)
  return result.data
}
