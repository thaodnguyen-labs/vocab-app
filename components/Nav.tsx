'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Dashboard', icon: '~' },
  { href: '/vocab', label: 'Vocab', icon: '+' },
  { href: '/import', label: 'Import', icon: '^' },
  { href: '/playlists', label: 'Playlists', icon: '#' },
  { href: '/player', label: 'Player', icon: '>' },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-pb">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {links.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                active ? 'text-primary font-semibold' : 'text-muted'
              }`}
            >
              <span className="text-lg leading-none">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
