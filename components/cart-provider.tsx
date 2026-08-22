 "use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
  image: string;
};

const CartContext = createContext<any>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem("flash-cart") || "[]"));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("flash-cart", JSON.stringify(items));
  }, [items]);

  const add = (item: CartItem) => {
    setItems((old) => {
      const index = old.findIndex((x) => x.id === item.id && x.variant === item.variant);
      if (index === -1) return [...old, item];
      return old.map((x, i) => i === index ? { ...x, quantity: x.quantity + item.quantity } : x);
    });
  };

  const remove = (id: string, variant?: string) =>
    setItems((old) => old.filter((x) => !(x.id === id && x.variant === variant)));

  const clear = () => setItems([]);

  const total = useMemo(() => items.reduce((s, i) => s + i.price * i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, add, remove, clear, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);