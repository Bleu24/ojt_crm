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
  title: "TeamBabe Team Management System",
  description: "Comprehensive team management and recruitment system for TeamBabe",
  keywords: "team management, recruitment, CRM, TeamBabe, interview scheduling",
  authors: [{ name: "TeamBabe" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="mac-window">
          <div className="mac-header">
            <span className="mac-traffic-light red" />
            <span className="mac-traffic-light yellow" />
            <span className="mac-traffic-light green" />
          </div>
          <main className="mac-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
