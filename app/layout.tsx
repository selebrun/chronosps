import './globals.css'
import type { Metadata } from 'next'
// Providers
import SessionProvider from '@/app/context/SessionProvider'

export const metadata: Metadata = {
  title: 'Chronos Piso App',
  description: '',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="en" className="[color-scheme:light]">
      <body>
        <SessionProvider>
            <div className="main">
              {children}
            </div>
        </SessionProvider>
      </body>
    </html>
  )
}
