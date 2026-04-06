import type { Metadata } from "next";
import { Inter, Nunito, Playfair_Display } from "next/font/google";
import "./globals.css";
import "@/styles/maintenx.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "MaintenX – Facility Maintenance Portal",
  description: "Raise and track facility maintenance complaints with role-based workflows and company/location scope.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} ${nunito.variable} ${playfair.variable} bg-background text-foreground antialiased transition-colors duration-300`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
