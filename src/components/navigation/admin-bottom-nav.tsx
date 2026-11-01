"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminBottomItem {
  label: string;
  href: string;
  icon: string;
}

const BOTTOM_ITEMS: AdminBottomItem[] = [
  { label: "Executive", href: "/admin", icon: "🏛️" },
  { label: "CRM Leads", href: "/admin/enquiries", icon: "📬" },
  { label: "Weddings", href: "/admin/weddings", icon: "👑" },
  { label: "Finance", href: "/admin/finance", icon: "💰" },
  { label: "Vendors", href: "/admin/vendors", icon: "⚖️" },
];

export function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-border/80 flex items-center justify-around py-2 px-1 backdrop-blur-md safe-bottom-pad">
      {BOTTOM_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
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
