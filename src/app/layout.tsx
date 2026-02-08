import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "zerodraft.so | Write with intent, not prompts.",
  description: "Agentic Workspace for Product Managers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Source+Serif+4:opsz,wght@8..60,400;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white font-sans text-gray-900 min-h-screen selection:bg-gray-200">
        {children}
      </body>
    </html>
  );
}
