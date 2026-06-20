import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Bellaïa — Bella'Studio",
  description: "L'application Bella'Studio — Boutique, réservations, événements",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bellaïa",
  },
  other: {
    // Apple PWA
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Bellaïa",
    "apple-touch-fullscreen": "yes",
    // Microsoft
    "msapplication-TileColor": "#0d0b12",
    "msapplication-tap-highlight": "no",
    // Mobile
    "mobile-web-app-capable": "yes",
    "format-detection": "telephone=no",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#0d0b12" },
    { media: "(prefers-color-scheme: light)", color: "#0d0b12" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png"/>
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png"/>
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png"/>
        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-192.png"/>
        <link rel="shortcut icon" href="/icon-192.png"/>
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        background: "#0d0b12",
        WebkitTapHighlightColor: "transparent",
        WebkitUserSelect: "none",
        overscrollBehavior: "none",
      }}>
        {children}
      </body>
    </html>
  );
}
