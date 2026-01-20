import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KlarText – Easy Language for Everyone",
  description:
    "Turn dense German or English text into easy-to-understand language. Accessibility-first tool for people with reading difficulties, cognitive impairments, or anyone who needs simpler text.",
  keywords: [
    "easy language",
    "Leichte Sprache",
    "Einfache Sprache",
    "accessibility",
    "text simplification",
    "plain language",
  ],
  authors: [{ name: "KlarText Team" }],
  openGraph: {
    title: "KlarText – Easy Language for Everyone",
    description: "Turn complex text into easy-to-understand language",
    type: "website",
    locale: "de_DE",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c85eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* Preconnect to API for performance */}
        <link
          rel="preconnect"
          href={process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}
        />
      </head>
      <body>
        {/* Skip link for keyboard navigation */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Main content */}
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
