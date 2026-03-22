"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/ThemeContext";
import { Sun, Moon, Archive, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getArchiveCount } from "@/hooks/useArchive";

const links = [
  { href: "/speak",     label: "Archive"   },
  { href: "/discover",  label: "Discover"  },
  { href: "/heirloom",  label: "Heirloom"  },
  { href: "/community", label: "Community" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [count, setCount] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function refresh() { setCount(getArchiveCount()); }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("echoes:saved", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("echoes:saved", refresh);
    };
  }, []);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl"
    >
      <nav
        style={{
          background: "rgba(10,8,4,0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(201,150,58,0.18)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(201,150,58,0.04)",
        }}
        className="relative flex items-center justify-between px-4 py-2.5 rounded-full"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <span
            style={{ color: "#c9963a", textShadow: "0 0 20px rgba(201,150,58,0.5)" }}
            className="text-sm font-bold tracking-[0.25em] uppercase"
          >
            Echoes
          </span>
          <div style={{ background: "linear-gradient(to bottom, transparent, rgba(201,150,58,0.3), transparent)", width: "1px", height: "16px" }} />
          <span style={{ color: "#5a4a38" }} className="text-[9px] tracking-[0.3em] uppercase hidden sm:block">
            Living Archives
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-0.5">
          {links.map((link, index) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3.5 py-1.5 text-xs tracking-[0.15em] uppercase transition-colors duration-200"
                style={{ color: active ? "#e8b95a" : hoveredIndex === index ? "#c9963a" : "#7a6550" }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {(hoveredIndex === index || active) && (
                  <motion.div
                    layoutId="navbar-hover"
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: active ? "rgba(201,150,58,0.12)" : "rgba(201,150,58,0.07)",
                      border: active ? "1px solid rgba(201,150,58,0.3)" : "1px solid rgba(201,150,58,0.15)",
                    }}
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right side: My Archive + theme toggle */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {/* My Archive icon with badge */}
          <Link
            href="/my-archive"
            title="My Archive"
            style={{
              color: pathname.startsWith("/my-archive") ? "#e8b95a" : "#7a6550",
              background: pathname.startsWith("/my-archive") ? "rgba(201,150,58,0.12)" : "transparent",
              border: pathname.startsWith("/my-archive") ? "1px solid rgba(201,150,58,0.3)" : "1px solid transparent",
            }}
            className="relative w-8 h-8 rounded-full flex items-center justify-center hover:text-[#c9963a] hover:border-[rgba(201,150,58,0.2)] transition-all"
          >
            <Archive size={13} />
            {count > 0 && (
              <span
                style={{
                  background: "#c9963a",
                  color: "#0a0804",
                  fontSize: "7px",
                  lineHeight: 1,
                  fontWeight: 700,
                  minWidth: "13px",
                  height: "13px",
                }}
                className="absolute -top-0.5 -right-0.5 rounded-full flex items-center justify-center px-0.5"
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={theme === "dark" ? "Switch to sepia mode" : "Switch to dark mode"}
            style={{
              color: theme === "sepia" ? "#c9963a" : "#7a6550",
              border: `1px solid ${theme === "sepia" ? "rgba(201,150,58,0.35)" : "transparent"}`,
              background: theme === "sepia" ? "rgba(201,150,58,0.12)" : "transparent",
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:text-[#c9963a] hover:border-[rgba(201,150,58,0.2)] transition-all"
          >
            {theme === "sepia" ? <Moon size={13} /> : <Sun size={13} />}
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 transition-colors"
          style={{ color: "#7a6550" }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{
            background: "rgba(10,8,4,0.95)",
            border: "1px solid rgba(201,150,58,0.18)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
          className="absolute top-full left-0 right-0 mt-2 p-3 rounded-2xl"
        >
          <div className="flex flex-col gap-1">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    color: active ? "#e8b95a" : "#7a6550",
                    background: active ? "rgba(201,150,58,0.08)" : "transparent",
                  }}
                  className="px-4 py-2.5 text-xs tracking-[0.15em] uppercase rounded-xl hover:text-[#c9963a] transition-colors"
                >
                  {link.label}
                </Link>
              );
            })}
            <div style={{ borderTop: "1px solid rgba(201,150,58,0.1)" }} className="my-1" />
            <div className="flex items-center justify-between px-2">
              <Link
                href="/my-archive"
                onClick={() => setMobileOpen(false)}
                style={{ color: "#7a6550" }}
                className="flex items-center gap-2 text-xs tracking-[0.15em] uppercase hover:text-[#c9963a] transition-colors py-2"
              >
                <Archive size={13} />
                My Archive
                {count > 0 && (
                  <span style={{ background: "#c9963a", color: "#0a0804", fontSize: "8px", fontWeight: 700 }}
                    className="rounded-full px-1.5 py-0.5">
                    {count}
                  </span>
                )}
              </Link>
              <button
                onClick={toggle}
                style={{ color: "#7a6550" }}
                className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase hover:text-[#c9963a] transition-colors py-2"
              >
                {theme === "sepia" ? <Moon size={13} /> : <Sun size={13} />}
                {theme === "sepia" ? "Dark" : "Sepia"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
