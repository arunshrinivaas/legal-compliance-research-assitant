import logoImg from '../assets/OpusLexLogoCanonical.png';

export function OpusLexSymbol({ className }: { className?: string }) {
    return (
        <img 
            src={logoImg} 
            alt="OpusLex Logo" 
            className={className} 
            style={{ objectFit: 'contain' }}
        />
    )
}

export function OpusLexBrand({ variant = "light" }: { variant?: "light" | "dark" }) {
    return (
        <div className="flex items-center gap-3">
            <OpusLexSymbol className="w-7 h-7" />
            <span 
                className={`text-xl font-bold tracking-tight ${variant === "dark" ? "text-white" : "text-neutral-900"}`} 
                style={{ letterSpacing: "-0.02em" }}
            >
                OpusLex
            </span>
        </div>
    )
}
