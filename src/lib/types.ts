export type User = { id: number; email: string; name: string };

export type Club = {
  id: number;
  owner_id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  theme: string;
  created_at: string;
};

export type Plan = {
  id: number;
  club_id: number;
  name: string;
  price: number;
  description: string;
  is_active: number;
};

export type Post = {
  id: number;
  club_id: number;
  title: string;
  body: string;
  min_price: number;
  created_at: string;
};

export type Membership = {
  id: number;
  user_id: number;
  club_id: number;
  plan_id: number;
  status: "active" | "canceled";
  started_at: string;
  current_period_end: string;
  canceled_at: string | null;
};

export type Comment = {
  id: number;
  post_id: number;
  user_id: number;
  user_name: string;
  body: string;
  created_at: string;
};
