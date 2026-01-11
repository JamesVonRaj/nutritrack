import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCFffbkALNuHkNLAyL11RZEeGTbhaQpYaw",
  authDomain: "nutritrack-10c54.firebaseapp.com",
  projectId: "nutritrack-10c54",
  storageBucket: "nutritrack-10c54.firebasestorage.app",
  messagingSenderId: "100416850946",
  appId: "1:100416850946:web:3601da7fd0be32fc146b1b"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const firestore = getFirestore(app)
