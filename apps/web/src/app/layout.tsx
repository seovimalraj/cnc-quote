import "./globals.css";
import type { Metadata } from "next";
import { OrgSwitcher } from "@/components/nav/OrgSwitcher";

export const metadata: Metadata = {
  title: "cnc-quote",
  description: "Marketing site",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="p-4 border-b">
          <OrgSwitcher />
        </header>
        {children}
      </body>
    </html>
  );
}
