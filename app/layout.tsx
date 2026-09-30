import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { InstallBanner } from "@/components/install-banner";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for the "Abduct" wordmark and headings: bold and a little quirky, like the logo.
const brand = Bricolage_Grotesque({
  variable: "--font-brand",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Abduct", template: "%s · Abduct" },
  description: "Lists of movies, series and anime to watch, and a UFO that picks one when you can't decide.",
  applicationName: "Abduct",
  // Added to an iPhone's home screen, Abduct opens in its own window like an app.
  appleWebApp: { capable: true, title: "Abduct", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0a09",
  // Installed, the app draws under the notch and home bar; bars pad themselves with safe-area insets.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${brand.variable} dark h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ServiceWorker />
        <InstallBanner />
        {children}
      </body>
    </html>
  );
}
