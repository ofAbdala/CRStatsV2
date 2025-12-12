import React from "react";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Swords, Shield, Crown, ArrowLeft } from "lucide-react";
import { mockPlayer, mockBattles } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function PublicProfilePage() {
  const [match, params] = useRoute("/p/:tag");
  const tag = params?.tag ? `#${params.tag}` : "";

  // In real app, fetch data by tag. Here we use mockPlayer for demo
  const player = { ...mockPlayer, tag: tag || mockPlayer.tag };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Dashboard
          </Button>
        </Link>

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 p-8 rounded-2xl bg-card border border-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full -mr-32 -mt-32" />
          
          <div className="flex items-center gap-6 relative z-10">
            <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.tag}`} />
              <AvatarFallback>PL</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-display font-bold">{player.name}</h1>
                <Badge variant="outline" className="font-mono">{player.tag}</Badge>
              </div>
              <p className="text-muted-foreground flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-500" />
                {player.arena}
              </p>
            </div>
          </div>

          <div className="flex gap-4 relative z-10">
             <div className="text-center p-4 bg-background/50 rounded-xl border border-border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Troféus</div>
                <div className="text-2xl font-display font-bold flex items-center gap-1">
                   <Trophy className="w-5 h-5 text-yellow-500" />
                   {player.trophies}
                </div>
             </div>
             <div className="text-center p-4 bg-background/50 rounded-xl border border-border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Win Rate</div>
                <div className="text-2xl font-display font-bold text-green-500">
                   {player.winRate}%
                </div>
             </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-3 gap-8">
           <Card className="md:col-span-2 border-border/50 bg-card/30">
              <CardHeader>
                 <CardTitle>Histórico Recente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 {mockBattles.map((battle) => (
                    <div key={battle.id} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50">
                       <div className="flex items-center gap-4">
                          <Badge variant={battle.result === "victory" ? "default" : "secondary"} className={
                             battle.result === "victory" ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                          }>
                             {battle.result === "victory" ? "VITÓRIA" : "DERROTA"}
                          </Badge>
                          <div>
                             <div className="font-bold text-sm">vs {battle.opponentName}</div>
                             <div className="text-xs text-muted-foreground">{new Date(battle.date).toLocaleDateString()}</div>
                          </div>
                       </div>
                       <div className="font-bold font-mono">
                          {battle.trophyChange > 0 ? "+" : ""}{battle.trophyChange}
                       </div>
                    </div>
                 ))}
              </CardContent>
           </Card>

           <div className="space-y-6">
              <Card className="border-primary/50 bg-primary/5">
                 <CardHeader>
                    <CardTitle className="text-primary">Desafie este Jogador</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                       Quer saber como vencer o {player.name}? Use o Coach IA para analisar o estilo de jogo dele.
                    </p>
                    <Link href="/coach">
                       <Button className="w-full font-bold">Analisar com IA</Button>
                    </Link>
                 </CardContent>
              </Card>
           </div>
        </div>
      </div>
    </div>
  );
}
