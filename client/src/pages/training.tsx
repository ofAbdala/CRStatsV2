import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Swords, Shield, Zap, CheckCircle2, Lock } from "lucide-react";

export default function TrainingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Centro de Treinamento</h1>
          <p className="text-muted-foreground">Exercícios personalizados pela IA baseados nas suas fraquezas.</p>
        </div>

        {/* Active Drills */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DrillCard 
            title="Posicionamento Defensivo"
            description="Você tem tomado muito dano de Corredor. Pratique o posicionamento 4-3 do Canhão."
            difficulty="Médio"
            type="Defesa"
            progress={60}
            icon={<Shield className="w-5 h-5 text-blue-400" />}
          />
          <DrillCard 
            title="Timing de Feitiços"
            description="Seus Zaps estão atrasados contra Barril de Goblins. Melhore seu tempo de reação."
            difficulty="Difícil"
            type="Micro"
            progress={30}
            icon={<Zap className="w-5 h-5 text-yellow-400" />}
          />
          <DrillCard 
            title="Controle de Elixir"
            description="Evite vazar elixir no início da partida. Mantenha o fluxo constante."
            difficulty="Fácil"
            type="Macro"
            progress={90}
            icon={<Target className="w-5 h-5 text-green-400" />}
          />
        </div>

        {/* Locked/Pro Content */}
        <div className="mt-12">
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            Treinos Avançados <Badge variant="secondary" className="text-xs">PRO</Badge>
          </h2>
          <Card className="border-border/50 bg-card/30 border-dashed relative overflow-hidden">
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">Desbloqueie o Potencial Máximo</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Assinantes PRO têm acesso a cenários específicos de matchups e análise de replay quadro a quadro.
              </p>
              <Button className="font-bold">Fazer Upgrade</Button>
            </div>
            
            <CardContent className="p-6 opacity-50 blur-sm pointer-events-none">
              <div className="space-y-4">
                <div className="h-24 bg-muted rounded-lg w-full" />
                <div className="h-24 bg-muted rounded-lg w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function DrillCard({ title, description, difficulty, type, progress, icon }: any) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all hover:-translate-y-1">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <div className="p-2 rounded-lg bg-background border border-border">
            {icon}
          </div>
          <Badge variant="outline" className={
            difficulty === "Fácil" ? "text-green-400 border-green-400/30" :
            difficulty === "Médio" ? "text-yellow-400 border-yellow-400/30" :
            "text-red-400 border-red-400/30"
          }>{difficulty}</Badge>
        </div>
        <CardTitle className="text-lg leading-tight">{title}</CardTitle>
        <CardDescription className="line-clamp-2 mt-1.5">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" variant={progress === 100 ? "outline" : "default"}>
          {progress === 100 ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Concluído
            </>
          ) : (
            "Iniciar Treino"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
