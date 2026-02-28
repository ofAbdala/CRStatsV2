/**
 * ClanPage — Clan stats with members, war log, and top members.
 * Story 2.7: Community & Social Features (AC1, AC2, AC3)
 */
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageErrorState from "@/components/PageErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Users, Shield, Crown, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type ClanData } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errorMessages";
import { useLocale } from "@/hooks/use-locale";

function roleBadgeVariant(role?: string): "default" | "secondary" | "outline" {
  if (role === "leader") return "default";
  if (role === "coLeader" || role === "elder") return "secondary";
  return "outline";
}

function roleLabel(role?: string): string {
  switch (role) {
    case "leader": return "Leader";
    case "coLeader": return "Co-Leader";
    case "elder": return "Elder";
    case "member": return "Member";
    default: return role || "Member";
  }
}

export default function ClanPage() {
  const { t } = useLocale();
  const [, params] = useRoute("/clan/:tag");
  const tag = params?.tag || "";

  const clanQuery = useQuery({
    queryKey: ["clan", tag],
    queryFn: () => api.clan.get(tag),
    enabled: Boolean(tag),
  });

  if (clanQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (clanQuery.isError) {
    return (
      <DashboardLayout>
        <PageErrorState
          title="Failed to load clan"
          description={getApiErrorMessage(clanQuery.error, t)}
        />
      </DashboardLayout>
    );
  }

  const data = clanQuery.data as ClanData | undefined;
  if (!data) return null;

  const { clan, memberList, topMembers, warLog } = data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back link */}
        <Link href="/community">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Community
          </Button>
        </Link>

        {/* Clan header */}
        <div>
          <h1 className="text-3xl font-display font-bold">{clan.name || "Unknown Clan"}</h1>
          <p className="text-muted-foreground">{clan.tag} {clan.description ? ` - ${clan.description}` : ""}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground uppercase">Trophies</div>
              <div className="text-2xl font-bold flex items-center gap-1">
                <Trophy className="w-5 h-5 text-yellow-500" />
                {(clan.clanScore || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground uppercase">Members</div>
              <div className="text-2xl font-bold flex items-center gap-1">
                <Users className="w-5 h-5 text-blue-500" />
                {clan.members || 0}/50
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground uppercase">War Trophies</div>
              <div className="text-2xl font-bold flex items-center gap-1">
                <Shield className="w-5 h-5 text-purple-500" />
                {(clan.clanWarTrophies || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground uppercase">Required</div>
              <div className="text-2xl font-bold">
                {(clan.requiredTrophies || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Members */}
        {topMembers.length > 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Top Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topMembers.map((member, idx) => (
                  <div
                    key={member.tag}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-sm w-6 text-right">{idx + 1}</span>
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {(member.name || "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link href={`/p/${(member.tag || "").replace("#", "")}`}>
                          <span className="font-medium hover:underline cursor-pointer">
                            {member.name}
                          </span>
                        </Link>
                        <Badge variant={roleBadgeVariant(member.role)} className="ml-2 text-xs">
                          {roleLabel(member.role)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      {(member.trophies || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Members */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Members ({memberList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {memberList.map((member) => (
                <div
                  key={member.tag}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="text-xs">
                        {(member.name || "?").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                      <Link href={`/p/${(member.tag || "").replace("#", "")}`}>
                        <span className="text-sm font-medium hover:underline cursor-pointer">
                          {member.name}
                        </span>
                      </Link>
                      <Badge variant={roleBadgeVariant(member.role)} className="text-xs">
                        {roleLabel(member.role)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-yellow-500" />
                      {(member.trophies || 0).toLocaleString()}
                    </span>
                    {member.lastSeen && (
                      <span>
                        Last seen: {new Date(member.lastSeen).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* War Log */}
        {Array.isArray(warLog) && warLog.length > 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-500" />
                War Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {warLog.length} recent war entries available.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
