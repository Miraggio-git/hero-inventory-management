import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Gate } from "@/components/ui";

export const metadata: Metadata = {
  title: "Miraggio · Inventory Control Tower",
  description: "Hero SKU replenishment — live cover, alerts, orders, fulfillment and scanning.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <StoreProvider>
          <Gate>{children}</Gate>
        </StoreProvider>
      </body>
    </html>
  );
}
