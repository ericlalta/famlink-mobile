
-- Create profile role type
CREATE TYPE public.profile_role AS ENUM ('artist', 'fan_venue');

-- Create booking status type
CREATE TYPE public.booking_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  artist_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  role profile_role NOT NULL DEFAULT 'fan_venue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shows table
CREATE TABLE public.shows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  show_date TIMESTAMPTZ NOT NULL,
  venue TEXT,
  location TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Booking requests table
CREATE TABLE public.booking_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_location TEXT,
  notes TEXT,
  status booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_profile_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_show_owner(_show_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shows s
    JOIN public.profiles p ON s.artist_id = p.id
    WHERE s.id = _show_id AND p.user_id = auth.uid()
  );
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shows_updated_at BEFORE UPDATE ON public.shows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_booking_requests_updated_at BEFORE UPDATE ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Shows RLS
CREATE POLICY "Anyone authenticated can view shows" ON public.shows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Artists can create shows" ON public.shows FOR INSERT TO authenticated
  WITH CHECK (artist_id = public.get_profile_id_for_user(auth.uid()));
CREATE POLICY "Artists can update own shows" ON public.shows FOR UPDATE TO authenticated
  USING (public.is_show_owner(id));
CREATE POLICY "Artists can delete own shows" ON public.shows FOR DELETE TO authenticated
  USING (public.is_show_owner(id));

-- Booking requests RLS
CREATE POLICY "Users can view own booking requests" ON public.booking_requests FOR SELECT TO authenticated
  USING (
    requester_id = public.get_profile_id_for_user(auth.uid())
    OR artist_id = public.get_profile_id_for_user(auth.uid())
  );
CREATE POLICY "Users can create booking requests" ON public.booking_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = public.get_profile_id_for_user(auth.uid()));
CREATE POLICY "Involved users can update booking requests" ON public.booking_requests FOR UPDATE TO authenticated
  USING (
    requester_id = public.get_profile_id_for_user(auth.uid())
    OR artist_id = public.get_profile_id_for_user(auth.uid())
  );
