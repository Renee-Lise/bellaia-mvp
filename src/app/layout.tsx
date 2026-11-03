import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : undefined,
  title: "Bellaïa — Bella'Studio",
  description: "L'application Bella'Studio — Boutique, réservations, événements",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bellaïa",
  },
  openGraph: {
    title: "Bellaïa — Bella'Studio",
    description: "L'application Bella'Studio — Boutique, réservations, événements",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Bellaïa" }],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bellaïa — Bella'Studio",
    description: "L'application Bella'Studio — Boutique, réservations, événements",
    images: ["/og-image.png"],
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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png"/>
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png"/>
        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png"/>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"/>
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png"/>
        <link rel="shortcut icon" href="/favicon-32.png"/>
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
