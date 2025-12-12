import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockCards } from "@/lib/mockData";
import { TrendingUp, TrendingDown, Copy, Crosshair } from "lucide-react";

export default function DecksPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Análise de Decks</h1>
          <p className="text-muted-foreground">Seus decks mais eficientes e sugestões do meta.</p>
        </div>

        <Tabs defaultValue="my-decks" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="my-decks">Meus Decks</TabsTrigger>
            <TabsTrigger value="meta-decks">Meta Decks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-decks" className="mt-6 space-y-6">
            <DeckStatCard 
              name="Hog 2.6 Cycle"
              winRate={58}
              matches={42}
              avgElixir={2.6}
              cards={mockCards}
              isMain={true}
            />
            <DeckStatCard 
              name="Log Bait Classic"
              winRate={45}
              matches={12}
              avgElixir={3.1}
              cards={mockCards} // Using same mock cards for visual demo
              isMain={false}
            />
          </TabsContent>
          
          <TabsContent value="meta-decks" className="mt-6">
            <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border border-dashed">
              <Crosshair className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold mb-2">Meta Analysis</h3>
              <p>Conecte-se com a API oficial para ver os decks do Top 1000 Global.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function DeckStatCard({ name, winRate, matches, avgElixir, cards, isMain }: any) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>{name}</CardTitle>
            {isMain && <Badge className="bg-primary/20 text-primary border-primary/20 hover:bg-primary/30">Main Deck</Badge>}
            <Badge variant="outline" className="text-muted-foreground">{avgElixir} Elixir</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 font-medium">
              {winRate >= 50 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
              <span className={winRate >= 50 ? "text-green-500" : "text-red-500"}>{winRate}% Win Rate</span>
            </div>
            <span className="text-muted-foreground">{matches} partidas</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-8 gap-2 mb-4">
          {cards.map((card: any) => (
            <div key={card.id} className="relative aspect-[4/5] bg-black/40 rounded overflow-hidden border border-white/10 group-hover:border-white/20 transition-colors">
              <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-center py-0.5 text-white font-bold">
                Lvl {card.level}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
           <Button variant="outline" size="sm" className="h-8">
            <Copy className="w-3.5 h-3.5 mr-2" />
            Copiar Link
          </Button>
          <Button size="sm" className="h-8">Ver Detalhes</Button>
        </div>
      </CardContent>
    </Card>
  );
}
