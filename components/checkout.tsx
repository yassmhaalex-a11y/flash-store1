 "use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "./cart-provider";
import { supabaseBrowser } from "@/lib/supabase";

export function Checkout() {
  const { items, total, remove, clear } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState("Vodafone Cash");
  const [order, setOrder] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length) return;
    setBusy(true);
    const sb = supabaseBrowser();
    const { data } = sb ? await sb.auth.getUser() : { data: { user: null } };
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ customerName: name, phone, paymentMethod: payment, items, total, userId: data.user?.id })
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return alert(json.error || "Order failed");
    setOrder(json.orderNumber);
    clear();
  }

  if (order) return <main className="center-page"><div className="success-card"><div className="success-icon">✓</div><h1>Order received!</h1><p>Your order number is</p><strong className="order-number">{order}</strong><p>We will contact you shortly to confirm the order and payment.</p><Link className="btn" href="/">Back to store</Link></div></main>;

  return (
    <main>
      <div className="simple-top"><Link href="/">← Flash Store</Link></div>
      <div className="checkout">
        <div><h1>Checkout</h1><p className="muted">Manual payment confirmation — no fake payment processing.</p>{items.map((i: import("./cart-provider").CartItem) => <div className="checkout-item" key={i.id + i.variant}><img src={i.image} /><div><b>{i.name}</b><span>{i.variant} × {i.quantity}</span></div><strong>{i.price * i.quantity} EGP</strong><button onClick={() => remove(i.id, i.variant)}>×</button></div>)}</div>
        <form onSubmit={submit} className="checkout-form">
          <h2>Your details</h2><label>Full name<input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label>
          <label>Phone number<input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" /></label>
          <label>Payment method<select value={payment} onChange={e => setPayment(e.target.value)}><option>Vodafone Cash</option><option>Telda</option><option>InstaPay</option></select></label>
          <div className="total"><span>Total</span><b>{total} EGP</b></div>
          <button disabled={busy || !items.length} className="btn">{busy ? "Creating order..." : "Confirm Order"}</button>
        </form>
      </div>
    </main>
  );
}
