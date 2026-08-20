import React,{useEffect,useMemo,useState} from "react";
import {Link,Routes,Route,useNavigate,useParams} from "react-router-dom";
import {Search,ShoppingCart,Heart,User,ChevronLeft,ChevronRight,Menu,X,Star,ArrowRight,ShieldCheck,Zap,Headphones,Plus,Pencil,Trash2,Settings,LayoutDashboard,Package,LogOut} from "lucide-react";
import {loadStore,submitOrder} from "./api";
import {supabase} from "./lib/supabase";

const LOGO="/flash-logo.jpg";

function Header({cartCount,favCount}){
 const [q,setQ]=useState(""); const [menu,setMenu]=useState(false); const nav=useNavigate();
 function search(e){e.preventDefault();if(q.trim())nav("/products?search="+encodeURIComponent(q))}
 return <header className="header">
  <div className="promo"><Zap size={14}/> FLASH STORE — DIGITAL GAMING STORE</div>
  <div className="container head">
   <button className="mobile" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>
   <Link to="/" className="brand"><img src={LOGO}/><span>FLASH<br/><b>STORE</b></span></Link>
   <form className="search" onSubmit={search}><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search for products..."/></form>
   <div className="actions">
    <Link to="/account"><User/><span>Sign In<br/><b>Account</b></span></Link>
    <Link to="/favorites"><Heart/><span>Favorites</span><i>{favCount}</i></Link>
    <Link to="/cart"><ShoppingCart/><span>Cart</span><i>{cartCount}</i></Link>
   </div>
  </div>
  <nav className={menu?"nav show":"nav"}><div className="container navin">
   <Link to="/products">Offers</Link><Link to="/">Homepage</Link><Link to="/category/xbox">Xbox</Link><Link to="/category/playstation">PlayStation</Link><Link to="/category/steam">Steam</Link><Link to="/category/fortnite">Fortnite</Link><Link to="/products">Gift Cards</Link>
  </div></nav>
 </header>
}

function ProductCard({p,add,fav,toggle}){
 return <article className="card"><div className="pic"><img src={p.image_url}/>{p.old_price&&<em>SALE</em>}<button onClick={()=>toggle(p)} className={fav?"heart active":"heart"}><Heart size={17} fill={fav?"currentColor":"none"}/></button></div>
 <div className="cardbody"><small>{p.platform}</small><Link to={"/product/"+p.id}><h3>{p.name}</h3></Link><div className="rating"><Star size={13} fill="currentColor"/> 5.0</div><div className="price">{p.price} <span>EGP</span>{p.old_price&&<del>{p.old_price}</del>}</div><button className="add" onClick={()=>add(p)}><ShoppingCart size={16}/> Add to Cart</button></div></article>
}

function Slider({items}){
 const [i,setI]=useState(0); useEffect(()=>{if(!items.length)return;const t=setInterval(()=>setI(x=>(x+1)%items.length),10000);return()=>clearInterval(t)},[items.length]);
 const b=items[i]||{};
 return <div className="hero"><img src={b.image_url}/><div className="shade"/><button className="arr l" onClick={()=>setI((i-1+items.length)%items.length)}><ChevronLeft/></button><button className="arr r" onClick={()=>setI((i+1)%items.length)}><ChevronRight/></button><div className="heroText"><span>FLASH STORE</span><h1>{b.title}</h1><p>{b.subtitle}</p><Link className="primary" to={b.link||"/products"}>{b.button_text||"Shop Now"} <ArrowRight size={17}/></Link></div><div className="dots">{items.map((_,x)=><button className={x===i?"on":""} onClick={()=>setI(x)} key={x}/>)}</div></div>
}

