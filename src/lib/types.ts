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
  trial_days: number;
};

export type Post = {
  id: number;
  club_id: number;
  title: string;
  body: string;
  min_price: number;
  video_url: string;
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
  is_trial: number;
};

export type Comment = {
  id: number;
  post_id: number;
  user_id: number;
  user_name: string;
  body: string;
  created_at: string;
};

export type TalkRoom = {
  id: number;
  club_id: number;
  name: string;
  description: string;
  min_price: number;
  created_at: string;
};

export type TalkMessage = {
  id: number;
  room_id: number;
  user_id: number;
  user_name: string;
  body: string;
  created_at: string;
};

export type ClubEvent = {
  id: number;
  club_id: number;
  title: string;
  description: string;
  starts_at: string;
  kind: "online" | "offline";
  location: string;
  stream_url: string;
  capacity: number;
  min_price: number;
  created_at: string;
};

export type Product = {
  id: number;
  club_id: number;
  name: string;
  description: string;
  price: number;
  stock: number | null;
  min_price: number;
  is_active: number;
  created_at: string;
};
