import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useLocale } from "@/hooks/use-locale";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const isSignup = searchParams.get("signup") === "true";

  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const { t } = useLocale();

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setLocation("/dashboard");
      }
    });
  }, [setLocation]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();

      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: name ? { full_name: name } : undefined,
          },
        });

        if (error) throw error;

        if (!data.session) {
          // If email confirmation is enabled, Supabase won't return a session.
          toast({
            title: t("auth.toast.accountCreatedTitle"),
            description: t("auth.toast.accountCreatedConfirmEmail"),
          });
          setLocation("/auth");
          return;
        }

        toast({ title: t("auth.toast.accountCreatedSuccess"), description: t("auth.toast.redirecting") });
        setLocation("/onboarding");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      toast({ title: t("auth.toast.loginSuccess"), description: t("auth.toast.redirecting") });
      setLocation("/onboarding");
    } catch (err: any) {
      toast({
        title: t("auth.toast.authFailedTitle"),
        description: err?.message || t("auth.toast.authFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
              {isSignup ? t("auth.signupTitle") : t("auth.loginTitle")}
            </CardTitle>
            <CardDescription>
              {isSignup
                ? t("auth.signupSubtitle")
                : t("auth.loginSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="name">{t("auth.nameLabel")}</Label>
                  <Input
                    id="name"
                    placeholder={t("auth.namePlaceholder")}
                    required
                    className="bg-background/50"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.emailLabel")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  required
                  className="bg-background/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  className="bg-background/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full font-bold h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("auth.loading")}
                  </>
                ) : (
                  isSignup ? t("auth.signupButton") : t("auth.loginButton")
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href={isSignup ? "/auth" : "/auth?signup=true"}>
              <Button variant="link" className="text-sm text-muted-foreground hover:text-primary">
                {isSignup
                  ? t("auth.switchToLogin")
                  : t("auth.switchToSignup")}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