function Section({title,children}){return <section className="section container"><div className="sectionHead"><h2>{title}</h2><Link to="/products">View All <ArrowRight size={15}/></Link></div>{children}</section>}
function ProductSlider({list,add,favs,toggle}){
 const [start,setStart]=useState(0); const n=Math.max(0,list.length-4);
 const next=()=>setStart(x=>n?(x+1)%(n+1):0),prev=()=>setStart(x=>n?(x-1+n+1)%(n+1):0);
 useEffect(()=>{const t=setInterval(next,10000);return()=>clearInterval(t)},[n]);
 return <div className="sliderProducts"><button onClick={prev}><ChevronLeft/></button><div className="grid4">{list.slice(start,start+4).map(p=><ProductCard key={p.id} p={p} add={add} fav={favs.includes(p.id)} toggle={toggle}/>)}</div><button onClick={next}><ChevronRight/></button></div>
}
function Home({data,add,favs,toggle}){
 const newest=data.products.filter(p=>Date.now()-new Date(p.created_at||Date.now()).getTime()<60*86400000);
 return <><main><div className="container home"><aside className="cats"><h3>Shop by Category</h3>{data.categories.map(c=><Link key={c.id} to={"/category/"+c.slug}><img src={c.image_url}/><b>{c.name}</b><ChevronRight size={16}/></Link>)}</aside><Slider items={data.banners}/></div>
 <Section title="Featured Products"><ProductSlider list={data.products.filter(p=>p.featured)} add={add} favs={favs} toggle={toggle}/></Section>
 <Section title="Newly Added Products"><ProductSlider list={newest.length?newest:data.products} add={add} favs={favs} toggle={toggle}/></Section>
 <Section title="Discover by Platforms"><div className="platforms">{data.categories.map(c=><Link key={c.id} to={"/category/"+c.slug}><img src={c.image_url}/><div><b>{c.name}</b><span>Explore <ArrowRight size={14}/></span></div></Link>)}</div></Section>
 <Section title="Discover by Products"><div className="discover">{data.products.slice(0,8).map(p=><Link to={"/product/"+p.id} key={p.id}><img src={p.image_url}/><b>{p.name}</b></Link>)}</div></Section>
 <div className="trust container"><div><ShieldCheck/><b>Trusted Products</b><span>Reliable digital products</span></div><div><Zap/><b>Fast Processing</b><span>Quick order handling</span></div><div><Headphones/><b>Support</b><span>Professional after-sales support</span></div></div>
 </main></>
}

