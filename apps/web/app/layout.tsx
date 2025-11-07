import { Outfit } from 'next/font/google';
import "@/css/globals.css";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Providers } from "./providers";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Frigate Portal",
    default: "Frigate Portal",
  },
  description:
    "Frigate Fast Parts - Instant CNC quotes and manufacturing platform.",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>
            <Providers>
              <NextTopLoader color="#465fff" showSpinner={false} />
              {children}
            </Providers>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}