import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Save, X } from "lucide-react"

interface ColunaEditModalProps {
  isOpen: boolean
  onClose: () => void
  aluno: {
    id: string
    nome: string
    coluna_b_gerada?: string
  }
  onSaved: () => void
}

export function ColunaEditModal({ isOpen, onClose, aluno, onSaved }: ColunaEditModalProps) {
  const [colunaB, setColunaB] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && aluno.coluna_b_gerada) {
      setColunaB(aluno.coluna_b_gerada)
    }
  }, [isOpen, aluno.coluna_b_gerada])

  const handleSave = async () => {
    if (!colunaB.trim()) {
      toast({
        title: "Erro",
        description: "A descrição não pode estar vazia",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('alunos')
        .update({ coluna_b_gerada: colunaB })
        .eq('id', aluno.id)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Descrição atualizada com sucesso"
      })
      
      onSaved()
      onClose()
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar: " + error.message,
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Editar Descrição do Processo de Aprendizagem</span>
            <span className="text-sm font-normal text-muted-foreground">
              - {aluno.nome}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Descrição do Processo de Aprendizagem (Coluna B):
            </label>
            <Textarea
              value={colunaB}
              onChange={(e) => setColunaB(e.target.value)}
              placeholder="Digite a descrição do processo de aprendizagem do estudante..."
              rows={15}
              className="min-h-[400px] resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Esta descrição será utilizada na geração final do documento RAV.
              Edite conforme necessário para melhor descrever o processo de aprendizagem do estudante.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !colunaB.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}