import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Save, Music } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const { signOut } = useAuth();
  const { profile, isLoading, updateProfile } = useProfile();
  const [fullName, setFullName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState<string>("fan_venue");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setArtistName(profile.artist_name || "");
      setBio(profile.bio || "");
      setRole(profile.role || "fan_venue");
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ full_name: fullName, artist_name: artistName, bio, role });
      toast.success("Profile updated!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-primary"><Music className="h-8 w-8" /></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-destructive">
          <LogOut className="h-4 w-4 mr-1" /> Sign out
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>I am a...</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="artist">Artist / Performer</SelectItem>
                <SelectItem value="fan_venue">Fan / Venue / Event Organizer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          {role === "artist" && (
            <div className="space-y-2">
              <Label>Artist / Stage Name</Label>
              <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>
          <Button onClick={handleSave} className="w-full" disabled={updateProfile.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {updateProfile.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">{profile?.email}</p>
    </div>
  );
};

export default Profile;
