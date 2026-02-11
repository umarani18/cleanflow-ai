"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { orgAPI } from "@/lib/api/org-api";

function CreateOrganizationContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("standard");
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultEmail = useMemo(() => (user?.email || "").toLowerCase(), [user?.email]);
  const inviteOrgId = searchParams.get("org_id");
  const inviteId = searchParams.get("invite_id");

  useEffect(() => {
    if (!email && defaultEmail) {
      setEmail(defaultEmail);
    }
  }, [defaultEmail, email]);

  useEffect(() => {
    let isMounted = true;
    const checkMembership = async () => {
      setIsChecking(true);
      try {
        // If we landed via an invite link, accept it first.
        if (inviteOrgId && inviteId) {
          try {
            await orgAPI.acceptInvite(inviteOrgId, inviteId);
            toast({
              title: "Invite accepted",
              description: "You're now part of the organization.",
            });
            window.location.href = "/dashboard";
            return;
          } catch (inviteErr: any) {
            const inviteMessage = inviteErr?.message || "";
            toast({
              title: "Could not accept invite",
              description:
                inviteMessage ||
                "Please make sure you're signed in with the invited email.",
            });
          }
        }

        await orgAPI.getMe();
        if (isMounted) {
          window.location.href = "/dashboard";
        }
      } catch (err: any) {
        const message = err?.message || "";
        if (!message.includes("Organization membership required")) {
          toast({
            title: "Could not check organization",
            description: message || "Please continue and create your organization.",
          });
        }
      } finally {
        if (isMounted) setIsChecking(false);
      }
    };

    checkMembership();
    return () => {
      isMounted = false;
    };
  }, [inviteId, inviteOrgId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPhone = phone.trim();
      const trimmedAddress = address.trim();

      if (!trimmedName || !trimmedEmail || !trimmedPhone || !trimmedAddress) {
        toast({
          title: "Organization details required",
          description: "Enter name, email, phone, and address to continue.",
        });
        return;
      }

      await orgAPI.registerOrg({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        address: trimmedAddress,
        subscriptionPlan,
      });

      toast({
        title: "Organization created",
        description: "You're now the Super Admin. Redirecting to your dashboard.",
      });
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast({
        title: "Failed to create organization",
        description: err?.message || "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle>Create Your Organization</CardTitle>
            <CardDescription>
              Only the Super Admin can create an organization. This will finish your setup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  placeholder="Enter your organization name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isChecking || isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-email">Organization Email</Label>
                <Input
                  id="org-email"
                  type="email"
                  placeholder="contact@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isChecking || isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-phone">Contact Number</Label>
                <Input
                  id="org-phone"
                  placeholder="Enter contact number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isChecking || isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-address">Address</Label>
                <Input
                  id="org-address"
                  placeholder="Enter organization address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={isChecking || isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Subscription Plan</Label>
                <Select
                  value={subscriptionPlan}
                  onValueChange={setSubscriptionPlan}
                  disabled={isChecking || isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={isChecking || isSubmitting}>
                  {isChecking
                    ? "Checking organization..."
                    : isSubmitting
                    ? "Creating organization..."
                    : "Create Organization"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}

export default function CreateOrganizationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <CreateOrganizationContent />
    </Suspense>
  );
}
