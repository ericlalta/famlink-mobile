import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, MapPin, Calendar, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const Discover = () => {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: artists } = useQuery({
    queryKey: ["artists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "artist");
      if (error) throw error;
      return data;
    },
  });

  const { data: upcomingShows } = useQuery({
    queryKey: ["upcoming-shows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shows")
        .select("*, profiles!shows_artist_id_fkey(artist_name, full_name)")
        .gte("show_date", new Date().toISOString())
        .order("show_date", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const filteredArtists = artists?.filter(
    (a) =>
      (a.artist_name || a.full_name || "")
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
        <p className="text-muted-foreground text-sm">Find artists and upcoming shows</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search artists..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {upcomingShows && upcomingShows.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Upcoming Shows</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
            {upcomingShows.map((show: any) => (
              <Card
                key={show.id}
                className="min-w-[260px] snap-start cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/shows/${show.id}`)}
              >
                <CardContent className="p-4 space-y-2">
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(show.show_date), "MMM d, yyyy")}
                  </Badge>
                  <h3 className="font-semibold text-sm">{show.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {show.profiles?.artist_name || show.profiles?.full_name}
                  </p>
                  {show.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {show.location}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Artists</h2>
        {filteredArtists && filteredArtists.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredArtists.map((artist) => (
              <Card
                key={artist.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/artist/${artist.id}`)}
              >
                <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Music className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-medium text-sm truncate w-full">
                    {artist.artist_name || artist.full_name || "Artist"}
                  </h3>
                  {artist.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{artist.bio}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">No artists found</p>
        )}
      </section>
    </div>
  );
};

export default Discover;
