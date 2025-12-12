import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreditCard, LogOut, Moon, Sun, Monitor, Bell } from "lucide-react";

export default function SettingsPage() {
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

          {/* Account Tab */}
          <TabsContent value="account" className="mt-6 space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Perfil</CardTitle>
                <CardDescription>Suas informações públicas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20 border-2 border-border">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>KS</AvatarFallback>
                  </Avatar>
                  <Button variant="outline">Alterar Avatar</Button>
                </div>
                <div className="grid gap-4 max-w-md">
                  <div className="grid gap-2">
                    <Label htmlFor="display-name">Nome de Exibição</Label>
                    <Input id="display-name" defaultValue="KingSlayer" />
                  </div>
                  <div className="grid gap-2">
                     <Label htmlFor="clash-tag">Clash Royale Tag</Label>
                     <Input id="clash-tag" defaultValue="#2P090J0" disabled className="bg-muted font-mono" />
                     <p className="text-xs text-muted-foreground">Para alterar a tag, entre em contato com o suporte.</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-6">
                <Button>Salvar Alterações</Button>
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
                 <Button variant="destructive" size="sm">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                 </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="mt-6 space-y-6">
            <Card className="border-primary/50 bg-gradient-to-br from-card to-primary/5">
               <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                     Plano Atual: FREE
                     <Button size="sm" className="font-bold">Upgrade PRO</Button>
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

          {/* Preferences Tab */}
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
