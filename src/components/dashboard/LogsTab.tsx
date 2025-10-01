import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Log {
  id: string;
  mensagem: string;
  status: string;
  created_at: string;
  alunos: { nome: string };
}

interface LogsTabProps {
  userId: string;
}

const LogsTab = ({ userId }: LogsTabProps) => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearingLogs, setClearingLogs] = useState(false);

  useEffect(() => {
    loadLogs();

    const subscription = supabase
      .channel("logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "logs" }, () => {
        loadLogs();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("logs")
      .select("*, alunos(nome)")
      .eq("professor_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    setLogs(data || []);
    setLoading(false);
  };

  const clearAllLogs = async () => {
    setClearingLogs(true);
    try {
      const { error } = await supabase
        .from("logs")
        .delete()
        .eq("professor_id", userId);

      if (error) throw error;

      setLogs([]);
      toast({
        title: "Logs limpos com sucesso",
        description: "Todos os logs foram removidos.",
      });
    } catch (error) {
      console.error("Erro ao limpar logs:", error);
      toast({
        title: "Erro ao limpar logs",
        description: "Ocorreu um erro ao tentar limpar os logs.",
        variant: "destructive",
      });
    } finally {
      setClearingLogs(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Logs do Sistema</CardTitle>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={loading || logs.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Todos os Logs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Limpeza de Logs</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá remover todos os logs permanentemente. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={clearAllLogs}
                  disabled={clearingLogs}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {clearingLogs ? "Limpando..." : "Limpar Logs"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {loading ? (
            <p className="text-muted-foreground">Carregando logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground">Nenhum log disponível</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 border rounded-lg text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{log.alunos.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{log.mensagem}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                    log.status === "sucesso"
                      ? "bg-green-100 text-green-800"
                      : log.status === "erro"
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LogsTab;