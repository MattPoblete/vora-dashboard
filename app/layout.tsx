import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

// self-hosted at build time: no request to Google from the browser
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// display serif: titles, big figures and the wordmark
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "Vora Boutique",
  description: "Dashboard de ventas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`h-full antialiased ${inter.variable} ${fraunces.variable}`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* here and not in each page: it stays mounted across navigations. Renders nothing without a session (login). */}
        <Nav />
      </body>
    </html>
  );
}
