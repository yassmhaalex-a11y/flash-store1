import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function makeOrderNumber() {
  const stamp = Date.now().toString().slice(-8);
  return `FS-${stamp}`;
}

export async function POST(req: Request) {
  try {
    const { customerName, phone, paymentMethod, items, total, userId } = await req.json();
    if (!customerName || !phone || !paymentMethod || !Array.isArray(items) || !items.length) {
      return NextResponse.json({ error: "Please complete all checkout fields." }, { status: 400 });
    }

    const number = makeOrderNumber();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      const supabase = createClient(url, key);
      const { error } = await supabase.from("orders").insert({
        order_number: number,
        customer_name: customerName,
        phone,
        payment_method: paymentMethod,
        items,
        total: Number(total) || 0,
        user_id: userId || null,
        status: "pending"
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Optional WhatsApp Business notification.
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const adminTo = process.env.WHATSAPP_ADMIN_TO;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v23.0";

    if (token && phoneNumberId && adminTo) {
      const text =
        `🔥 Flash Store - New Order\n\n` +
        `Order: ${number}\nCustomer: ${customerName}\nPhone: ${phone}\n` +
        `Payment method: ${paymentMethod}\nTotal: ${Number(total) || 0} EGP\n\n` +
        items.map((i: any) => `• ${i.name} × ${i.quantity}${i.variant ? ` — ${i.variant}` : ""}`).join("\n");

      await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: adminTo,
          type: "text",
          text: { body: text }
        })
      });
    }

    return NextResponse.json({ orderNumber: number });
  } catch (e) {
    return NextResponse.json({ error: "Could not create order." }, { status: 500 });
  }
}