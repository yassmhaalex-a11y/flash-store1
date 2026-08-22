 "use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Header } from "./header";
import { ProductCard } from "./product-card";
import { getStoreData, Product, Category, Platform, Banner } from "@/lib/store-data";

export function Storefront() {
  const [menu,setMenu]=useState(false);
  const [banner,setBanner]=useState(0);
  const [data,setData]=useState<{products:Product[],categories:Category[],platforms:Platform[],banners:Banner[]}>({products:[],categories:[],platforms:[],banners:[]});

  useEffect(()=>{ getStoreData().then(setData); },[]);
  useEffect(()=>{
    if(data.banners.length<2)return;
    const t=setInterval(()=>setBanner(x=>(x+1)%data.banners.length),6000);
    return()=>clearInterval(t);
  },[data.banners.length]);

  const featured=data.products.filter(p=>p.featured);
  const newly=data.products.filter(p=>Date.now()-new Date(p.created_at).getTime()<60*86400000);
  const current=data.banners[banner];

  return <main>
    <Header onMenu={()=>setMenu(v=>!v)} />
    {menu&&<div className="category-drawer">{data.categories.map(c=><Link key={c.id} href={`/?category=${encodeURIComponent(c.slug)}`}>{c.name}</Link>)}{data.platforms.map(p=><Link key={p.id} href={`/?platform=${encodeURIComponent(p.slug)}`}>{p.name}</Link>)}</div>}

    <section className="hero-wrap">
      <aside className="side-categories"><div className="side-title">CATEGORIES</div>
        {data.categories.map(c=><Link key={c.id} href={`/?category=${encodeURIComponent(c.slug)}`}>› {c.name}</Link>)}
        {data.platforms.map(p=><Link key={p.id} href={`/?platform=${encodeURIComponent(p.slug)}`}>› {p.name}</Link>)}
      </aside>
      <div className="hero" style={current?.image_url?{backgroundImage:`linear-gradient(90deg,rgba(7,8,14,.94),rgba(7,8,14,.35)),url("${current.image_url}")`,backgroundSize:"cover",backgroundPosition:"center"}:undefined}>
        {current ? <>
          <button className="slide-arrow left" onClick={()=>setBanner((banner+data.banners.length-1)%data.banners.length)}>‹</button>
          <div className="hero-content"><p>FLASH STORE</p><h1>{current.title}</h1><div>{current.subtitle}</div>{current.button_text&&<Link className="btn" href={current.target_url||"#products"}>{current.button_text}</Link>}</div>
          <button className="slide-arrow right" onClick={()=>setBanner((banner+1)%data.banners.length)}>›</button>
          <div className="dots">{data.banners.map((_,i)=><span key={i} className={i===banner?"dot active":"dot"}/>)}</div>
        </>:<div className="hero-content"><p>FLASH STORE</p><h1>YOUR DIGITAL GAMING STORE</h1><div>Xbox · PlayStation · Steam · Gift Cards · Subscriptions</div><a className="btn" href="#products">SHOP NOW</a></div>}
      </div>
    </section>

    <ProductSection title="Featured Products" products={featured}/>
    <ProductSection title="Newly Added Products" products={newly}/>

    <section className="discover" id="platforms"><h2>Discover by Platforms</h2><div className="discover-grid">
      {data.platforms.map(p=><Link key={p.id} href={`/?platform=${encodeURIComponent(p.slug)}`} style={p.image_url?{backgroundImage:`linear-gradient(rgba(10,12,20,.65),rgba(10,12,20,.9)),url("${p.image_url}")`,backgroundSize:"cover"}:undefined}><span>⚡</span>{p.name}</Link>)}
    </div></section>

    <section className="discover" id="products"><h2>Discover by Products</h2><div className="discover-grid">
      {data.categories.map(c=><Link key={c.id} href={`/?category=${encodeURIComponent(c.slug)}`} style={c.image_url?{backgroundImage:`linear-gradient(rgba(10,12,20,.65),rgba(10,12,20,.9)),url("${c.image_url}")`,backgroundSize:"cover"}:undefined}><span>🎮</span>{c.name}</Link>)}
    </div></section>

    <footer><div className="footer-brand"><img src="/flash-store-logo.png" alt="Flash Store"/><h2>FLASH STORE</h2><p>Welcome to Flash Store — your destination for digital gaming products, competitive prices and fast support. We bring together Xbox, PlayStation, Steam, subscriptions, gift cards and more.</p></div>
      <div><h3>Quick Links</h3><Link href="/">Homepage</Link><Link href="#products">All Products</Link><Link href="/checkout">Cart</Link><Link href="/auth">Sign In</Link></div>
      <div><h3>Customer Service</h3><a href="mailto:support@flashstore.local">Contact Us</a><a href="#help">Help</a><a href="#faq">FAQ</a></div>
      <div><h3>Legal</h3><a href="#terms">Terms of use</a><a href="#privacy">Privacy Policy</a><a href="#returns">Returns Policy</a></div>
    </footer>
  </main>
}

function ProductSection({title,products}:{title:string;products:Product[]}) {
  const [start,setStart]=useState(0);
  useEffect(()=>{if(!products.length)return;const t=setInterval(()=>setStart(s=>(s+1)%products.length),10000);return()=>clearInterval(t)},[products.length]);
  const visible=products.length<=4?products:Array.from({length:4},(_,i)=>products[(start+i)%products.length]);
  return <section className="products-section"><div className="section-head"><h2>{title}</h2><div><button onClick={()=>setStart(s=>(s+products.length-1)%Math.max(products.length,1))}>‹</button><button onClick={()=>setStart(s=>(s+1)%Math.max(products.length,1))}>›</button></div></div>
    {products.length?<div className="products-grid">{visible.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="empty">No products in this section yet.</div>}
  </section>
}