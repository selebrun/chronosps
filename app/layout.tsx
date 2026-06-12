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
      <head>
        <script
          id="chunk-load-recovery"
          dangerouslySetInnerHTML={{
            __html: `
          (function () {
            var storageKey = 'chronosps:chunk-reload-at';
            var reloadDelayMs = 10000;

            function reloadOnce() {
              try {
                var lastReload = Number(sessionStorage.getItem(storageKey) || '0');
                var now = Date.now();
                if (now - lastReload < reloadDelayMs) return;
                sessionStorage.setItem(storageKey, String(now));
              } catch (error) {}
              window.location.reload();
            }

            function isChunkErrorMessage(message) {
              return /ChunkLoadError|Loading chunk|failed to fetch dynamically imported module/i.test(String(message || ''));
            }

            window.addEventListener('error', function (event) {
              var target = event && event.target;
              var src = target && target.src;
              if ((src && src.indexOf('/_next/static/chunks/') !== -1) || isChunkErrorMessage(event && event.message)) {
                reloadOnce();
              }
            }, true);

            window.addEventListener('unhandledrejection', function (event) {
              var reason = event && event.reason;
              var message = reason && (reason.message || reason.toString && reason.toString());
              if (isChunkErrorMessage(message)) {
                reloadOnce();
              }
            });
          })();
        `,
          }}
        />
      </head>
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
