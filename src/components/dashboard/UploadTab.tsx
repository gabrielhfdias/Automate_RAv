import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, FileText } from "lucide-react";

interface UploadTabProps {
  userId: string;
}

const UploadTab = ({ userId }: UploadTabProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Selecione pelo menos um arquivo");
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Get config
      const { data: config } = await supabase
        .from("configuracoes")
        .select("bimestre")
        .eq("professor_id", userId)
        .single();

      if (!config) {
        toast.error("Configure o sistema antes de fazer upload");
        setUploading(false);
        return;
      }

      for (const file of files) {
        try {
          const fileExt = file.name.split('.').pop();
          // Sanitize filename to remove special characters
          const sanitizedName = file.name
            .replace(/[°ºª]/g, '')  // Remove degree symbols
            .replace(/[^\w\s.-]/g, '') // Remove special chars except word chars, spaces, dots, hyphens
            .replace(/\s+/g, '_')  // Replace spaces with underscores
            .trim();
          
          const fileName = `${userId}/${Date.now()}_${sanitizedName}`;
          
          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from("documentos-alunos")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Extract student name from filename
          const alunoNome = file.name.replace('.docx', '').trim();

          // Create student record
          const { error: insertError } = await supabase
            .from("alunos")
            .insert({
              nome: alunoNome,
              professor_id: userId,
              bimestre: config.bimestre,
              arquivo_original_path: fileName,
              status: "pendente",
            });

          if (insertError) throw insertError;
          successCount++;
        } catch (error) {
          console.error("Error uploading file:", file.name, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} arquivo(s) enviado(s) com sucesso!`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} arquivo(s) falharam`);
      }

      // Reset files after upload attempt
      setFiles([]);
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
      // Reset files on error too
      setFiles([]);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload de Documentos</CardTitle>
        <CardDescription>
          Envie os arquivos .docx dos alunos para processamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center hover:border-primary/40 transition-colors">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <input
            type="file"
            multiple
            accept=".docx"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Selecionar Arquivos
          </label>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione múltiplos arquivos .docx
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Arquivos selecionados:</p>
            <div className="space-y-1">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="w-full"
        >
          {uploading ? "Enviando..." : `Enviar ${files.length} arquivo(s)`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default UploadTab;