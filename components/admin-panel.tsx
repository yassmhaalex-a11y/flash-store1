 "use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

const emptyProduct={name:"",slug:"",description:"",image_url:"",price:"0",category_id:"",platform_id:"",featured:false};
const emptySimple={name:"",slug:"",image_url:"",sort_order:"0"};
const emptyBanner={title:"",subtitle:"",image_url:"",button_text:"SHOP NOW",target_url:"#products",sort_order:"0"};

export function AdminPanel(){
  const [sb]=useState(()=>supabaseBrowser());
  const [ready,setReady]=useState(false),[allowed,setAllowed]=useState(false),[tab,setTab]=useState("orders"),[msg,setMsg]=useState("");
  const [orders,setOrders]=useState<any[]>([]),[products,setProducts]=useState<any[]>([]),[categories,setCategories]=useState<any[]>([]),[platforms,setPlatforms]=useState<any[]>([]),[banners,setBanners]=useState<any[]>([]);
  const [product,setProduct]=useState<any>(emptyProduct),[cat,setCat]=useState<any>(emptySimple),[platform,setPlatform]=useState<any>(emptySimple),[banner,setBanner]=useState<any>(emptyBanner);
  const [variant,setVariant]=useState({product_id:"",name:"",price:"0",stock:""}); const [editing,setEditing]=useState<string|null>(null);

  async function load(){
    if(!sb)return setMsg("Add Supabase environment variables first.");
    const {data:{user}}=await sb.auth.getUser(); setReady(true);
    if(!user)return setMsg("Please sign in first.");
    const {data:profile}=await sb.from("profiles").select("role").eq("id",user.id).single();
    if(profile?.role!=="admin")return setMsg("Access denied — this account is not an admin.");
    setAllowed(true);
    const [o,p,c,pl,b]=await Promise.all([
      sb.from("orders").select("*").order("created_at",{ascending:false}),
      sb.from("products").select("*,product_variants(*)").order("created_at",{ascending:false}),
      sb.from("categories").select("*").order("sort_order"),
      sb.from("platforms").select("*").order("sort_order"),
      sb.from("banners").select("*").order("sort_order")
    ]);
    setOrders(o.data||[]);setProducts(p.data||[]);setCategories(c.data||[]);setPlatforms(pl.data||[]);setBanners(b.data||[]);
  }
  useEffect(()=>{load()},[]);

  async function save(table:string,data:any,id?:string){
    if(!sb)return;
    const clean={...data}; delete clean.id; delete clean.created_at; delete clean.product_variants;
    const q=id?sb.from(table).update(clean).eq("id",id):sb.from(table).insert(clean);
    const {error}=await q; if(error)setMsg(error.message); else {setMsg("Saved.");await load();}
  }
  async function del(table:string,id:string){if(!sb)return;if(!confirm("Delete this item?"))return;const {error}=await sb.from(table).delete().eq("id",id);if(error)setMsg(error.message);else await load();}
  async function setOrderStatus(id:string,status:string){if(!sb)return;await sb.from("orders").update({status}).eq("id",id);await load();}
  async function saveProduct(){
    const data={...product,price:Number(product.price)||0,slug:product.slug||product.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-")};
    const id=editing ?? undefined; await save("products",data,id);
    setProduct(emptyProduct);setEditing(null);
  }
  async function addVariant(){if(!sb||!variant.product_id||!variant.name)return;const {error}=await sb.from("product_variants").insert({...variant,price:Number(variant.price)||0,stock:variant.stock===""?null:Number(variant.stock)});if(error)setMsg(error.message);else{setMsg("Variant added.");setVariant({product_id:"",name:"",price:"0",stock:""});await load();}}

  if(!ready||!allowed)return <main className="center-page"><div className="auth-card"><Link href="/" className="brand auth-brand"><img src="/flash-store-logo.png" alt="Flash Store"/><span>FLASH <b>STORE</b></span></Link><h1>Admin Panel</h1><p>{msg||"Loading..."}</p>{msg.includes("sign in")&&<Link className="btn" href="/auth">Sign In</Link>}</div></main>;

  const nav=["orders","products","categories","platforms","banners"];
  return <main className="admin-page"><div className="admin-top"><Link href="/">← Store</Link><b>FLASH STORE ADMIN</b><button onClick={async()=>{await sb?.auth.signOut();location.href="/"}}>Logout</button></div>
    <div className="admin-tabs">{nav.map(x=><button className={tab===x?"active":""} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div>
    {msg&&<div className="admin-message">{msg}<button onClick={()=>setMsg("")}>×</button></div>}

    {tab==="orders"&&<section className="admin-card"><div className="section-head"><h1>Orders</h1><span>{orders.length} orders</span></div>{orders.map(o=><div className="admin-order" key={o.id}><div><b>{o.order_number}</b><span>{o.customer_name} · {o.phone}</span></div><div>{o.payment_method}</div><strong>{o.total} EGP</strong><select value={o.status} onChange={e=>setOrderStatus(o.id,e.target.value)}><option>pending</option><option>confirmed</option><option>processing</option><option>completed</option><option>cancelled</option></select></div>)}</section>}

    {tab==="products"&&<section className="admin-card"><div className="section-head"><h1>Products</h1><button className="btn small" onClick={()=>{setProduct(emptyProduct);setEditing(null)}}>New Product</button></div>
      <div className="admin-form">{["name","slug","description","image_url","price"].map(k=><label key={k}>{k}<input value={product[k]} onChange={e=>setProduct({...product,[k]:e.target.value})}/></label>)}
        <label>Category<select value={product.category_id} onChange={e=>setProduct({...product,category_id:e.target.value})}><option value="">None</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Platform<select value={product.platform_id} onChange={e=>setProduct({...product,platform_id:e.target.value})}><option value="">None</option>{platforms.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="check"><input type="checkbox" checked={!!product.featured} onChange={e=>setProduct({...product,featured:e.target.checked})}/> Featured</label>
        <button className="btn" onClick={saveProduct}>{editing?"Update Product":"Add Product"}</button>
      </div>
      <div className="admin-list">{products.map(p=><div className="admin-row" key={p.id}><div><b>{p.name}</b><span>{p.price} EGP · {p.active?"Active":"Hidden"}</span></div><div><button onClick={()=>{setProduct({...p,price:String(p.price)});setEditing(p.id)}}>Edit</button><button onClick={()=>del("products",p.id)}>Delete</button></div></div>)}</div>
      <div className="variant-box"><h2>Product Variants</h2><div className="admin-form"><label>Product<select value={variant.product_id} onChange={e=>setVariant({...variant,product_id:e.target.value})}><option value="">Select</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Variant name<input value={variant.name} onChange={e=>setVariant({...variant,name:e.target.value})}/></label><label>Price<input value={variant.price} onChange={e=>setVariant({...variant,price:e.target.value})}/></label><label>Stock (blank = unlimited)<input value={variant.stock} onChange={e=>setVariant({...variant,stock:e.target.value})}/></label><button className="btn" onClick={addVariant}>Add Variant</button></div></div>
    </section>}

    {tab==="categories"&&<Crud title="Categories" table="categories" items={categories} form={cat} setForm={setCat} save={save} del={del} empty={emptySimple}/>}
    {tab==="platforms"&&<Crud title="Platforms" table="platforms" items={platforms} form={platform} setForm={setPlatform} save={save} del={del} empty={emptySimple}/>}
    {tab==="banners"&&<Crud title="Hero Banners" table="banners" items={banners} form={banner} setForm={setBanner} save={save} del={del} empty={emptyBanner} banner/>}
  </main>
}

function Crud({title,table,items,form,setForm,save,del,empty,banner}:{title:string;table:string;items:any[];form:any;setForm:any;save:any;del:any;empty:any;banner?:boolean}){
 const [edit,setEdit]=useState<string|null>(null);
 const fields=banner?["title","subtitle","image_url","button_text","target_url","sort_order"]:["name","slug","image_url","sort_order"];
 return <section className="admin-card"><div className="section-head"><h1>{title}</h1><button className="btn small" onClick={()=>{setForm(empty);setEdit(null)}}>New</button></div>
  <div className="admin-form">{fields.map(k=><label key={k}>{k}<input value={form[k]||""} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}<button className="btn" onClick={async()=>{await save(table,{...form,sort_order:Number(form.sort_order)||0},edit||undefined);setForm(empty);setEdit(null)}}>{edit?"Update":"Add"}</button></div>
  <div className="admin-list">{items.map(x=><div className="admin-row" key={x.id}><div><b>{banner?x.title:x.name}</b><span>{x.slug||x.target_url||""}</span></div><div><button onClick={()=>{setForm({...x,sort_order:String(x.sort_order??0)});setEdit(x.id)}}>Edit</button><button onClick={()=>del(table,x.id)}>Delete</button></div></div>)}</div>
 </section>
}
