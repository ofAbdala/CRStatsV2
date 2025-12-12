import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Hash, Search, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function OnboardingPage() {
  const [location, setLocation] = useLocation();
  const [tag, setTag] = useState("");
  const [step, setStep] = useState<"input" | "searching" | "confirm">("input");
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag.startsWith("#")) {
      toast({
        title: "Formato inválido",
        description: "A tag deve começar com # (ex: #2P090J0)",
        variant: "destructive"
      });
      return;
    }
    
    setStep("searching");
    // Simulate API lookup
    setTimeout(() => {
      setStep("confirm");
    }, 1500);
  };

  const handleConfirm = () => {
    toast({
      title: "Perfil conectado!",
      description: "Carregando suas estatísticas...",
    });
    setTimeout(() => {
      setLocation("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Conecte seu Perfil</h1>
          <p className="text-muted-foreground">
            Precisamos da sua Tag de Jogador para analisar suas batalhas.
          </p>
        </div>

        <Card className="border-border/50 shadow-2xl">
          <CardHeader>
            <CardTitle>Buscar Jogador</CardTitle>
            <CardDescription>
              Você pode encontrar sua tag no seu perfil dentro do jogo, logo abaixo do seu nome.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "input" && (
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tag">Player Tag</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="tag" 
                      placeholder="#2P090J0" 
                      className="pl-9 font-mono uppercase"
                      value={tag}
                      onChange={(e) => setTag(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11">
                  <Search className="w-4 h-4 mr-2" />
                  Buscar Perfil
                </Button>
              </form>
            )}

            {step === "searching" && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Buscando dados na Supercell...</p>
              </div>
            )}

            {step === "confirm" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                  <div className="w-12 h-12 rounded bg-secondary/20 flex items-center justify-center text-2xl">
                    👑
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">KingSlayer</h3>
                    <p className="text-sm text-muted-foreground">Tag: {tag}</p>
                    <p className="text-xs text-primary font-medium mt-1">Arena 17 • 5842 Troféus</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("input")}>
                    Não sou eu
                  </Button>
                  <Button className="flex-1" onClick={handleConfirm}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Não tem o jogo instalado? <a href="#" className="underline">Baixar Clash Royale</a>
          </p>
        </div>
      </div>
    </div>
  );
}
