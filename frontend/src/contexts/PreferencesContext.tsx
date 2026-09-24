import React, { createContext, useContext, useEffect, useState } from "react"

export type FontSize = "xs" | "s" | "m" | "l" | "xl"
export type Density = "comfortable" | "compact"
export type LandingSection = "home" | "research" | "investigations" | "agents" | "audit" | "governance"

type PreferencesContextType = {
    fontSize: FontSize
    setFontSize: (size: FontSize) => void
    density: Density
    setDensity: (d: Density) => void
    landingSection: LandingSection
    setLandingSection: (s: LandingSection) => void
    reduceMotion: boolean
    setReduceMotion: (v: boolean) => void
    largerTargets: boolean
    setLargerTargets: (v: boolean) => void
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)

function readLS<T>(key: string, fallback: T, allowed?: T[]): T {
    try {
        const saved = localStorage.getItem(key) as T | null
        if (saved && (!allowed || allowed.includes(saved))) return saved
    } catch {}
    return fallback
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const [fontSize, setFontSizeState] = useState<FontSize>(() =>
        readLS<FontSize>("pref_font_size", "m", ["xs", "s", "m", "l", "xl"])
    )
    const [density, setDensityState] = useState<Density>(() =>
        readLS<Density>("pref_density", "comfortable", ["comfortable", "compact"])
    )
    const [landingSection, setLandingSectionState] = useState<LandingSection>(() =>
        readLS<LandingSection>("pref_landing", "home", ["home", "research", "investigations", "agents", "audit", "governance"])
    )
    const [reduceMotion, setReduceMotionState] = useState<boolean>(() => {
        const saved = localStorage.getItem("pref_reduce_motion")
        if (saved !== null) return saved === "true"
        // Also respect OS preference
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    })
    const [largerTargets, setLargerTargetsState] = useState<boolean>(() =>
        localStorage.getItem("pref_larger_targets") === "true"
    )

    // Apply font size
    useEffect(() => {
        localStorage.setItem("pref_font_size", fontSize)
        // Also keep legacy key for backward compat
        localStorage.setItem("font_size", fontSize)
        document.documentElement.setAttribute("data-theme-size", fontSize)
    }, [fontSize])

    // Apply density
    useEffect(() => {
        localStorage.setItem("pref_density", density)
        document.documentElement.setAttribute("data-density", density)
    }, [density])

    // Apply reduce motion
    useEffect(() => {
        localStorage.setItem("pref_reduce_motion", String(reduceMotion))
        document.documentElement.setAttribute("data-reduce-motion", String(reduceMotion))
    }, [reduceMotion])

    // Apply larger targets
    useEffect(() => {
        localStorage.setItem("pref_larger_targets", String(largerTargets))
        if (largerTargets) {
            document.documentElement.classList.add("larger-targets")
        } else {
            document.documentElement.classList.remove("larger-targets")
        }
    }, [largerTargets])

    // Apply landing section
    useEffect(() => {
        localStorage.setItem("pref_landing", landingSection)
    }, [landingSection])

    const setFontSize = (size: FontSize) => setFontSizeState(size)
    const setDensity = (d: Density) => setDensityState(d)
    const setLandingSection = (s: LandingSection) => setLandingSectionState(s)
    const setReduceMotion = (v: boolean) => setReduceMotionState(v)
    const setLargerTargets = (v: boolean) => setLargerTargetsState(v)

    return (
        <PreferencesContext.Provider value={{
            fontSize, setFontSize,
            density, setDensity,
            landingSection, setLandingSection,
            reduceMotion, setReduceMotion,
            largerTargets, setLargerTargets,
        }}>
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
