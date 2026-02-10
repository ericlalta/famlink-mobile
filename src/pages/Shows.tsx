import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, MapPin, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

const Shows = () => {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDate, setShowDate] = useState("");
  const [venue, setVenue] = useState("");
  const [location, setLocation] = useState("");

  const isArtist = profile?.role === "artist";

  const { data: shows, isLoading } = useQuery({
    queryKey: ["my-shows", profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      if (isArtist) {
        const { data, error } = await supabase
          .from("shows")
          .select("*")
          .eq("artist_id", profile.id)
          .order("show_date", { ascending: true });
        if (error) throw error;
        return data;
      }
      // Fan/venue: show all upcoming
      const { data, error } = await supabase
        .from("shows")
        .select("*, profiles!shows_artist_id_fkey(artist_name, full_name)")
        .gte("show_date", new Date().toISOString())
        .order("show_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  const createShow = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not authenticated");
      const { error } = await supabase.from("shows").insert({
        artist_id: profile.id,
        title,
        description,
        show_date: new Date(showDate).toISOString(),
        venue,
        location,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-shows"] });
      setOpen(false);
      setTitle(""); setDescription(""); setShowDate(""); setVenue(""); setLocation("");
      toast.success("Show created!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteShow = useMutation({
    mutationFn: async (showId: string) => {
      const { error } = await supabase.from("shows").delete().eq("id", showId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-shows"] });
      toast.success("Show deleted");
    },
  });

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isArtist ? "My Shows" : "Upcoming Shows"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isArtist ? "Manage your events" : "Browse upcoming events"}
          </p>
        </div>
        {isArtist && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Show</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => { e.preventDefault(); createShow.mutate(); }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Date & Time</Label>
                  <Input type="datetime-local" value={showDate} onChange={(e) => setShowDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Venue</Label>
                  <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={createShow.isPending}>
                  {createShow.isPending ? "Creating..." : "Create Show"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Loading...</p>
      ) : shows && shows.length > 0 ? (
        <div className="space-y-3">
          {shows.map((show: any) => (
            <Card key={show.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{show.title}</h3>
                    {!isArtist && show.profiles && (
                      <p className="text-xs text-muted-foreground">
                        by {show.profiles.artist_name || show.profiles.full_name}
                      </p>
                    )}
                  </div>
                  {isArtist && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8"
                      onClick={() => deleteShow.mutate(show.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(show.show_date), "MMM d, yyyy · h:mm a")}
                  </Badge>
                  {show.location && (
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" /> {show.location}
                    </Badge>
                  )}
                </div>
                {show.description && (
                  <p className="text-sm text-muted-foreground">{show.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm text-center py-8">
          {isArtist ? "No shows yet. Create your first one!" : "No upcoming shows"}
        </p>
      )}
    </div>
  );
};

export default Shows;
