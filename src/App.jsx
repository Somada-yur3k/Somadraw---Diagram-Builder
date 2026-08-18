import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { supabase } from './lib/supabaseClient'
import Navbar from './components/marketing/Navbar'
import SignInPage from './components/auth/SignInPage'
import Hero from './components/marketing/Hero'
import Features from './components/marketing/Features'
import HowItWorks from './components/marketing/HowItWorks'
import CtaSection from './components/marketing/CtaSection'
import Footer from './components/marketing/Footer'
import Dashboard from './components/workspace/Dashboard'
import WorkspaceHome from './components/workspace/WorkspaceHome'
import DiagramWorkspace from './components/workspace/DiagramWorkspace'
import LoadingScreen from './components/workspace/LoadingScreen'
import DocsPage from './components/resources/DocsPage'
import HelpCenterPage from './components/resources/HelpCenterPage'
import UpdatesPage from './components/resources/UpdatesPage'
import './App.css'

function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <CtaSection />
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
            <LandingPage />
          )
        }
      />
      <Route
        path="/sign-in"
        element={
          session ? (
            <Navigate to="/workspace" replace />
          ) : (
            <SignInPage onSignIn={signIn} isSigningIn={isSigningIn} authError={authError} />
          )
        }
      />
      {/* Public regardless of session - unlike "/" and "/sign-in", a signed-in
          user isn't redirected away from docs (there's no reason a returning
          user shouldn't be able to look something up). */}
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/help" element={<HelpCenterPage />} />
      <Route path="/updates" element={<UpdatesPage />} />
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
        {/* Settings is a floating modal now (DashboardSidebar's own
            SettingsModal), not a page - no more dedicated
            /workspace/settings or /workspace/developer route. */}
        <Route path=":diagramId" element={<DiagramWorkspace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
