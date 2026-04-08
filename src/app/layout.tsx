import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NexaBook - The All-in-One Operating System for Your Business",
  description: "Invoicing, Inventory, Payroll, and Accounting — localized for Pakistan and built for the world.",
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
