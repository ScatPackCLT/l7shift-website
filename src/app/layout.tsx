import type { Metadata } from 'next'
import './globals.css'
import { TimeTracker } from '@/components/shared/TimeTracker'

export const metadata: Metadata = {
  title: 'L7 Shift | Strategy. Systems. Solutions.',
  description: 'Digital transformation for the non-conformist. Technology solutions, brand strategy, and business innovation.',
  metadataBase: new URL('https://l7shift.com'),
  manifest: '/manifest.json',
  openGraph: {
    title: 'L7 Shift | Strategy. Systems. Solutions.',
    description: 'Digital transformation for the non-conformist. We build what others won\'t.',
    siteName: 'L7 Shift',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'L7 Shift | Strategy. Systems. Solutions.',
    description: 'Digital transformation for the non-conformist.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <TimeTracker />
      </body>
    </html>
  )
}
