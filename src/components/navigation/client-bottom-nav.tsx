"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ClientNavItem {
  label: string;
  href: string;
  icon: string;
}

const CLIENT_NAV: ClientNavItem[] = [
  { label: "Overview", href: "/client", icon: "🏰" },
  { label: "Requests", href: "/client/requests", icon: "📝" },
  { label: "Proposal", href: "/client/proposal", icon: "📋" },
  { label: "Agreement", href: "/client/agreement", icon: "✍️" },
  { label: "Messages", href: "/client/messages", icon: "💬" },
];

export function ClientBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-border/80 flex items-center justify-around py-2 px-1 backdrop-blur-md safe-bottom-pad">
      {CLIENT_NAV.map((item) => {
        const isActive =
          item.href === "/client"
            ? pathname === "/client"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all ${
              isActive
                ? "text-maroon font-bold bg-maroon/10 scale-105"
                : "text-charcoal/70 hover:text-maroon active:scale-95"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
