/**
 * SegmentedControl — reusable travelling-bubble segmented selector.
 *
 * The single glass bubble tracks:
 *   • the hovered option while the pointer is inside the control
 *   • the selected option when the pointer leaves
 */
import { useState, useEffect, useRef } from "react"

type Option = { value: string; label: string; desc?: string }

type Props = {
    options: Option[]
    value: string
    onChange: (v: string) => void
    size?: "sm" | "md"
}

export function SegmentedControl({ options, value, onChange, size = "sm" }: Props) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [bubble, setBubble] = useState<{ transform: string; width: string; opacity: number }>({
        transform: "translateX(0px)",
        width: "0px",
        opacity: 0,
    })

    const measureAndSet = (idx: number) => {
        if (!containerRef.current) return
        const btns = containerRef.current.querySelectorAll("button")
        const target = btns[idx] as HTMLButtonElement | undefined
        if (!target) return
        setBubble({
            transform: `translateX(${target.offsetLeft}px)`,
            width: `${target.offsetWidth}px`,
            opacity: 1,
        })
    }

    // Re-position bubble whenever hovered/selected changes
    useEffect(() => {
        const selectedIdx = options.findIndex(o => o.value === value)
        const targetIdx = hoveredIdx !== null ? hoveredIdx : selectedIdx
        if (targetIdx === -1) {
            setBubble(prev => ({ ...prev, opacity: 0 }))
            return
        }
        measureAndSet(targetIdx)
    }, [hoveredIdx, value, options])

    // Initial position after mount (layout complete)
    useEffect(() => {
        const selectedIdx = options.findIndex(o => o.value === value)
        if (selectedIdx === -1) return
        measureAndSet(selectedIdx)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const padClass = size === "md"
        ? "px-4 py-2 min-w-[5rem]"
        : "px-3.5 py-1.5 min-w-[2.5rem]"

    return (
        <div
            className="settings-container"
            ref={containerRef}
            onMouseLeave={() => setHoveredIdx(null)}
        >
            {/* Single floating bubble */}
            <div className="glass-bubble" style={bubble} />

            {options.map((opt, i) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    onMouseEnter={() => setHoveredIdx(i)}
                    title={opt.desc}
                    aria-pressed={value === opt.value}
                    className={[
                        "settings-pill relative z-10 flex items-center justify-center",
                        "text-sm whitespace-nowrap transition-colors",
                        padClass,
                        value === opt.value
                            ? "font-semibold text-neutral-900"
                            : "text-neutral-500 hover:text-neutral-800",
                    ].join(" ")}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    )
}
