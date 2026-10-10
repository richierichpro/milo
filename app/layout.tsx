import type { Metadata } from "next";
import { Hind, Rozha_One } from "next/font/google";
import "./globals.css";

// Both by the Indian Type Foundry.
const heading = Rozha_One({ variable: "--font-heading", subsets: ["latin"], weight: "400" });
const body = Hind({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Pakka",
  description: "Group trips for friends in different cities, planned from live Google results.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
