import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockPlayer } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Crown, CreditCard, Zap } from "lucide-react";

export default function ProfilePage() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie sua conta e assinatura</p>
        </div>

        {/* User Info Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-2 border-border">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>KS</AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm">Alterar Foto</Button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome de Exibição</Label>
                <Input id="name" defaultValue="KingSlayer" className="bg-background/50" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" defaultValue="player@example.com" disabled className="bg-muted" />
              </div>
            </div>
            
            <Button>Salvar Alterações</Button>
          </CardContent>
        </Card>

        {/* Player Tag Connection */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Conta Clash Royale</CardTitle>
            <CardDescription>Esta é a conta que estamos monitorando</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-bold">{mockPlayer.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">{mockPlayer.tag}</div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">Desconectar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Plan */}
        <Card className="border-primary/20 bg-gradient-to-br from-card/50 to-primary/5 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap className="w-24 h-24" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Plano Atual
              <Badge variant="outline" className="border-primary text-primary bg-primary/10">FREE</Badge>
            </CardTitle>
            <CardDescription>Você está no plano gratuito básico</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Mensagens diárias do Coach</span>
                <span className="font-bold">2 / 5</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[40%]" />
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <h4 className="font-bold mb-2">Vantagens do PRO</h4>
              <ul className="text-sm space-y-1 text-muted-foreground mb-4">
                <li className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-primary" /> Coach de IA ilimitado
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-primary" /> Histórico de batalhas completo
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-primary" /> Análise avançada de decks
                </li>
              </ul>
              <Button className="w-full font-bold shadow-lg shadow-primary/20 interactive-hover">
                <CreditCard className="w-4 h-4 mr-2" />
                Fazer Upgrade para PRO
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
