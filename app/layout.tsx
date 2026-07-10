import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Class Teacher Contact Table Generator",
  description: "Extract, review, and export parent-letter teacher contact tables.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
