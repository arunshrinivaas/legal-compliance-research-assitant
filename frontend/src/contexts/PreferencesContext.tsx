import React, { createContext, useContext, useEffect, useState } from "react"

export type FontSize = "xs" | "s" | "m" | "l" | "xl"

type PreferencesContextType = {
    fontSize: FontSize
    setFontSize: (size: FontSize) => void
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const [fontSize, setFontSize] = useState<FontSize>(() => {
        const saved = localStorage.getItem("font_size") as FontSize | null
        if (saved && ["xs", "s", "m", "l", "xl"].includes(saved)) {
            return saved
        }
        return "m"
    })

    useEffect(() => {
        localStorage.setItem("font_size", fontSize)
        document.documentElement.setAttribute("data-theme-size", fontSize)
    }, [fontSize])

    return (
        <PreferencesContext.Provider value={{ fontSize, setFontSize }}>
            {children}
        </PreferencesContext.Provider>
    )
}

export function usePreferences() {
    const context = useContext(PreferencesContext)
    if (context === undefined) {
        throw new Error("usePreferences must be used within a PreferencesProvider")
    }
    return context
}
