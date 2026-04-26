import type { Metadata } from "next";
import { Geist_Mono, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Forge",
    template: "%s | Forge",
  },
  description:
    "Forge is an AI workspace for chats, projects, research, strategy, and productivity.",
  keywords: [
    "Forge",
    "AI chat",
    "AI workspace",
    "projects",
    "research assistant",
    "productivity",
  ],
  authors: [{ name: "Forge Team" }],
  creator: "Forge",
  publisher: "Forge",
  metadataBase: new URL("https://yourdomain.com"),
  openGraph: {
    title: "Forge",
    description:
      "Forge is an AI workspace for chats, projects, research, strategy, and productivity.",
    url: "https://yourdomain.com",
    siteName: "Forge",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Forge",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Forge",
    description:
      "Forge is an AI workspace for chats, projects, research, strategy, and productivity.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-screen w-screen overflow-hidden bg-[#111111] text-white">
        <ThemeProvider>
          <Sidebar />
          <main className="flex-1 overflow-hidden">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
