import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import CtaSection from './components/CtaSection'
import Footer from './components/Footer'
import Dashboard from './components/Dashboard'
import WorkspaceHome from './components/WorkspaceHome'
import DiagramWorkspace from './components/DiagramWorkspace'
import SettingsView from './components/SettingsView'
import DeveloperInfoView from './components/DeveloperInfoView'
import LoadingScreen from './components/LoadingScreen'
import './App.css'

function LandingPage({ onSignIn, isSigningIn, authError }) {
  return (
    <>
      <Navbar onSignIn={onSignIn} isSigningIn={isSigningIn} />
      <main>
        <Hero onSignIn={onSignIn} isSigningIn={isSigningIn} authError={authError} />
        <Features />
        <HowItWorks />
        <CtaSection onSignIn={onSignIn} isSigningIn={isSigningIn} />
      </main>
      <Footer />
    </>
  )
}

function App() {
  // undefined = session not checked yet, null = signed out, object = signed in.
  const [session, setSession] = useState(undefined)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = async () => {
    setIsSigningIn(true)
    setAuthError('')
    // Computed at runtime (not a hardcoded env value) so local dev and
    // production both redirect back to their own origin after Google's
    // OAuth screen, without needing separate builds.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/workspace` },
    })
    if (error) {
      setAuthError('Sign-in was cancelled or failed. Please try again.')
      setIsSigningIn(false)
    }
    // On success the browser navigates away to Google/Supabase's own pages -
    // isSigningIn is moot past this point, this component will remount fresh
    // on the way back in.
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (session === undefined) {
    return <LoadingScreen message="Loading…" />
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          session ? (
            <Navigate to="/workspace" replace />
          ) : (
            <LandingPage onSignIn={signIn} isSigningIn={isSigningIn} authError={authError} />
          )
        }
      />
      <Route
        path="/workspace"
        element={
          session ? (
            <Dashboard user={session.user} onSignOut={handleSignOut} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      >
        <Route index element={<WorkspaceHome />} />
        <Route path="settings" element={<SettingsView user={session?.user} />} />
        <Route path="developer" element={<DeveloperInfoView />} />
        <Route path=":diagramId" element={<DiagramWorkspace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
