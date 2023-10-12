import './globals.css'
import type { Metadata } from 'next'

// Ui Components
import { BreadcrumbsBar } from '@/ui/breadcrumbs-bar/breadcrumbs-bar';
import { DashboardNav } from '@/ui/dashboard-nav/dashboard-nav';

// Providers
import AuthProvider from './context/AuthProvider'

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
