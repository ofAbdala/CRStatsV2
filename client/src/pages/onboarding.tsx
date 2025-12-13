import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Hash, Search, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface PlayerData {
  tag: string;
  name: string;
  trophies: number;
  arena?: { name: string; id: number };
  clan?: { name: string; tag: string };
  expLevel: number;
}

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [tag, setTag] = useState("");
  const [step, setStep] = useState<"input" | "searching" | "confirm" | "error">("input");
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const searchMutation = useMutation({
    mutationFn: async (playerTag: string) => {
      const data = await api.clash.getPlayer(playerTag);
      return data as PlayerData;
    },
    onSuccess: (data) => {
      setPlayerData(data);
      setStep("confirm");
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Jogador não encontrado. Verifique a tag.");
      setStep("error");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { clashTag: string; displayName: string }) => {
      return api.profile.update(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: "Perfil conectado!",
        description: "Carregando suas estatísticas...",
      });
      setTimeout(() => {
        setLocation("/dashboard");
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar perfil",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    let normalizedTag = tag.trim().toUpperCase();
    if (!normalizedTag.startsWith("#")) {
      normalizedTag = "#" + normalizedTag;
    }
    
    if (normalizedTag.length < 4) {
      toast({
        title: "Tag inválida",
        description: "A tag deve ter pelo menos 3 caracteres além do #",
        variant: "destructive"
      });
      return;
    }
    
    setTag(normalizedTag);
    setStep("searching");
    searchMutation.mutate(normalizedTag);
  };

  const handleConfirm = () => {
    if (!playerData) return;
    
    saveMutation.mutate({
      clashTag: playerData.tag,
      displayName: playerData.name,
    });
  };

  const handleRetry = () => {
    setStep("input");
    setErrorMessage("");
    setPlayerData(null);
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
                      placeholder="2P090J0" 
                      className="pl-9 font-mono uppercase"
                      value={tag.replace("#", "")}
                      onChange={(e) => setTag(e.target.value.toUpperCase().replace("#", ""))}
                      data-testid="input-player-tag"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Ex: #2P090J0 ou 2P090J0</p>
                </div>
                <Button type="submit" className="w-full h-11" data-testid="button-search-player">
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

            {step === "error" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-8 h-8 text-destructive shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg text-destructive">Jogador não encontrado</h3>
                    <p className="text-sm text-muted-foreground">{errorMessage}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={handleRetry} data-testid="button-retry-search">
                  Tentar novamente
                </Button>
              </div>
            )}

            {step === "confirm" && playerData && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                  <div className="w-12 h-12 rounded bg-secondary/20 flex items-center justify-center text-2xl">
                    👑
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" data-testid="text-player-name">{playerData.name}</h3>
                    <p className="text-sm text-muted-foreground">Tag: {playerData.tag}</p>
                    <p className="text-xs text-primary font-medium mt-1">
                      {playerData.arena?.name || 'Arena'} • {playerData.trophies} Troféus
                    </p>
                    {playerData.clan && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Clan: {playerData.clan.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleRetry} data-testid="button-not-me">
                    Não sou eu
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleConfirm}
                    disabled={saveMutation.isPending}
                    data-testid="button-confirm-player"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Não tem o jogo instalado?{" "}
            <a 
              href="https://supercell.com/en/games/clashroyale/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Baixar Clash Royale
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
