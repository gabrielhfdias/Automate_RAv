import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, Eye, Download, X, Edit, Save } from "lucide-react"

interface RAVPreviewModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  aluno: {
    id: string
    nome: string
    bimestre: string
    status: string
  }
}

export function RAVPreviewModal({ isOpen, onOpenChange, aluno }: RAVPreviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string>("")
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const loadPreview = async () => {
    if (!aluno.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-rav-preview', {
        body: { aluno_id: aluno.id }
      })

      if (error) throw error

      if (data.success) {
        setPreviewHtml(data.html)
      } else {
        throw new Error(data.error || 'Erro desconhecido')
      }
    } catch (error: any) {
      console.error('Erro ao carregar preview:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar preview do RAV: " + error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const openInNewWindow = () => {
    if (!previewHtml) return
    
    const newWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes')
    if (newWindow) {
      newWindow.document.write(previewHtml)
      newWindow.document.close()
    }
  }

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (open && !previewHtml) {
      loadPreview()
    }
    if (!open) {
      setIsEditing(false)
    }
  }

  const handleSaveEdits = async () => {
    setIsSaving(true)
    try {
      // Get edited content from iframe
      const iframe = document.querySelector('iframe')
      if (!iframe || !iframe.contentDocument) {
        throw new Error('Não foi possível acessar o conteúdo do preview')
      }

      const editedContent = iframe.contentDocument.body.innerHTML
      
      // Extract coluna_b from edited content
      const parser = new DOMParser()
      const doc = parser.parseFromString(editedContent, 'text/html')
      const evaluationText = doc.querySelector('.evaluation-text')
      const colunaBGerada = evaluationText?.textContent?.trim() || ''

      // Update database
      const { error } = await supabase
        .from('alunos')
        .update({ coluna_b_gerada: colunaBGerada })
        .eq('id', aluno.id)

      if (error) throw error

      toast({
        title: "Salvo com sucesso",
        description: "As alterações foram salvas no RAV."
      })

      setIsEditing(false)
      await loadPreview() // Reload to show saved changes
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview RAV - {aluno.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-between items-center py-2">
          <div className="text-sm text-muted-foreground">
            Bimestre: {aluno.bimestre} | Status: {aluno.status}
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={!previewHtml || loading}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar RAV
                </Button>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={openInNewWindow}
                  disabled={!previewHtml || loading}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Abrir em Nova Janela
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="default" 
                  size="sm"
                  onClick={handleSaveEdits}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
              </>
            )}
            <Button
              variant="outline" 
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Carregando preview do RAV...</p>
              </div>
            </div>
          ) : previewHtml ? (
            <div className="h-[500px] overflow-auto border rounded-lg">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                title={`Preview RAV - ${aluno.nome}`}
                style={{ pointerEvents: isEditing ? 'auto' : 'none' }}
              />
              {isEditing && (
                <div className="absolute top-0 right-0 m-4 bg-yellow-100 border border-yellow-400 px-3 py-1 rounded text-sm">
                  Modo de Edição Ativo
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Clique para carregar o preview</p>
                <Button onClick={loadPreview} className="mt-2">
                  Carregar Preview
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}