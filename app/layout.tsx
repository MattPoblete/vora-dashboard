import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vora Boutique",
  description: "Dashboard de ventas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        {/* here and not in each page: it stays mounted across navigations, so the dock's sliding lens is never cut
            short by a remount. Renders nothing without a session (login). */}
        <Nav />
      </body>
    </html>
  );
}
