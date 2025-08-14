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
  viewport: 'width=device-width, initial-scale=1',
  manifest: '/manifest.json',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0055aa' },
    { media: '(prefers-color-scheme: dark)', color: '#0055aa' }
  ],
  icons: [
    { rel: 'icon', url: '/icon-192x192.png' },
    { rel: 'apple-touch-icon', url: '/icon-192x192.png' }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="safe-top">
          {/* Place your navigation or top bar here if needed */}
        </header>
        {children}
      </body>
    </html>
  );
}
