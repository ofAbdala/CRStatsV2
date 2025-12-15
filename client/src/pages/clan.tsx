import React from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, ArrowLeft, Users, Swords, Crown, Shield } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useLocale } from "@/hooks/use-locale";
import { getClanBadgeUrl } from "@/lib/clashIcons";

interface ClanMember {
  tag: string;
  name: string;
  role: string;
  trophies: number;
  donations: number;
}

interface ClanData {
  tag: string;
  name: string;
  description: string;
  badgeId: number;
  clanScore: number;
  clanWarTrophies: number;
  members: number;
  memberList: ClanMember[];
}

function getRoleLabel(role: string): string {
  const roleMap: Record<string, string> = {
    leader: "Leader",
    coLeader: "Co-Leader",
    elder: "Elder",
    member: "Member",
  };
  return roleMap[role] || role;
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "leader") return "default";
  if (role === "coLeader") return "secondary";
  return "outline";
}

export default function ClanPage() {
  const [match, params] = useRoute("/clan/:tag");
  const tag = params?.tag || "";
  const { t } = useLocale();

  const { data: clan, isLoading, error } = useQuery<ClanData>({
    queryKey: ["clan", tag],
    queryFn: async () => {
      const response = await fetch(`/api/public/clan/${encodeURIComponent(tag)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch clan");
      }
      return response.json();
    },
    enabled: !!tag,
    staleTime: 60000,
  });

  const displayedMembers = clan?.memberList?.slice(0, 20) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !clan) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Link href="/community">
            <Button variant="ghost" className="mb-6" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> {t("common.back")}
            </Button>
          </Link>
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive font-semibold mb-2" data-testid="text-error">{t("common.error")}</p>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : t("clan.notFound")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/community">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t("common.back")}
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 p-8 rounded-2xl bg-card border border-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full -mr-32 -mt-32" />
          
          <div className="flex items-center gap-6 relative z-10">
            <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
              <AvatarImage src={getClanBadgeUrl(clan.badgeId)} alt={clan.name} />
              <AvatarFallback><Shield className="w-12 h-12" /></AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-display font-bold" data-testid="text-clan-name">{clan.name}</h1>
                <Badge variant="outline" className="font-mono" data-testid="text-clan-tag">#{tag}</Badge>
              </div>
              {clan.description && (
                <p className="text-muted-foreground max-w-md" data-testid="text-clan-description">
                  {clan.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-4 relative z-10">
            <div className="text-center p-4 bg-background/50 rounded-xl border border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">{t("clan.clanScore")}</div>
              <div className="text-2xl font-display font-bold flex items-center gap-1" data-testid="text-clan-score">
                <Trophy className="w-5 h-5 text-yellow-500" />
                {clan.clanScore.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-xl border border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">{t("clan.warTrophies")}</div>
              <div className="text-2xl font-display font-bold flex items-center gap-1" data-testid="text-war-trophies">
                <Swords className="w-5 h-5 text-purple-500" />
                {clan.clanWarTrophies.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-xl border border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">{t("community.members")}</div>
              <div className="text-2xl font-display font-bold flex items-center gap-1" data-testid="text-member-count">
                <Users className="w-5 h-5 text-blue-500" />
                {clan.members}
              </div>
            </div>
          </div>
        </div>

        <Card className="border-border/50 bg-card/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("clan.memberList")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayedMembers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t("clan.noMembers")}</p>
            ) : (
              <div className="space-y-2">
                {displayedMembers.map((member, index) => (
                  <Link
                    key={member.tag}
                    href={`/p/${encodeURIComponent(member.tag.replace('#', ''))}`}
                  >
                    <div
                      className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50 hover:bg-background/80 cursor-pointer transition-colors"
                      data-testid={`member-row-${index}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground font-mono w-6 text-right">
                          {index + 1}
                        </span>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.tag}`} />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-sm" data-testid={`text-member-name-${index}`}>
                            {member.name}
                          </div>
                          <Badge
                            variant={getRoleBadgeVariant(member.role)}
                            className="text-xs"
                            data-testid={`text-member-role-${index}`}
                          >
                            {member.role === "leader" && <Crown className="w-3 h-3 mr-1" />}
                            {getRoleLabel(member.role)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">{t("dashboard.stats.trophies")}</div>
                          <div className="font-bold text-yellow-500 flex items-center gap-1 justify-end" data-testid={`text-member-trophies-${index}`}>
                            <Trophy className="w-4 h-4" />
                            {member.trophies.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">{t("clan.donations")}</div>
                          <div className="font-bold text-green-500" data-testid={`text-member-donations-${index}`}>
                            {member.donations}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
