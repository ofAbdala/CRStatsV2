import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const isSignup = searchParams.get("signup") === "true";
  
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: isSignup ? "Conta criada com sucesso!" : "Login realizado!",
        description: "Redirecionando...",
      });
      setLocation("/onboarding");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Swords className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tight text-foreground">CRStats</span>
            </div>
          </Link>
        </div>

        <Card className="border-border/50 shadow-2xl bg-card/50 backdrop-blur-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-display">
              {isSignup ? "Crie sua conta" : "Bem-vindo de volta"}
            </CardTitle>
            <CardDescription>
              {isSignup 
                ? "Comece sua jornada para o topo do ranking" 
                : "Entre para continuar seu treinamento"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" placeholder="Seu nome" required className="bg-background/50" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" required className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" required className="bg-background/50" />
              </div>
              
              <Button type="submit" className="w-full font-bold h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  isSignup ? "Criar Conta" : "Entrar"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href={isSignup ? "/auth" : "/auth?signup=true"}>
              <Button variant="link" className="text-sm text-muted-foreground hover:text-primary">
                {isSignup 
                  ? "Já tem uma conta? Entre aqui" 
                  : "Não tem conta? Cadastre-se grátis"}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