function Products({data,add,favs,toggle}){
 const q=new URLSearchParams(location.search).get("search")?.toLowerCase()||"";
 const list=data.products.filter(p=>!q||p.name.toLowerCase().includes(q)||p.platform.toLowerCase().includes(q));
 return <><PageTitle title="All Products" sub={q?`Search results for "${q}"`:"Browse our digital gaming products."}/><section className="section container"><div className="fullGrid">{list.map(p=><ProductCard key={p.id} p={p} add={add} fav={favs.includes(p.id)} toggle={toggle}/>)}</div></section></>
}
function Category({data,add,favs,toggle}){const {slug}=useParams();const c=data.categories.find(x=>x.slug===slug);const list=data.products.filter(p=>p.category_id===c?.id||p.platform.toLowerCase().includes(slug));return <><PageTitle title={c?.name||slug} sub="Explore products in this category."/><section className="section container"><div className="fullGrid">{list.map(p=><ProductCard key={p.id} p={p} add={add} fav={favs.includes(p.id)} toggle={toggle}/>)}</div></section></>}
function PageTitle({title,sub}){return <div className="container pageTitle"><span>FLASH STORE</span><h1>{title}</h1><p>{sub}</p></div>}
function Product({data,add}){const {id}=useParams();const p=data.products.find(x=>x.id===id);if(!p)return <div className="empty">Product not found.</div>;return <section className="container productPage"><div className="largePic"><img src={p.image_url}/></div><div className="productInfo"><small>{p.platform}</small><h1>{p.name}</h1><div className="rating"><Star fill="currentColor"/> 5.0</div><p>{p.description}</p><div className="bigPrice">{p.price} EGP {p.old_price&&<del>{p.old_price} EGP</del>}</div><div className="notice">Digital product. After placing your order, our team will contact you to complete the process.</div><button className="primary big" onClick={()=>add(p)}><ShoppingCart/> Add to Cart</button></div></section>}
function Cart({cart,setCart}){const total=cart.reduce((s,p)=>s+p.price*(p.qty||1),0);return <section className="container cart"><PageTitle title="Your Cart" sub="Review your items before checkout."/>{!cart.length?<div className="empty">Your cart is empty.<Link to="/products">Continue Shopping</Link></div>:<><div className="cartList">{cart.map((p,i)=><div className="cartRow" key={p.id}><img src={p.image_url}/><div><b>{p.name}</b><small>{p.platform}</small></div><strong>{p.price} EGP</strong><button onClick={()=>setCart(cart.filter((_,x)=>x!==i))}><Trash2/></button></div>)}</div><div className="cartTotal"><b>Total: {total} EGP</b><Link className="primary" to="/checkout">Checkout <ArrowRight/></Link></div></>}</section>}
function Checkout({cart,setCart}){const [f,setF]=useState({name:"",phone:"",payment_method:"Vodafone Cash"});const [number,setNumber]=useState("");const total=cart.reduce((s,p)=>s+p.price*(p.qty||1),0);async function submit(e){e.preventDefault();if(!f.name||!f.phone||!cart.length)return;try{const o=await submitOrder(f,cart);setNumber(o.order_number);setCart([])}catch(e){alert(e.message)}}if(number)return <div className="success container"><div>✓</div><h1>Order Received!</h1><p>Your order number</p><strong>{number}</strong><p>We will contact you using the phone number you provided.</p><Link className="primary" to="/">Back to Store</Link></div>;return <section className="container checkout"><div><PageTitle title="Checkout" sub="No online payment is taken at checkout."/><form className="form" onSubmit={submit}><label>Full Name<input required value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Your name"/></label><label>Phone Number<input required value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} placeholder="01xxxxxxxxx"/></label><label>Payment Method<select value={f.payment_method} onChange={e=>setF({...f,payment_method:e.target.value})}><option>Vodafone Cash</option><option>Telda</option><option>InstaPay</option></select></label><div className="notice">Choose the payment method only. You are not charged online here. Our team will contact you after the order.</div><button className="primary big">Place Order</button></form></div><aside className="summary"><h2>Order Summary</h2>{cart.map(p=><div key={p.id}><span>{p.name}</span><b>{p.price} EGP</b></div>)}<hr/><div><span>Total</span><b>{total} EGP</b></div></aside></section>}
function Account(){const [mode,setMode]=useState("in"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[msg,setMsg]=useState("");async function go(e){e.preventDefault();if(!supabase){setMsg("Supabase is not connected yet.");return}const r=mode==="in"?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});setMsg(r.error?.message||(mode==="in"?"Signed in successfully.":"Account created."))}return <div className="auth container"><div className="authCard"><img src={LOGO}/><h1>{mode==="in"?"Welcome Back":"Create Account"}</h1><form onSubmit={go}><input type="email" required placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input type="password" required placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/><button className="primary">{mode==="in"?"Sign In":"Sign Up"}</button></form>{msg&&<p className="msg">{msg}</p>}<button className="linkBtn" onClick={()=>setMode(mode==="in"?"up":"in")}>{mode==="in"?"Create an account":"Already have an account? Sign in"}</button></div></div>}
function Favorites({data,favs,add,toggle}){const list=data.products.filter(p=>favs.includes(p.id));return <><PageTitle title="Favorites" sub="Your saved products."/><section className="section container">{list.length?<div className="fullGrid">{list.map(p=><ProductCard key={p.id} p={p} add={add} fav toggle={toggle}/>)}</div>:<div className="empty">No favorites yet.</div>}</section></>}
function Admin(){
 const [tab,setTab]=useState("dashboard"),[products,setProducts]=useState([]),[cats,setCats]=useState([]),[orders,setOrders]=useState([]),[busy,setBusy]=useState(true);
 useEffect(()=>{async function load(){if(!supabase){setBusy(false);return}const [p,c,o]=await Promise.all([supabase.from("products").select("*").order("created_at",{ascending:false}),supabase.from("categories").select("*").order("sort_order"),supabase.from("orders").select("*").order("created_at",{ascending:false})]);setProducts(p.data||[]);setCats(c.data||[]);setOrders(o.data||[]);setBusy(false)}load()},[]);
 async function del(id){if(!confirm("Delete this product?"))return;const r=await supabase.from("products").delete().eq("id",id);if(!r.error)setProducts(x=>x.filter(p=>p.id!==id))}
 return <div className="admin"><aside className="side"><Link to="/" className="adminLogo"><img src={LOGO}/><b>FLASH ADMIN</b></Link>{[["dashboard","Dashboard",LayoutDashboard],["products","Products",Package],["categories","Categories",Menu],["orders","Orders",ShoppingCart],["settings","Settings",Settings]].map(([id,n,I])=><button className={tab===id?"sel":""} onClick={()=>setTab(id)} key={id}><I/> {n}</button>)}<Link to="/"><LogOut/> Store</Link></aside><main className="adminMain"><div className="adminHead"><div><h1>{tab[0].toUpperCase()+tab.slice(1)}</h1><p>Flash Store control panel</p></div>{tab==="products"||tab==="categories"?<button className="primary"><Plus/> Add</button>:null}</div>{busy?<div className="adminBox">Loading…</div>:tab==="dashboard"?<><div className="stats"><div><small>Products</small><b>{products.length}</b></div><div><small>Categories</small><b>{cats.length}</b></div><div><small>Orders</small><b>{orders.length}</b></div><div><small>Store</small><b>Online</b></div></div><div className="adminBox"><h2>Control Center</h2><p>Products, categories, banners, featured products, homepage sections, orders and store settings are designed to be database controlled.</p></div></>:tab==="products"?<div className="adminBox table"><table><thead><tr><th>Name</th><th>Platform</th><th>Price</th><th>Featured</th><th>Actions</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.platform}</td><td>{p.price} EGP</td><td>{p.featured?"Yes":"No"}</td><td><button className="icon"><Pencil/></button><button className="icon danger" onClick={()=>del(p.id)}><Trash2/></button></td></tr>)}</tbody></table></div>:tab==="categories"?<div className="adminBox table"><table><thead><tr><th>Name</th><th>Slug</th><th>Active</th></tr></thead><tbody>{cats.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.slug}</td><td>{c.is_active?"Yes":"No"}</td></tr>)}</tbody></table></div>:tab==="orders"?<div className="adminBox table"><table><thead><tr><th>Order</th><th>Customer</th><th>Phone</th><th>Payment</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>{o.order_number}</td><td>{o.customer_name}</td><td>{o.phone}</td><td>{o.payment_method}</td><td>{o.total} EGP</td><td>{o.status}</td></tr>)}</tbody></table></div>:<div className="adminBox"><h2>Store Settings</h2><p>Use the database settings table to control store name, logo, payment methods, contact information and homepage configuration.</p></div>}</main></div>
}
function Footer(){return <footer><div className="container foot"><div><img src={LOGO}/><p>Flash Store — your destination for digital games, subscriptions and gift cards.</p></div><div><h3>Quick Links</h3><Link to="/">Homepage</Link><Link to="/products">All Products</Link><Link to="/cart">Cart</Link><Link to="/account">Account</Link></div><div><h3>Customer Service</h3><Link to="/account">Contact Us</Link><Link to="/">Help</Link><Link to="/">FAQ</Link></div><div><h3>Legal</h3><Link to="/">Terms of Use</Link><Link to="/">Privacy Policy</Link><Link to="/">Returns Policy</Link></div></div><div className="copy">© {new Date().getFullYear()} Flash Store. All rights reserved.</div></footer>}

