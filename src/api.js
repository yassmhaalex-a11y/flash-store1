import { supabase } from "./lib/supabase";
import { categories as demoCategories, products as demoProducts, banners as demoBanners } from "./data";

export async function loadStore(){
  if(!supabase) return {categories:demoCategories,products:demoProducts,banners:demoBanners};
  const [c,p,b] = await Promise.all([
    supabase.from("categories").select("*").eq("is_active",true).order("sort_order"),
    supabase.from("products").select("*").eq("is_active",true).order("created_at",{ascending:false}),
    supabase.from("banners").select("*").eq("is_active",true).order("sort_order")
  ]);
  return {
    categories:c.error || !c.data?.length ? demoCategories : c.data,
    products:p.error || !p.data?.length ? demoProducts : p.data,
    banners:b.error || !b.data?.length ? demoBanners : b.data
  };
}
export async function submitOrder(form,cart){
  const total=cart.reduce((n,p)=>n+p.price*(p.qty||1),0);
  const number=`FLASH-${Date.now().toString().slice(-8)}`;
  if(!supabase) return {order_number:number};
  const {data,error}=await supabase.from("orders").insert({
    order_number:number,customer_name:form.name,phone:form.phone,
    payment_method:form.payment_method,total,status:"pending",
    items:cart.map(p=>({id:p.id,name:p.name,price:p.price,qty:p.qty||1}))
  }).select().single();
  if(error) throw error;
  return data;
}