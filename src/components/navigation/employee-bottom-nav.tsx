"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface EmployeeNavItem {
  label: string;
  href: string;
  icon: string;
}

const EMPLOYEE_NAV: EmployeeNavItem[] = [
  { label: "My Weddings", href: "/employee", icon: "🏰" },
  { label: "Tasks", href: "/employee/tasks", icon: "📋" },
  { label: "Live Day", href: "/employee/live", icon: "⚡" },
  { label: "Timesheets", href: "/employee/timesheets", icon: "⏱️" },
];

export function EmployeeBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-border/80 flex items-center justify-around py-2 px-1 backdrop-blur-md safe-bottom-pad">
      {EMPLOYEE_NAV.map((item) => {
        const isActive =
          item.href === "/employee"
            ? pathname === "/employee"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-medium transition-all ${
              isActive
                ? "text-sage-700 font-bold bg-sage-50 scale-105"
                : "text-charcoal/70 hover:text-sage-700 active:scale-95"
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
