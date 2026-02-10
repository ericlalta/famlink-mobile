import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Music, Calendar, MapPin, Send } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

const ArtistProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: artist } = useQuery({
    queryKey: ["artist", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: shows } = useQuery({
    queryKey: ["artist-shows", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shows")
        .select("*")
        .eq("artist_id", id!)
        .gte("show_date", new Date().toISOString())
        .order("show_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("booking_requests").insert({
        artist_id: id,
        requester_id: profile.id,
        event_name: eventName,
        event_date: new Date(eventDate).toISOString(),
        event_location: eventLocation,
        notes,
      });
      if (error) throw error;
      toast.success("Booking request sent!");
      setBookingOpen(false);
      setEventName(""); setEventDate(""); setEventLocation(""); setNotes("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!artist) return null;

  return (
    <div className="px-4 py-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="flex flex-col items-center text-center space-y-3">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Music className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">
          {artist.artist_name || artist.full_name || "Artist"}
        </h1>
        {artist.bio && <p className="text-sm text-muted-foreground max-w-xs">{artist.bio}</p>}
      </div>

      {profile && profile.id !== id && (
        <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Send className="h-4 w-4 mr-2" /> Request Booking
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Book {artist.artist_name || artist.full_name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBooking} className="space-y-4">
              <div className="space-y-2">
                <Label>Event Name</Label>
                <Input value={eventName} onChange={(e) => setEventName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Event Date</Label>
                <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tell them about your event..." />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending..." : "Send Request"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {shows && shows.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Upcoming Shows</h2>
          {shows.map((show: any) => (
            <Card key={show.id}>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-sm">{show.title}</h3>
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
                  <p className="text-xs text-muted-foreground">{show.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
};

export default ArtistProfile;
