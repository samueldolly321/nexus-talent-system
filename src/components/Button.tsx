import React from "react";

// Bouton réutilisable — centralise le style des boutons de l'application.
// Pour changer l'apparence de TOUS les boutons (couleur, arrondi, taille…),
// il suffit de modifier ce fichier. Variantes calquées sur DESIGN.md :
//  - primary : CTA turquoise plein (accent)
//  - ghost   : discret, fond au survol seulement
//  - outline : bordure fine (actions secondaires)
//  - danger  : rouge (suppression / actions destructrices)
type Variant = "primary" | "ghost" | "outline" | "danger";
type Size = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 font-bold rounded-[8px] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

const SIZES: Record<Size, string> = {
  md: "h-10 px-4 text-sm",
  sm: "h-9 px-3 text-sm",
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent hover:bg-accent-dark text-white shadow-sm",
  ghost: "text-on-surface-variant hover:bg-surface-container-low",
  outline: "border border-outline-variant text-on-surface hover:bg-surface-container-low",
  danger: "bg-error hover:brightness-110 text-white shadow-sm",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
