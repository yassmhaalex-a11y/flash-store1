export const categories = [
 {id:"xbox",name:"Xbox",slug:"xbox",image_url:"https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80"},
 {id:"playstation",name:"PlayStation",slug:"playstation",image_url:"https://images.unsplash.com/photo-1607853202273-797f1c22a38e?auto=format&fit=crop&w=900&q=80"},
 {id:"steam",name:"Steam",slug:"steam",image_url:"https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80"},
 {id:"fortnite",name:"Fortnite",slug:"fortnite",image_url:"https://images.unsplash.com/photo-1605899435973-ca2d1a8861cf?auto=format&fit=crop&w=900&q=80"}
];
export const products = [
 {id:"demo-1",name:"Xbox Game Pass Ultimate",category_id:"xbox",platform:"Xbox",price:425,old_price:500,image_url:categories[0].image_url,featured:true,description:"Digital Xbox Game Pass subscription.",created_at:new Date().toISOString()},
 {id:"demo-2",name:"FC 27 Steam",category_id:"steam",platform:"Steam",price:850,old_price:950,image_url:categories[2].image_url,featured:true,description:"Digital FC 27 product for Steam.",created_at:new Date().toISOString()},
 {id:"demo-3",name:"PlayStation Plus",category_id:"playstation",platform:"PlayStation",price:750,old_price:850,image_url:categories[1].image_url,featured:true,description:"Digital PlayStation Plus subscription.",created_at:new Date().toISOString()},
 {id:"demo-4",name:"V-Bucks 2400",category_id:"fortnite",platform:"Xbox / PS / PC",price:700,old_price:800,image_url:categories[3].image_url,featured:false,description:"Fortnite V-Bucks.",created_at:new Date().toISOString()},
 {id:"demo-5",name:"GTA V",category_id:"xbox",platform:"Xbox",price:550,old_price:650,image_url:categories[0].image_url,featured:false,description:"Digital GTA V.",created_at:new Date().toISOString()},
 {id:"demo-6",name:"Steam Wallet Gift Card",category_id:"steam",platform:"Steam",price:300,old_price:350,image_url:categories[2].image_url,featured:false,description:"Steam wallet digital code.",created_at:new Date().toISOString()}
];
export const banners = [
 {id:"b1",title:"LEVEL UP WITH FLASH STORE",subtitle:"Digital games, subscriptions and gift cards.",button_text:"Shop Now",image_url:"https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1800&q=85",link:"/products"},
 {id:"b2",title:"GAME PASS DEALS",subtitle:"Get more gaming for less.",button_text:"Explore Xbox",image_url:categories[0].image_url,link:"/category/xbox"},
 {id:"b3",title:"PLAYSTATION & STEAM",subtitle:"Find your next digital game.",button_text:"Browse Products",image_url:categories[1].image_url,link:"/products"}
];