"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, uploadAvatar } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import { useEffect } from "react";
import type { Profile } from "@/types";

// This page uses client-side data fetching so the profile updates live
export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    });
  }, []);

  const handleUpdateProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfile({
        full_name: formData.get("full_name") as string,
      });
      if (result.success) {
        toast({ title: "Profile updated" });
        setProfile(result.data ?? null);
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.set("avatar", file);

    const result = await uploadAvatar(formData);
    setIsUploading(false);

    if (result.success) {
      toast({ title: "Avatar updated" });
      setProfile((prev) => (prev ? { ...prev, avatar_url: result.data?.url ?? null } : null));
      router.refresh();
    } else {
      toast({ variant: "destructive", title: "Upload failed", description: result.error });
    }
  };

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-6">
      <h1 className="text-xl font-semibold">Profile</h1>

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile picture</CardTitle>
          <CardDescription>JPG, PNG, or WebP. Max 2 MB.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-lg">
                {getInitials(profile.full_name ?? profile.email)}
              </AvatarFallback>
            </Avatar>
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
          </div>
          <label>
            <Button variant="outline" size="sm" asChild disabled={isUploading}>
              <span className="cursor-pointer">
                <Camera className="mr-2 h-4 w-4" />
                Change photo
              </span>
            </Button>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarUpload}
              disabled={isUploading}
            />
          </label>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile.full_name ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profile.email} disabled />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed here. Contact support if needed.
              </p>
            </div>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Current plan</span>
            <span className="text-sm font-medium capitalize">
              {profile.subscription_status === "active" ? "Pro" : "Free"}
            </span>
          </div>
          <Separator />
          <Button size="sm" variant="outline" asChild>
            <a href="/billing">Manage billing →</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
