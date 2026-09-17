import { useState } from "react"
import "./App.css"
import Auth from "./components/Auth"
import Dashboard from "./components/Dashboard"

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <>
      {isLoggedIn ? (
        <Dashboard />
      ) : (
        <Auth onLoginSuccess={() => setIsLoggedIn(true)} />
      )}
    </>
  )
}

export default App