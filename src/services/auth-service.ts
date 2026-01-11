import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase"

export type AuthUser = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

export async function signInWithGoogle(): Promise<AuthUser> {
  const result = await signInWithPopup(auth, googleProvider)
  return {
    uid: result.user.uid,
    email: result.user.email,
    displayName: result.user.displayName,
    photoURL: result.user.photoURL,
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export function getCurrentUser(): AuthUser | null {
  const user = auth.currentUser
  if (!user) return null
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  }
}

export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      })
    } else {
      callback(null)
    }
  })
}
