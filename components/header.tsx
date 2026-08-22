 "use client";
import Link from "next/link";
import { useCart } from "./cart-provider";

export function Header({ onMenu }: { onMenu?: () => void }) {
  const { items } = useCart();
  return (
    <header className="header">
      <button className="icon-btn menu-btn" onClick={onMenu}>☰</button>
      <Link href="/" className="brand">
        <img src="/flash-store-logo.png" alt="Flash Store" />
        <span>FLASH <b>STORE</b></span>
      </Link>
      <div className="search"><span>⌕</span><input placeholder="Search for products..." /></div>
      <nav className="header-actions">
        <Link href="/auth">Sign In</Link>
        <Link href="/#favorites">♡ Favorites</Link>
        <Link href="/checkout">🛒 Cart <strong>{items.length}</strong></Link>
      </nav>
    </header>
  );
}