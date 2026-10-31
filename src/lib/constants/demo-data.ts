export interface DemoSocialProofItem {
  platform: "instagram" | "youtube" | "google_review";
  handle: string;
  author_name: string;
  post_url: string;
  thumbnail_url: string | null;
  caption: string;
  rating: number;
  featured: boolean;
  display_order: number;
}

export const DEMO_SOCIAL_PROOF: DemoSocialProofItem[] = [
  {
    platform: "instagram",
    handle: "@vogueindia",
    author_name: "Vogue India Weddings",
    post_url: "https://instagram.com/p/DB1100Vivona1",
    thumbnail_url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80",
    caption: "Inside Devraj and Vivona's breathtaking 3-day royal palace celebration in Udaipur. A masterclass in heritage wedding architecture.",
    rating: 5,
    featured: true,
    display_order: 1,
  },
  {
    platform: "instagram",
    handle: "@weddingsutra",
    author_name: "WeddingSutra Official",
    post_url: "https://instagram.com/p/DB2200Vivona2",
    thumbnail_url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    caption: "How Vivona orchestrated 450 guests and 18 luxury vendors at Rambagh with zero delays. Every detail was seamless.",
    rating: 5,
    featured: true,
    display_order: 2,
  },
  {
    platform: "google_review",
    handle: "Rohan & Priyamvada",
    author_name: "Priyamvada Singhania",
    post_url: "https://maps.google.com/reviews/vivona/1",
    thumbnail_url: null,
    caption: "Vivona replaced the chaotic family WhatsApp groups with absolute calm. From caterer comparison to the live Baraat schedule, they made our dream wedding flawless.",
    rating: 5,
    featured: true,
    display_order: 3,
  },
  {
    platform: "google_review",
    handle: "Kabir & Alankrita",
    author_name: "Kabir Mittal",
    post_url: "https://maps.google.com/reviews/vivona/2",
    thumbnail_url: null,
    caption: "Crore-scale budget handled with extreme transparency. When we added 60 extra dinner guests, the per-plate math and billing was clear within minutes.",
    rating: 5,
    featured: true,
    display_order: 4,
  },
  {
    platform: "youtube",
    handle: "@theweddingshow",
    author_name: "The Royal Wedding Film",
    post_url: "https://youtube.com/watch?v=vivona-udaipur-film",
    thumbnail_url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
    caption: "Full documentary feature of the Udaipur Lake Palace wedding executed by Vivona. Watch the minute-by-minute mandap choreography.",
    rating: 5,
    featured: true,
    display_order: 5,
  },
  {
    platform: "google_review",
    handle: "Siddharth & Radhika",
    author_name: "Radhika Kothari",
    post_url: "https://maps.google.com/reviews/vivona/3",
    thumbnail_url: null,
    caption: "The live event console gave my parents peace of mind on the wedding day. We could see each vendor arrive in real-time.",
    rating: 5,
    featured: true,
    display_order: 6,
  },
  {
    platform: "instagram",
    handle: "@luxuryweddingsmag",
    author_name: "Luxury Weddings Spotlight",
    post_url: "https://instagram.com/p/DB3300Vivona3",
    thumbnail_url: "https://images.unsplash.com/photo-1544078751-58fee2d8a03b?auto=format&fit=crop&w=800&q=80",
    caption: "Celebrating timeless craftsmanship: Vivona's bespoke Mandap installations blending authentic heritage architecture with contemporary luxury.",
    rating: 5,
    featured: true,
    display_order: 7,
  },
  {
    platform: "google_review",
    handle: "Aditya & Sanjana",
    author_name: "Aditya Goenka",
    post_url: "https://maps.google.com/reviews/vivona/4",
    thumbnail_url: null,
    caption: "Exceptional professional standards. Every rupee was traceable in the client portal, and our planners were always accessible.",
    rating: 5,
    featured: true,
    display_order: 8,
  },
];
