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

export function OpusLexBrand({ className = "w-[150px] h-auto" }: { variant?: "light" | "dark", className?: string }) {
    // The variant prop is kept for compatibility in the type signature but the canonical logo colors must not be changed.
    return (
        <img
            src={logoImg}
            alt="OpusLex Brand Logo"
            className={className}
            style={{ objectFit: 'contain' }}
        />
    )
}
