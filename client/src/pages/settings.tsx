import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Moon, Bell, Monitor, Loader2, Check, Hash, Search } from "lucide-react";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [clashTag, setClashTag] = useState("");
  const [isSearchingTag, setIsSearchingTag] = useState(false);
  const [tagValidated, setTagValidated] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName((profile as any).displayName || "");
      setClashTag((profile as any).clashTag?.replace("#", "") || "");
      if ((profile as any).clashTag) {
        setTagValidated(true);
      }
    }
  }, [profile]);

  const validateTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
      return api.clash.getPlayer(normalizedTag);
    },
    onSuccess: (data: any) => {
      setTagValidated(true);
      setDisplayName(data.name);
      toast({
        title: "Tag validada!",
        description: `Jogador encontrado: ${data.name}`,
      });
    },
    onError: (error: Error) => {
      setTagValidated(false);
      toast({
        title: "Tag inválida",
        description: error.message || "Jogador não encontrado",
        variant: "destructive",
      });
    },
  });

  const handleValidateTag = () => {
    if (!clashTag.trim()) {
      toast({
        title: "Tag vazia",
        description: "Digite uma tag para validar",
        variant: "destructive",
      });
      return;
    }
    setIsSearchingTag(true);
    validateTagMutation.mutate(clashTag, {
      onSettled: () => setIsSearchingTag(false),
    });
  };

  const handleSaveProfile = () => {
    const rawTag = clashTag.trim().toUpperCase();
    const normalizedTag = rawTag ? `#${rawTag.replace(/^#/, '')}` : null;
    
    updateProfile.mutate({
      displayName: displayName || undefined,
      clashTag: normalizedTag,
    });
  };

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Gerencie sua conta, assinatura e preferências.</p>
        </div>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="account">Conta</TabsTrigger>
            <TabsTrigger value="billing">Planos e Billing</TabsTrigger>
            <TabsTrigger value="preferences">Preferências</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="mt-6 space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Perfil</CardTitle>
                <CardDescription>Suas informações e conta do Clash Royale.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {profileLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-6">
                      <Avatar className="w-20 h-20 border-2 border-border">
                        <AvatarImage src={(user as any)?.profileImageUrl} />
                        <AvatarFallback>
                          {displayName?.substring(0, 2).toUpperCase() || "CR"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{(user as any)?.email || "Email não disponível"}</p>
                        <p className="text-sm text-muted-foreground">Conta Replit</p>
                      </div>
                    </div>
                    
                    <div className="grid gap-4 max-w-md">
                      <div className="grid gap-2">
                        <Label htmlFor="display-name">Nome de Exibição</Label>
                        <Input 
                          id="display-name" 
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Seu nome no app"
                          data-testid="input-display-name"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="clash-tag">Clash Royale Tag</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              id="clash-tag" 
                              value={clashTag}
                              onChange={(e) => {
                                setClashTag(e.target.value.toUpperCase().replace("#", ""));
                                setTagValidated(false);
                              }}
                              placeholder="2P090J0"
                              className="pl-9 font-mono uppercase"
                              data-testid="input-clash-tag"
                            />
                          </div>
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={handleValidateTag}
                            disabled={isSearchingTag || !clashTag.trim()}
                            data-testid="button-validate-tag"
                          >
                            {isSearchingTag ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : tagValidated ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {tagValidated 
                            ? "Tag validada! Clique em Salvar para confirmar."
                            : "Clique no ícone de busca para validar a tag."}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-6">
                <Button 
                  onClick={handleSaveProfile}
                  disabled={updateProfile.isPending || profileLoading}
                  data-testid="button-save-profile"
                >
                  {updateProfile.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Salvar Alterações
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold">Sair da Conta</h4>
                  <p className="text-sm text-muted-foreground">Encerrar sua sessão atual.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleLogout} data-testid="button-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-6 space-y-6">
            <Card className="border-primary/50 bg-gradient-to-br from-card to-primary/5">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Plano Atual: FREE
                  <Button size="sm" className="font-bold" onClick={() => setLocation("/billing")} data-testid="button-upgrade">
                    Upgrade PRO
                  </Button>
                </CardTitle>
                <CardDescription>Você está no plano gratuito.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Ciclo de cobrança</span>
                    <span className="font-medium">Mensal</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Próxima renovação</span>
                    <span className="font-medium">-</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Histórico de Pagamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma fatura encontrada.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="mt-6 space-y-6">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>Personalize como o CRStats se parece no seu dispositivo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    <span className="font-medium">Modo Escuro</span>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>Escolha o que você quer receber.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    <span className="font-medium">Alertas de Meta</span>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    <span className="font-medium">Lembretes de Treino</span>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
