import './globals.css'
import type { Metadata } from 'next'
// Providers
import SessionProvider from '@/app/context/SessionProvider'
import { ThemeProvider } from '@/app/context/ThemeContext'

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
    <html lang="en">
      <head>
        {/* Script anti-flash: aplica el tema antes de que React hidrate la página */}
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('chronosps:theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          id="chunk-load-recovery"
          dangerouslySetInnerHTML={{
            __html: `
          (function () {
            var storageKey = 'chronosps:chunk-reload-at';
            var buildStorageKey = 'chronosps:build-id';
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

            function isDeploymentErrorMessage(message) {
              return /ChunkLoadError|Loading chunk|failed to fetch dynamically imported module|Failed to find Server Action|older or newer deployment/i.test(String(message || ''));
            }

            window.addEventListener('error', function (event) {
              var target = event && event.target;
              var src = target && target.src;
              if ((src && src.indexOf('/_next/static/chunks/') !== -1) || isDeploymentErrorMessage(event && event.message)) {
                reloadOnce();
              }
            }, true);

            window.addEventListener('unhandledrejection', function (event) {
              var reason = event && event.reason;
              var message = reason && (reason.message || reason.toString && reason.toString());
              if (isDeploymentErrorMessage(message)) {
                reloadOnce();
              }
            });

            async function checkBuildVersion() {
              try {
                var response = await fetch('/api/app-version?ts=' + Date.now(), {
                  cache: 'no-store',
                  credentials: 'same-origin'
                });
                if (!response.ok) return;

                var data = await response.json();
                var currentBuild = String(data && data.build || '');
                if (!currentBuild) return;

                var previousBuild = sessionStorage.getItem(buildStorageKey);
                if (previousBuild && previousBuild !== currentBuild) {
                  sessionStorage.setItem(buildStorageKey, currentBuild);
                  reloadOnce();
                  return;
                }
                sessionStorage.setItem(buildStorageKey, currentBuild);
              } catch (error) {}
            }

            function startBuildChecks() {
              checkBuildVersion();
              window.setInterval(checkBuildVersion, 15000);
              window.addEventListener('focus', checkBuildVersion);
              document.addEventListener('visibilitychange', function () {
                if (document.visibilityState === 'visible') checkBuildVersion();
              });
            }

            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', startBuildChecks, { once: true });
            } else {
              startBuildChecks();
            }
          })();
        `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <SessionProvider>
            <div className="main">
              {children}
            </div>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
