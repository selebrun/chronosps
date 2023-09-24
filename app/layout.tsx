import './globals.css'
import type { Metadata } from 'next'

// Ui Components
import { DashboardNav } from '@/ui/dashboard-nav/dashboard-nav';

export const metadata: Metadata = {
  title: 'Chronos Piso App',
  description: '',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="[color-scheme:dark]">
      <body className="bg-gray-1100 overflow-y-scroll bg-[url('https://piso.chronosps.com:5680/assets/img/fondo.jpg')] pb-36">
        <DashboardNav />

        <div className="lg:pl-72">
          <div className="mx-auto max-w-4xl space-y-8 px-2 pt-20 lg:px-8 lg:py-8">
            <div className="bg-vc-border-gradient rounded-lg p-px shadow-lg shadow-black/20">
              <div className="rounded-lg bg-black p-3.5 lg:p-6">{children}</div>
            </div>
            <p className='text-sm font-medium opacity-50'>©2023, by Chronos</p>
          </div>
        </div>
      </body>
    </html>
  )
}
