import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import Navbar from "@/components/Navbar";
import { getSession } from "@/lib/auth";

// Disable auto-CSS injection — styles are imported in globals.css
config.autoAddCss = false;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Skills Bowl | SkillsUSA Training",
    template: "%s | Skills Bowl",
  },
  description:
    "Skills Bowl is a CIT-hosted practice platform for SkillsUSA competitors. " +
    "Test your knowledge, track your progress, and sharpen your skills.",
  keywords: ["SkillsUSA", "CIT", "Skills Bowl", "training", "practice", "quiz"],
  authors: [{ name: "CIT" }],
  creator: "CIT",
  applicationName: "Skills Bowl",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"),
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-zinc-100">
        {session && <Navbar user={session} />}
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
