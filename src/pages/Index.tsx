import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Users, BarChart3 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Sistema RAV</h1>
          </div>
          <Button onClick={() => navigate("/auth")}>Entrar</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold tracking-tight">
              Automatize seus Relatórios RAV
            </h2>
            <p className="text-xl text-muted-foreground">
              Processamento inteligente com IA (Google Gemini) - Grátis até 06/10/2025
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")}>Começar Agora</Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="p-6 rounded-lg border bg-card shadow-sm">
              <Upload className="h-12 w-12 mb-4 text-primary mx-auto" />
              <h3 className="font-bold text-lg mb-2">Upload em Lote</h3>
              <p className="text-sm text-muted-foreground">
                Envie múltiplos documentos .docx dos alunos de uma vez
              </p>
            </div>

            <div className="p-6 rounded-lg border bg-card shadow-sm">
              <Users className="h-12 w-12 mb-4 text-primary mx-auto" />
              <h3 className="font-bold text-lg mb-2">IA Integrada</h3>
              <p className="text-sm text-muted-foreground">
                12 perguntas fixas ou geração dinâmica com Gemini
              </p>
            </div>

            <div className="p-6 rounded-lg border bg-card shadow-sm">
              <BarChart3 className="h-12 w-12 mb-4 text-primary mx-auto" />
              <h3 className="font-bold text-lg mb-2">Logs Completos</h3>
              <p className="text-sm text-muted-foreground">
                Acompanhe cada etapa do processamento em tempo real
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;