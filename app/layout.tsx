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
      <body className="antialiased">{process.env.NEXT_PUBLIC_FORMWORK_DEMO === '1' && <div style={{padding:'8px 20px',background:'#fff3cf',color:'#433b26',fontSize:13}}>Demo: records and files stay in this browser only. Clearing site data removes them.</div>}{children}</body>
    </html>
  );
}
