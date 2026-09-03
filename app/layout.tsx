import type { Metadata } from "next";
import "./globals.css";
import "./creator.css";

export const metadata: Metadata = {
  title: "VibeStudio",
  description:
    "A shared creative workspace where creators and their chosen agents build consistent content together.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
