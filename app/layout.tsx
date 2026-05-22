import type { Metadata } from "next";
import { Geist_Mono, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { FeedbackProvider } from "@/components/feedback-provider";
import { AppShell } from "@/components/app-shell";

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
      suppressHydrationWarning
      className={`${manrope.variable} ${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FeedbackProvider>
            <KeyboardShortcuts />
            <AppShell>{children}</AppShell>
          </FeedbackProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
