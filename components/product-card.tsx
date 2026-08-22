 "use client";
import { useState } from "react";
import { Product } from "@/lib/store-data";
import { useCart } from "./cart-provider";

export function ProductCard({product}:{product:Product}) {
  const {add}=useCart();
  const variants=product.variants?.filter(v=>v.active) || [];
  const [variant,setVariant]=useState(variants[0] || {id:"base",name:"Standard",price:Number(product.price)});
  return <article className="product-card">
    <div className="product-image">{product.image_url?<img src={product.image_url} alt={product.name}/>:<img src="/flash-store-logo.png" alt="Flash Store"/>}</div>
    <div className="product-meta"><small>{product.name}</small><h3>{product.name}</h3><p>{product.description||"Digital gaming product."}</p></div>
    {variants.length>0&&<select value={variant.id} onChange={e=>setVariant(variants.find(v=>v.id===e.target.value)||variants[0])}>{variants.map(v=><option key={v.id} value={v.id}>{v.name} — {v.price} EGP</option>)}</select>}
    <div className="price-row"><b>{Number(variant.price).toLocaleString()} EGP</b><button className="btn small" onClick={()=>add({id:product.id,name:product.name,price:Number(variant.price),quantity:1,variant:variant.name,image:product.image_url||"/flash-store-logo.png"})}>Add to cart</button></div>
  </article>
}