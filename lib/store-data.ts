import { supabaseBrowser } from "./supabase";

export type Variant = { id:string; product_id:string; name:string; price:number; stock:number|null; active:boolean };
export type Product = { id:string; name:string; slug:string; description:string|null; image_url:string|null; price:number; category_id:string|null; platform_id:string|null; featured:boolean; active:boolean; created_at:string; variants?:Variant[] };
export type Category = { id:string; name:string; slug:string; image_url:string|null; sort_order:number; active:boolean };
export type Platform = { id:string; name:string; slug:string; image_url:string|null; sort_order:number; active:boolean };
export type Banner = { id:string; title:string; subtitle:string|null; image_url:string|null; button_text:string|null; target_url:string|null; sort_order:number; active:boolean };

export async function getStoreData() {
  const sb=supabaseBrowser();
  if(!sb) return {products:[],categories:[],platforms:[],banners:[]};
  const [{data:products},{data:categories},{data:platforms},{data:banners}] = await Promise.all([
    sb.from("products").select("*, product_variants(*)").eq("active",true).order("created_at",{ascending:false}),
    sb.from("categories").select("*").eq("active",true).order("sort_order"),
    sb.from("platforms").select("*").eq("active",true).order("sort_order"),
    sb.from("banners").select("*").eq("active",true).order("sort_order")
  ]);
  return {
    products:(products||[]).map((p:any)=>({...p,variants:p.product_variants||[]})),
    categories:categories||[], platforms:platforms||[], banners:banners||[]
  };
}