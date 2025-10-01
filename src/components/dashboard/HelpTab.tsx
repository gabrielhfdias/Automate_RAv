import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, Users, BarChart3 } from "lucide-react";
import FixedQuestionsManager from "./FixedQuestionsManager";

interface HelpTabProps {
  userId: string;
}

const HelpTab = ({ userId }: HelpTabProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Como Usar o Sistema RAV</CardTitle>
          <CardDescription>
            Guia passo a passo para processar seus relatórios de avaliação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Configure o Sistema
                </h3>
                <p className="text-sm text-muted-foreground">
                  Acesse a aba "Configurações" e preencha:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 ml-4">
                  <li>• Sua matrícula</li>
                  <li>• Bimestre atual (ex: 1º Bimestre 2025)</li>
                  <li>• Tipo de processamento (Fixo ou Dinâmico)</li>
                  <li>• Template .docx (opcional)</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">2</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Faça Upload dos Documentos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Na aba "Upload", selecione múltiplos arquivos .docx dos alunos e envie todos de uma vez.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">3</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Processe os Alunos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Na aba "Alunos", clique em "Processar" para cada aluno. O sistema irá:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 ml-4">
                  <li>• Extrair o texto do documento</li>
                  <li>• Enviar para a IA (Google Gemini)</li>
                  <li>• Gerar respostas para as 12 perguntas</li>
                  <li>• Criar o relatório processado</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">4</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Acompanhe e Baixe
                </h3>
                <p className="text-sm text-muted-foreground">
                  Veja os logs em tempo real e baixe os relatórios processados na aba "Alunos".
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <FixedQuestionsManager userId={userId} />

      <Card>
        <CardHeader>
          <CardTitle>Dicas Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>💡 <strong>Processamento Gratuito:</strong> A IA (Google Gemini) é gratuita até 06/10/2025</p>
          <p>📁 <strong>Formato dos arquivos:</strong> Apenas .docx são aceitos</p>
          <p>🔄 <strong>Processamento em lote:</strong> Você pode fazer upload de vários arquivos de uma vez</p>
          <p>📊 <strong>Logs em tempo real:</strong> Acompanhe cada etapa do processamento na aba "Logs"</p>
          <p>💾 <strong>Dados seguros:</strong> Todos os documentos ficam armazenados de forma segura na nuvem</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HelpTab;