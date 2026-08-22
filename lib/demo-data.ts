export type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  platform: string;
  category: string;
  description: string;
  featured?: boolean;
  created_at: string;
  variants: { id: string; name: string; price: number }[];
};

export const demoProducts: Product[] = [
  {
    id: "p1",
    name: "EA SPORTS FC 26",
    slug: "ea-sports-fc-26",
    price: 1499,
    image: "/flash-store-logo.png",
    platform: "PlayStation",
    category: "Games",
    description: "Digital gaming product. Choose the available option before checkout.",
    featured: true,
    created_at: new Date().toISOString(),
    variants: [
      { id: "v1", name: "New Account", price: 1499 },
      { id: "v2", name: "Shared Account", price: 899 }
    ]
  },
  {
    id: "p2",
    name: "Xbox Game Pass",
    slug: "xbox-game-pass",
    price: 499,
    image: "/flash-store-logo.png",
    platform: "Xbox",
    category: "Subscriptions",
    description: "Game Pass digital subscription.",
    featured: true,
    created_at: new Date().toISOString(),
    variants: [
      { id: "v3", name: "1 Month", price: 499 },
      { id: "v4", name: "3 Months", price: 1199 }
    ]
  },
  {
    id: "p3",
    name: "Steam Gift Card",
    slug: "steam-gift-card",
    price: 600,
    image: "/flash-store-logo.png",
    platform: "Steam",
    category: "Gift Cards",
    description: "Steam digital gift card.",
    created_at: new Date().toISOString(),
    featured: false,
    variants: [
      { id: "v5", name: "600 EGP", price: 600 },
      { id: "v6", name: "1200 EGP", price: 1200 }
    ]
  }
];

export const categories = ["Games", "Gift Cards", "Subscriptions"];
export const platforms = ["Xbox", "PlayStation", "Steam"];
