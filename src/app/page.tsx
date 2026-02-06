'use client'

import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged, signOut, User } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { VocabForm } from '@/components/VocabForm'
import { VocabList } from '@/components/VocabList'
import { AuthDialog } from '@/components/AuthDialog'
import { LogOut } from 'lucide-react'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        // Create or update user document when they sign in
        try {
          const userDocRef = doc(db, 'users', currentUser.uid)
          await setDoc(userDocRef, {
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            uid: currentUser.uid,
            lastSignIn: serverTimestamp(),
          }, { merge: true }) // merge: true won't overwrite existing data
        } catch (error) {
          console.error('Failed to create user document:', error)
        }
      } else {
        setUser(null)
      }
      setIsAuthenticated(!!currentUser)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    const auth = getAuth()
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <AuthDialog />
      </div>
    )
  }

  return (
    <main className="min-h-screen py-8 px-4 bg-slate-50 dark:bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b border-border/50 sm:static sm:p-6 sm:rounded-2xl sm:shadow-sm sm:border sm:bg-card">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 shadow-sm rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-700 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://flagcdn.com/de.svg"
                alt="German Flag"
                className="object-cover w-full h-full"
              />
            </div>

            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                DDeutSch
              </h1>
              <p className="text-xs text-muted-foreground font-medium hidden sm:block">
                Business German Builder
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">
                {user?.displayName?.split(' ')[0] || 'User'}
              </p>
              <p className="text-xs text-muted-foreground hidden sm:block">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Form Section - Clean Container */}
        <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
          <VocabForm />
        </div>

        {/* List Section - Removed redundant H2 (List has its own) */}
        <div className="pt-4">
          <VocabList />
        </div>
      </div>
    </main>
  )
}
