import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-muted text-muted-foreground",
};

const Bookings = () => {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const isArtist = profile?.role === "artist";

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings", profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await supabase
        .from("booking_requests")
        .select("*, profiles!booking_requests_requester_id_fkey(full_name, email), artist:profiles!booking_requests_artist_id_fkey(artist_name, full_name)")
        .or(`requester_id.eq.${profile.id},artist_id.eq.${profile.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "accepted" | "rejected" | "cancelled" }) => {
      const { error } = await supabase
        .from("booking_requests")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking updated");
    },
  });

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
        <p className="text-muted-foreground text-sm">
          {isArtist ? "Manage incoming booking requests" : "Your booking requests"}
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Loading...</p>
      ) : bookings && bookings.length > 0 ? (
        <div className="space-y-3">
          {bookings.map((booking: any) => {
            const isOwner = booking.artist_id === profile?.id;
            return (
              <Card key={booking.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm">{booking.event_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {isOwner
                          ? `From: ${booking.profiles?.full_name || booking.profiles?.email}`
                          : `To: ${booking.artist?.artist_name || booking.artist?.full_name}`}
                      </p>
                    </div>
                    <Badge className={statusColors[booking.status] || ""}>
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(booking.event_date), "MMM d, yyyy")}
                    {booking.event_location && ` · ${booking.event_location}`}
                  </div>
                  {booking.notes && (
                    <p className="text-sm text-muted-foreground">{booking.notes}</p>
                  )}
                  {isOwner && booking.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateStatus.mutate({ id: booking.id, status: "accepted" })}
                      >
                        <Check className="h-4 w-4 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ id: booking.id, status: "rejected" })}
                      >
                        <X className="h-4 w-4 mr-1" /> Decline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm text-center py-8">No bookings yet</p>
      )}
    </div>
  );
};

export default Bookings;
