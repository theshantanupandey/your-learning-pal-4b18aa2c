'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/tutor', label: 'Learn' },
    { href: '/call', label: 'Call' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <nav style={s.nav}>
      <div style={s.inner}>
        <Link href="/" style={s.logo}>
          <span style={s.logoMark}>T</span>
          <span style={s.logoText}>Taksh</span>
        </Link>

        <div style={s.links}>
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                ...s.link,
                ...(pathname === link.href ? s.linkActive : {}),
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

const s = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    background: '#0a0a0a',
    borderBottom: '1px solid #2a2a2a',
    height: 48,
  },
  inner: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '0 24px',
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    textDecoration: 'none',
  },
  logoMark: {
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fafafa',
    color: '#0a0a0a',
    fontWeight: 700,
    fontSize: 14,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  logoText: {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: '-0.02em',
  },
  links: {
    display: 'flex',
    gap: 0,
  },
  link: {
    padding: '0 16px',
    height: 48,
    display: 'flex',
    alignItems: 'center',
    fontSize: 13,
    color: '#888',
    textDecoration: 'none',
    borderBottom: '1px solid transparent',
    transition: 'color 100ms',
  },
  linkActive: {
    color: '#fafafa',
    borderBottomColor: '#fafafa',
  },
};
