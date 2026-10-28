import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vora Boutique",
  description: "Dashboard de ventas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* applies the saved theme before the first paint (no flash); data-theme is why <html> suppresses hydration warnings */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("tema");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        {/* here and not in each page: it stays mounted across navigations, so the dock's sliding lens is never cut
            short by a remount. Renders nothing without a session (login). */}
        <Nav />
      </body>
    </html>
  );
}