export default function App(){
 const [data,setData]=useState({categories:[],products:[],banners:[]}),[cart,setCart]=useState([]),[favs,setFavs]=useState([]);
 useEffect(()=>{loadStore().then(setData);setCart(JSON.parse(localStorage.getItem("flash_cart")||"[]"));setFavs(JSON.parse(localStorage.getItem("flash_favs")||"[]"))},[]);
 useEffect(()=>localStorage.setItem("flash_cart",JSON.stringify(cart)),[cart]);useEffect(()=>localStorage.setItem("flash_favs",JSON.stringify(favs)),[favs]);
 const add=p=>setCart(c=>c.some(x=>x.id===p.id)?c.map(x=>x.id===p.id?{...x,qty:(x.qty||1)+1}:x):[...c,{...p,qty:1}]);
 const toggle=p=>setFavs(f=>f.includes(p.id)?f.filter(id=>id!==p.id):[...f,p.id]);
 return <Routes><Route path="/admin" element={<Admin/>}/><Route path="*" element={<><Header cartCount={cart.reduce((s,p)=>s+(p.qty||1),0)} favCount={favs.length}/><Routes>
 <Route path="/" element={<Home data={data} add={add} favs={favs} toggle={toggle}/>}/><Route path="/products" element={<Products data={data} add={add} favs={favs} toggle={toggle}/>}/><Route path="/category/:slug" element={<Category data={data} add={add} favs={favs} toggle={toggle}/>}/><Route path="/product/:id" element={<Product data={data} add={add}/>}/><Route path="/cart" element={<Cart cart={cart} setCart={setCart}/>}/><Route path="/checkout" element={<Checkout cart={cart} setCart={setCart}/>}/><Route path="/account" element={<Account/>}/><Route path="/favorites" element={<Favorites data={data} favs={favs} add={add} toggle={toggle}/>}/>
 </Routes><Footer/></>}/></Routes>
}