import "./globals.css";
import { CartProvider } from "@/components/cart-provider";

export const metadata = {
  title: "Flash Store — Digital Gaming Store",
  description: "Flash Store: Xbox, PlayStation, Steam, Game Pass, gift cards and digital gaming products."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}