import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Linked Coin",
  description:
    "Offline-first personal finance and financial history management.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
