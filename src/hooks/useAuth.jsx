import { createContext, useContext, useEffect, useState } from 'react'
import '../lib/firebase'   // ensure Firebase is initialized
import auth from '@react-native-firebase/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen for auth state changes (handles session restore automatically)
    const unsubscribe = auth().onAuthStateChanged(firebaseUser => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signIn(email, password) {
    const result = await auth().signInWithEmailAndPassword(email, password)
    return result.user
  }

  async function signUp(email, password) {
    const result = await auth().createUserWithEmailAndPassword(email, password)
    return result.user
  }

  async function signOut() {
    await auth().signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
