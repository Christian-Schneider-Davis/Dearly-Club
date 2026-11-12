/*
 * Firebase Auth + Firestore, shared by the account area and the admin area.
 * Only loaded on those pages (dynamic import), so the public site stays light.
 */
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { app } from './firebase'

export const auth = getAuth(app)
export const db = getFirestore(app)
