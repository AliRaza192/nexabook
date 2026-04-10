import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NexaBook - Enterprise Cloud ERP",
  description: "Invoicing, Inventory, Payroll, and Accounting — localized for Pakistan and built for the world.",
  keywords: ["ERP", "accounting", "invoicing", "inventory", "payroll", "business software", "cloud ERP"],
  authors: [{ name: "NexaBook" }],
  creator: "NexaBook",
  publisher: "NexaBook",
  metadataBase: new URL("https://nexabook.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nexabook.com",
    title: "NexaBook - Enterprise Cloud ERP",
    description: "Invoicing, Inventory, Payroll, and Accounting — localized for Pakistan and built for the world.",
    siteName: "NexaBook",
  },
  twitter: {
    card: "summary_large_image",
    title: "NexaBook - Enterprise Cloud ERP",
    description: "Invoicing, Inventory, Payroll, and Accounting — localized for Pakistan and built for the world.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#0f172a",
        },
        elements: {
          formButtonPrimary: "bg-nexabook-900 hover:bg-nexabook-800",
          card: "shadow-lg",
          headerTitle: "text-nexabook-900",
          headerSubtitle: "text-nexabook-600",
          socialButtonsBlockButton: "border-nexabook-200 hover:bg-nexabook-50",
          formFieldInput: "border-nexabook-200 focus:border-nexabook-900",
        },
      }}
    >
      <html lang="en">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
