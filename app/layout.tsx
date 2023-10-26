import type { Metadata } from 'next'
import './globals.css'
// Providers
import AuthProvider from './context/AuthProvider'

export const metadata: Metadata = {
  title: 'Chronos Piso App',
  description: '',
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  
  return (
    <html lang="en" className="[color-scheme:light]">
      <body >
        <AuthProvider>
          <div className="main">
            <div >{children}</div>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
