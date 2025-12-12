import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Swords, Zap, TrendingUp, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import heroBg from "@assets/generated_images/dark_gaming_abstract_background_with_blue_and_gold_neon_accents.png";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Swords className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">CRStats</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">Como funciona</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Preços</a>
          </nav>

          <div className="flex items-center gap-4">
            <a href="/api/login">
              <Button variant="ghost" className="hidden md:flex">Entrar</Button>
            </a>
            <a href="/api/login">
              <Button className="font-bold">Começar Grátis</Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroBg} 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/80 to-background" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Zap className="w-3 h-3" />
            IA Coach v1.0 Disponível
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight mb-6 bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Domine a Arena com<br />
            <span className="text-primary block mt-2">Coach de IA</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Analise suas batalhas, descubra seus erros e receba dicas personalizadas para subir de troféus mais rápido do que nunca.
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link href="/auth?signup=true">
              <Button size="lg" className="h-12 px-8 text-base font-bold shadow-lg shadow-primary/20 interactive-hover">
                Analisar meu Perfil
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base interactive-hover">
                Ver Funcionalidades
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-card/30 border-y border-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Tudo que você precisa para evoluir</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Nossa IA analisa cada movimento seu para entregar insights que coaches humanos levariam horas para encontrar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Link href="/auth?signup=true">
              <div className="cursor-pointer">
                <FeatureCard 
                  icon={<TrendingUp className="w-6 h-6 text-primary" />}
                  title="Análise de Winrate"
                  description="Entenda quais cartas e decks estão funcionando melhor para você em cada meta."
                />
              </div>
            </Link>
            <Link href="/auth?signup=true">
              <div className="cursor-pointer">
                <FeatureCard 
                  icon={<ShieldCheck className="w-6 h-6 text-secondary" />}
                  title="Coach de IA 24/7"
                  description="Converse com nosso coach inteligente para receber dicas específicas sobre matchups difíceis."
                />
              </div>
            </Link>
            <Link href="/auth?signup=true">
              <div className="cursor-pointer">
                <FeatureCard 
                  icon={<Swords className="w-6 h-6 text-purple-400" />}
                  title="Revisão de Batalhas"
                  description="Identifique exatamente onde você errou em suas últimas derrotas e como corrigir."
                />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Planos Simples</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comece grátis e evolua conforme suas necessidades.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl bg-card border border-border flex flex-col">
              <div className="mb-4">
                <h3 className="text-xl font-bold font-display">Iniciante</h3>
                <div className="text-3xl font-bold mt-2">R$ 0 <span className="text-sm font-normal text-muted-foreground">/mês</span></div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> 1 Perfil de Jogador
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> 5 Mensagens de Coach/dia
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Últimas 10 batalhas
                </li>
              </ul>
              <Link href="/auth?signup=true">
                <Button variant="outline" className="w-full interactive-hover">Começar Grátis</Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-card to-primary/5 border border-primary/50 flex flex-col relative overflow-hidden interactive-hover">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                POPULAR
              </div>
              <div className="mb-4">
                <h3 className="text-xl font-bold font-display text-primary">Pro Player</h3>
                <div className="text-3xl font-bold mt-2">R$ 19,90 <span className="text-sm font-normal text-muted-foreground">/mês</span></div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Perfis Ilimitados
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Coach IA Ilimitado
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Histórico de 60 dias
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Treinos Personalizados
                </li>
              </ul>
              <Link href="/auth?signup=true">
                <Button className="w-full font-bold shadow-lg shadow-primary/20 interactive-hover">Assinar Pro</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 blur-3xl rounded-full -ml-32 -mb-32" />
            
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6 relative z-10">Pronto para chegar na Rota das Lendas?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 relative z-10">
              Junte-se a milhares de jogadores que já estão subindo de arena com o CRStats.
            </p>
            <Link href="/auth?signup=true">
              <Button size="lg" className="font-bold h-14 px-10 text-lg relative z-10 interactive-hover shadow-lg shadow-primary/20">
                Começar Agora Grátis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-background">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4" />
            <span className="font-bold text-foreground">CRStats</span>
            <span>© 2025</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">Termos</a>
            <a href="#" className="hover:text-foreground">Privacidade</a>
            <a href="#" className="hover:text-foreground">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 group interactive-hover">
      <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-display font-bold text-xl mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
