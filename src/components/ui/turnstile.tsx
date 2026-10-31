"use client";

import React, { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: (error: unknown) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface TurnstileProps {
  onSuccess: (token: string) => void;
  onError?: (error?: unknown) => void;
  onExpire?: () => void;
  siteKey?: string;
  className?: string;
}

// Cloudflare official test key that always passes:
const DEFAULT_TEST_SITE_KEY = "1x00000000000000000000AA";

export function Turnstile({
  onSuccess,
  onError,
  onExpire,
  siteKey,
  className = "",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const activeSiteKey =
    siteKey ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    DEFAULT_TEST_SITE_KEY;

  useEffect(() => {
    // If turnstile script is not already in document, add it
    const scriptId = "cf-turnstile-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const checkLoaded = () => {
      if (window.turnstile && containerRef.current) {
        setIsLoaded(true);
      }
    };

    const interval = setInterval(() => {
      if (window.turnstile) {
        clearInterval(interval);
        checkLoaded();
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !window.turnstile) return;

    try {
      // Clear any prior widget in this container
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }

      const id = window.turnstile.render(containerRef.current, {
        sitekey: activeSiteKey,
        theme: "light",
        size: "normal",
        callback: (token: string) => {
          onSuccess(token);
        },
        "error-callback": (err: unknown) => {
          console.warn("[Turnstile Error]", err);
          if (onError) onError(err);
        },
        "expired-callback": () => {
          if (onExpire) onExpire();
        },
      });

      widgetIdRef.current = id;
    } catch (renderError) {
      console.warn("[Turnstile Render Exception]", renderError);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }
    };
  }, [isLoaded, activeSiteKey, onSuccess, onError, onExpire]);

  return (
    <div className={`my-2 flex flex-col items-center justify-center ${className}`}>
      <div ref={containerRef} className="min-h-[65px]" />
      <span className="text-[10px] text-charcoal/50 mt-1">
        Cloudflare Turnstile Verified Protection
      </span>
    </div>
  );
}
