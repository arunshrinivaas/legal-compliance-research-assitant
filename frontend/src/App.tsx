import { useState } from "react"
import "./App.css"
import Auth from "./components/Auth"
import Dashboard from "./components/Dashboard"

import { PreferencesProvider } from "./contexts/PreferencesContext"

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("access_token"))

  return (
    <PreferencesProvider>
      {isLoggedIn ? (
        <Dashboard />
      ) : (
        <Auth onLoginSuccess={() => setIsLoggedIn(true)} />
      )}
    </PreferencesProvider>
  )
}

export default App