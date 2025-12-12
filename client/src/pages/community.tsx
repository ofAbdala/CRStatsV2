import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockRankings, mockCards } from "@/lib/mockData";
import { Trophy, TrendingUp, Users, Crown } from "lucide-react";
import { Link } from "wouter";

export default function CommunityPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Comunidade</h1>
          <p className="text-muted-foreground">Rankings globais, clãs e meta decks.</p>
        </div>

        <Tabs defaultValue="rankings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="rankings">Top Jogadores</TabsTrigger>
            <TabsTrigger value="clans">Top Clãs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="rankings" className="mt-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Ranking Global
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {mockRankings.map((player) => (
                    <div key={player.rank} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center font-bold text-muted-foreground">
                          #{player.rank}
                        </div>
                        <Avatar className="w-10 h-10 border border-border">
                          <AvatarFallback>{player.name.substring(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <Link href={`/p/${player.tag.replace("#", "")}`}>
                            <div className="font-bold cursor-pointer hover:underline">{player.name}</div>
                          </Link>
                          <div className="text-xs text-muted-foreground">{player.clan}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <div className="hidden md:block">
                          <div className="text-xs text-muted-foreground">Win Rate</div>
                          <div className="font-bold text-green-500">{player.winRate}%</div>
                        </div>
                        <div className="flex items-center gap-2 min-w-[100px] justify-end">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <span className="font-bold font-display">{player.trophies}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="clans" className="mt-6">
             <div className="flex flex-col items-center justify-center py-12 text-center bg-card/30 rounded-lg border border-border border-dashed">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-bold">Em breve</h3>
                <p className="text-muted-foreground">O ranking de clãs estará disponível na próxima atualização.</p>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
