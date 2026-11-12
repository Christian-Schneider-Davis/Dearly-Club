/*
 * Firebase Auth + Firestore for the admin area only. Loaded lazily, so the
 * public site never downloads these.
 */
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { app } from '../lib/firebase'

export const auth = getAuth(app)
export const db = getFirestore(app)
