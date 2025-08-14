import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'TeamBabe Team Management System',
  description: 'Comprehensive team management and recruitment system for TeamBabe',
  keywords: 'team management, recruitment, CRM, TeamBabe, interview scheduling',
  authors: [{ name: 'TeamBabe' }],
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover', // Ensures content stretches under iOS notch
  manifest: '/manifest.json', // Enables PWA features
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0055aa' }, // Brand color for light mode
    { media: '(prefers-color-scheme: dark)', color: '#0055aa' }   // Brand color for dark mode
  ],
  appleWebApp: {
    capable: true, // Enables iOS PWA full-screen
    statusBarStyle: 'black-translucent', // Blends status bar with app background
    title: 'TeamBabe CRM', // Sets app name on iOS home screen
  },
  icons: [
    { rel: 'icon', url: '/icon-192x192.png' }, // Standard PWA icon
    { rel: 'apple-touch-icon', url: '/icon-192x192.png' } // iOS home screen icon
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/*
        For iOS PWA blending:
        - Apply .bleed to <body> to prevent white bar at bottom and stretch under notch.
        - Apply .safe-top to <header> to ensure content is not hidden under the notch.
      */}
      <body className={`bleed ${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="safe-top">
          {/* Top navigation or branding goes here */}
        </header>
        {children}
      </body>
    </html>
  );
}
