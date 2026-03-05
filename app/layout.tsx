import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Grimoire',
  description: 'Blood on the Clocktower Storyteller Tool',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Grimoire',
  },
};

export const viewport: Viewport = {
  themeColor: '#1a0a2e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/imp.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body>
        {children}
        <div style={{
          position: 'fixed',
          bottom: 8,
          right: 10,
          fontSize: 10,
          opacity: 0.35,
          color: '#fff',
          pointerEvents: 'none',
          zIndex: 9999,
          fontFamily: 'monospace',
        }}>
          v3
        </div>
      </body>
    </html>
  );
}
