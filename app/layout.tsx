import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Sidebar } from "@/components/ui";

export const metadata: Metadata = {
  title: "Miraggio · Inventory Control Tower",
  description: "Hero SKU replenishment monitor — live days-of-cover, alerts and rebalancing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <StoreProvider>
          <Sidebar />
          <main className="min-h-screen px-5 py-7 md:ml-60 md:px-9">{children}</main>
        </StoreProvider>
      </body>
    </html>
  );
}
