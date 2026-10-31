import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  href?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  knotOnly?: boolean;
}

export function GoldKnotIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-6 h-6 inline-block shrink-0", className)}
      aria-hidden="true"
    >
      {/* Signature Heritage Infinity Knot */}
      <path
        d="M16 6C12 6 9 9 9 13C9 17 14 20 16 22C18 20 23 17 23 13C23 9 20 6 16 6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="16"
        cy="13"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6 16C6 12 9 9 13 9C17 9 20 14 22 16C20 18 17 23 13 23C9 23 6 20 6 16Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.8"
      />
      <path
        d="M26 16C26 20 23 23 19 23C15 23 12 18 10 16C12 14 15 9 19 9C23 9 26 12 26 16Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.8"
      />
      <circle cx="16" cy="25" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function Logo({
  href = "/",
  size = "md",
  showTagline = false,
  knotOnly = false,
  className,
  ...props
}: LogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  };

  const knotSizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-10 h-10",
  };

  const content = (
    <div
      className={cn("flex items-center gap-2.5 select-none", className)}
      {...props}
    >
      <span className="text-gold-400 group-hover:text-gold-300 transition-colors">
        <GoldKnotIcon className={knotSizeClasses[size]} />
      </span>

      {!knotOnly && (
        <div className="flex flex-col">
          <span
            className={cn(
              "font-serif tracking-widest font-semibold uppercase text-maroon leading-none",
              sizeClasses[size]
            )}
          >
            {BRAND.name}
          </span>
          {showTagline && (
            <span className="text-[10px] tracking-[0.2em] uppercase text-charcoal/60 mt-1 font-sans">
              Luxury Weddings
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
        aria-label={`${BRAND.name} - Home`}
      >
        {content}
      </Link>
    );
  }

  return content;
}
