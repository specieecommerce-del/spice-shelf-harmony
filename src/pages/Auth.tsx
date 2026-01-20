import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Mail, Lock, User as UserIcon, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

// Validation schemas
const emailSchema = z.string().email("Email inválido").max(255);
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(100);
const nameSchema = z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100).optional();

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: authLoading, signIn, signUp } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Reset password form
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  // Check for password recovery mode
  useEffect(() => {
    const type = searchParams.get("type");
    if (type === "recovery") {
      setShowNewPassword(true);
    }
  }, [searchParams]);

  // Redirect if already logged in (but not during password recovery)
  useEffect(() => {
    if (!authLoading && user && !showNewPassword) {
      navigate("/");
    }
  }, [user, authLoading, navigate, showNewPassword]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const emailResult = emailSchema.safeParse(loginEmail);
    if (!emailResult.success) {
      toast({
        title: "Email inválido",
        description: emailResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    const passwordResult = passwordSchema.safeParse(loginPassword);
    if (!passwordResult.success) {
      toast({
        title: "Senha inválida",
        description: passwordResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await signIn(loginEmail, loginPassword);
    
    setIsLoading(false);
    
    if (error) {
      let message = "Erro ao fazer login. Tente novamente.";
      if (error.message.includes("Invalid login credentials")) {
        message = "Email ou senha incorretos.";
      } else if (error.message.includes("Email not confirmed")) {
        message = "Por favor, confirme seu email antes de fazer login.";
      }
      
      toast({
        title: "Erro no login",
        description: message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Bem-vindo!",
      description: "Login realizado com sucesso.",
    });
    
    navigate("/");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const nameResult = nameSchema.safeParse(signupName || undefined);
    if (signupName && !nameResult.success) {
      toast({
        title: "Nome inválido",
        description: nameResult.error?.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    const emailResult = emailSchema.safeParse(signupEmail);
    if (!emailResult.success) {
      toast({
        title: "Email inválido",
        description: emailResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    const passwordResult = passwordSchema.safeParse(signupPassword);
    if (!passwordResult.success) {
      toast({
        title: "Senha inválida",
        description: passwordResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A confirmação de senha deve ser igual à senha.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await signUp(signupEmail, signupPassword, signupName || undefined);
    
    setIsLoading(false);
    
    if (error) {
      let message = "Erro ao criar conta. Tente novamente.";
      if (error.message.includes("User already registered")) {
        message = "Este email já está cadastrado. Tente fazer login.";
      } else if (error.message.includes("Password should be")) {
        message = "A senha não atende aos requisitos mínimos.";
      }
      
      toast({
        title: "Erro no cadastro",
        description: message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Conta criada!",
      description: "Verifique seu email para confirmar o cadastro.",
    });
    
    setActiveTab("login");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailResult = emailSchema.safeParse(resetEmail);
    if (!emailResult.success) {
      toast({
        title: "Email inválido",
        description: emailResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });
    
    setIsLoading(false);
    
    if (error) {
      toast({
        title: "Erro ao enviar email",
        description: "Não foi possível enviar o email de recuperação. Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Email enviado!",
      description: "Verifique sua caixa de entrada para redefinir sua senha.",
    });
    
    setShowResetPassword(false);
    setResetEmail("");
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const passwordResult = passwordSchema.safeParse(newPassword);
    if (!passwordResult.success) {
      toast({
        title: "Senha inválida",
        description: passwordResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A confirmação de senha deve ser igual à nova senha.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    setIsLoading(false);
    
    if (error) {
      toast({
        title: "Erro ao redefinir senha",
        description: "Não foi possível atualizar sua senha. Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Senha atualizada!",
      description: "Sua senha foi redefinida com sucesso.",
    });
    
    setShowNewPassword(false);
    setNewPassword("");
    setConfirmNewPassword("");
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-spice-forest" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spice-warm-white">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="container-species max-w-md">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a loja
          </Button>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {showNewPassword ? "Nova Senha" : showResetPassword ? "Recuperar Senha" : "Sua Conta"}
              </CardTitle>
              <CardDescription>
                {showNewPassword 
                  ? "Digite sua nova senha" 
                  : showResetPassword 
                    ? "Digite seu email para receber o link de recuperação"
                    : "Entre ou crie sua conta para acompanhar seus pedidos"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showNewPassword ? (
                <form onSubmit={handleSetNewPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-new-password"
                        type="password"
                        placeholder="Repita a nova senha"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-spice-forest hover:bg-spice-forest/90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Atualizando...
                      </>
                    ) : (
                      "Atualizar senha"
                    )}
                  </Button>
                </form>
              ) : showResetPassword ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-spice-forest hover:bg-spice-forest/90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar link de recuperação"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowResetPassword(false)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar ao login
                  </Button>
                </form>
              ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-spice-forest hover:bg-spice-forest/90"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="link"
                      className="w-full text-spice-forest"
                      onClick={() => setShowResetPassword(true)}
                    >
                      Esqueceu sua senha?
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome completo</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Seu nome"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">Confirmar senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm-password"
                          type="password"
                          placeholder="Repita a senha"
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-spice-forest hover:bg-spice-forest/90"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        "Criar conta"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Auth;
