import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Swords, Zap, TrendingUp, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import heroBgWebp from "@assets/generated_images/dark_gaming_abstract_background_with_blue_and_gold_neon_accents.webp";
import heroBgPng from "@assets/generated_images/dark_gaming_abstract_background_with_blue_and_gold_neon_accents.png";
import { useLocale } from "@/hooks/use-locale";
import { PRICING } from "@shared/pricing";

export default function LandingPage() {
  const { t, locale } = useLocale();

  const proMonthlyPriceText = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: PRICING.BRL.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(PRICING.BRL.monthlyPrice);

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
            <a href="#features" className="hover:text-foreground transition-colors">{t("pages.landing.nav.features")}</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">{t("pages.landing.nav.howItWorks")}</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">{t("pages.landing.nav.pricing")}</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/auth">
              <Button variant="ghost" className="hidden md:flex">{t("nav.login")}</Button>
            </Link>
            <Link href="/auth?signup=true">
              <Button className="font-bold">{t("landing.hero.cta")}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <picture>
            <source srcSet={heroBgWebp} type="image/webp" />
            <img
              src={heroBgPng}
              alt=""
              className="w-full h-full object-cover opacity-40"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/80 to-background" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Zap className="w-3 h-3" />
            {t("pages.landing.badge")}
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight mb-6 bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            {t("pages.landing.heroTitleLine1")}<br />
            <span className="text-primary block mt-2">{t("pages.landing.heroTitleLine2")}</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            {t("pages.landing.heroDescription")}
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link href="/auth?signup=true">
              <Button size="lg" className="h-12 px-8 text-base font-bold shadow-lg shadow-primary/20 interactive-hover">
                {t("pages.landing.primaryCta")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base interactive-hover">
                {t("pages.landing.secondaryCta")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-card/30 border-y border-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">{t("pages.landing.features.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("pages.landing.features.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Link href="/auth?signup=true">
              <div className="cursor-pointer">
                <FeatureCard 
                  icon={<TrendingUp className="w-6 h-6 text-primary" />}
                  title={t("pages.landing.features.winrateTitle")}
                  description={t("pages.landing.features.winrateDescription")}
                />
              </div>
            </Link>
            <Link href="/auth?signup=true">
              <div className="cursor-pointer">
                <FeatureCard 
                  icon={<ShieldCheck className="w-6 h-6 text-secondary" />}
                  title={t("pages.landing.features.coachTitle")}
                  description={t("pages.landing.features.coachDescription")}
                />
              </div>
            </Link>
            <Link href="/auth?signup=true">
              <div className="cursor-pointer">
                <FeatureCard 
                  icon={<Swords className="w-6 h-6 text-purple-400" />}
                  title={t("pages.landing.features.reviewTitle")}
                  description={t("pages.landing.features.reviewDescription")}
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
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">{t("pages.landing.pricing.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("pages.landing.pricing.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl bg-card border border-border flex flex-col">
              <div className="mb-4">
                <h3 className="text-xl font-bold font-display">{t("pages.landing.pricing.freeTitle")}</h3>
                <div className="text-3xl font-bold mt-2">R$ 0 <span className="text-sm font-normal text-muted-foreground">/{t("common.month")}</span></div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> {t("pages.landing.pricing.freeFeature1")}
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> {t("pages.landing.pricing.freeFeature2")}
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> {t("pages.landing.pricing.freeFeature3")}
                </li>
              </ul>
              <Link href="/auth?signup=true">
                <Button variant="outline" className="w-full interactive-hover">{t("landing.hero.cta")}</Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-card to-primary/5 border border-primary/50 flex flex-col relative overflow-hidden interactive-hover">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                {t("pages.landing.pricing.popular")}
              </div>
              <div className="mb-4">
                <h3 className="text-xl font-bold font-display text-primary">{t("pages.landing.pricing.proTitle")}</h3>
                <div className="text-3xl font-bold mt-2">
                  {proMonthlyPriceText}{" "}
                  <span className="text-sm font-normal text-muted-foreground">/{t("common.month")}</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> {t("pages.landing.pricing.proFeature1")}
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> {t("pages.landing.pricing.proFeature2")}
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> {t("pages.landing.pricing.proFeature3")}
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> {t("pages.landing.pricing.proFeature4")}
                </li>
              </ul>
              <Link href="/auth?signup=true">
                <Button className="w-full font-bold shadow-lg shadow-primary/20 interactive-hover">{t("pages.landing.pricing.proCta")}</Button>
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
            
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6 relative z-10">{t("pages.landing.finalCta.title")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 relative z-10">
              {t("pages.landing.finalCta.subtitle")}
            </p>
            <Link href="/auth?signup=true">
              <Button size="lg" className="font-bold h-14 px-10 text-lg relative z-10 interactive-hover shadow-lg shadow-primary/20">
                {t("pages.landing.finalCta.button")}
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
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">{t("pages.landing.footer.terms")}</a>
            <a href="#" className="hover:text-foreground">{t("pages.landing.footer.privacy")}</a>
            <a href="#" className="hover:text-foreground">{t("pages.landing.footer.twitter")}</a>
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
