import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Formwork — Product to Rhino",
  description: "A considered product library. Verified specifications, clean Rhino geometry.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
