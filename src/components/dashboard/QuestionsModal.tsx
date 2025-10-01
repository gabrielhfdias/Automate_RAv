import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Eye } from "lucide-react"

interface Question {
  id: string
  pergunta: string
  tipo: string
  opcoes?: any
  campo_id: string
  ordem: number
}

interface Answer {
  resposta: string
  observacao: string
}

interface QuestionsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  aluno: {
    id: string
    nome: string
    bimestre?: string
  }
  onComplete: () => void
}

export function QuestionsModal({ isOpen, onOpenChange, aluno, onComplete }: QuestionsModalProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && aluno.id) {
      loadQuestions()
    }
  }, [isOpen, aluno.id])

  const loadQuestions = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('rav_questions')
        .select('*')
        .eq('aluno_id', aluno.id)
        .order('ordem')

      if (error) throw error

      setQuestions(data || [])
      
      // Carregar respostas existentes
      const { data: respostasExistentes } = await supabase
        .from('rav_answers')
        .select('question_id, resposta, observacao')
        .eq('aluno_id', aluno.id)
      
      // Inicializar respostas (vazias ou com dados existentes)
      const initialAnswers: Record<string, Answer> = {}
      data?.forEach(q => {
        const respostaExistente = respostasExistentes?.find(r => r.question_id === q.id)
        initialAnswers[q.id] = { 
          resposta: respostaExistente?.resposta || '', 
          observacao: respostaExistente?.observacao || '' 
        }
      })
      setAnswers(initialAnswers)

    } catch (error: any) {
      console.error('Erro ao carregar perguntas:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar perguntas: " + error.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        resposta: value
      }
    }))
    
    // Auto-save com debounce
    debouncedSave(questionId, value, answers[questionId]?.observacao || '')
  }

  const handleObservationChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        observacao: value
      }
    }))
    
    // Auto-save com debounce
    debouncedSave(questionId, answers[questionId]?.resposta || '', value)
  }

  // Função debounce helper
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  // Debounced save function para evitar muitas requisições
  const debouncedSave = useCallback(
    debounce(async (questionId: string, resposta: string, observacao: string) => {
      await saveAnswer(questionId, resposta, observacao)
    }, 1000), // 1 segundo de delay
    []
  )

  const saveAnswer = async (questionId: string, resposta: string, observacao: string) => {
    try {
      // Verificar se já existe uma resposta
      const { data: existing } = await supabase
        .from('rav_answers')
        .select('id')
        .eq('question_id', questionId)
        .eq('aluno_id', aluno.id)
        .single()

      if (existing) {
        // Atualizar resposta existente
        await supabase
          .from('rav_answers')
          .update({ resposta, observacao })
          .eq('question_id', questionId)
          .eq('aluno_id', aluno.id)
      } else {
        // Criar nova resposta (só se tiver conteúdo)
        if (resposta.trim() || observacao.trim()) {
          await supabase
            .from('rav_answers')
            .insert({
              question_id: questionId,
              aluno_id: aluno.id,
              resposta,
              observacao
            })
        }
      }
    } catch (error) {
      console.error('Erro ao salvar resposta:', error)
      // Não mostrar toast de erro para não incomodar o usuário durante digitação
    }
  }

  const allAnswered = questions.every(q => answers[q.id]?.resposta?.trim())

  const handleSaveDraft = async () => {
    toast({
      title: "Salvo automaticamente",
      description: "Suas respostas são salvas automaticamente conforme você preenche"
    })
  }

  const handleVisualizarAvaliacao = async () => {
    try {
      // Gerar prévia da avaliação baseada nas respostas atuais
      const respostasTexto = questions.map((q, index) => {
        const answer = answers[q.id]
        const resposta = answer?.resposta || 'Não respondida'
        const observacao = answer?.observacao || ''
        return `${index + 1}. ${q.pergunta}\nResposta: ${resposta}${observacao ? `\nObservação: ${observacao}` : ''}`
      }).join('\n\n')

      // Abrir em nova janela para visualização
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Prévia da Avaliação - ${aluno?.nome}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                h1 { color: #333; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
                .question { margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #007bff; }
                .answer { font-weight: bold; color: #007bff; }
                .observation { font-style: italic; color: #666; margin-top: 8px; }
              </style>
            </head>
            <body>
              <h1>Prévia da Avaliação - ${aluno?.nome}</h1>
              <p><strong>Bimestre:</strong> ${aluno?.bimestre || 'Não informado'}</p>
              <hr>
              ${questions.map((q, index) => {
                const answer = answers[q.id]
                const resposta = answer?.resposta || 'Não respondida'
                const observacao = answer?.observacao || ''
                return `
                  <div class="question">
                    <p><strong>${index + 1}. ${q.pergunta}</strong></p>
                    <p class="answer">Resposta: ${resposta}</p>
                    ${observacao ? `<p class="observation">Observação: ${observacao}</p>` : ''}
                  </div>
                `
              }).join('')}
            </body>
          </html>
        `)
        newWindow.document.close()
      }
    } catch (error: any) {
      console.error('Erro ao visualizar avaliação:', error)
      toast({
        title: "Erro", 
        description: "Erro ao gerar visualização",
        variant: "destructive"
      })
    }
  }

  const handleSubmit = async () => {
    if (!allAnswered) {
      toast({
        title: "Erro",
        description: "Por favor, responda todas as perguntas obrigatórias",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Salvar respostas no banco
      const answersToInsert = questions.map(q => ({
        question_id: q.id,
        aluno_id: aluno.id,
        resposta: answers[q.id].resposta,
        observacao: answers[q.id].observacao || null
      }))

      const { error: insertError } = await supabase
        .from('rav_answers')
        .insert(answersToInsert)

      if (insertError) throw insertError

      // Chamar edge function para gerar Coluna B
      const { error: functionError } = await supabase.functions.invoke('generate-coluna-b', {
        body: { aluno_id: aluno.id }
      })

      if (functionError) throw functionError

      // Chamar edge function para gerar documento final
      const { error: docError } = await supabase.functions.invoke('generate-final-docx', {
        body: { aluno_id: aluno.id }
      })

      if (docError) throw docError

      toast({
        title: "Sucesso!",
        description: "RAV gerado com sucesso!"
      })

      onOpenChange(false)
      onComplete()

    } catch (error: any) {
      console.error('Erro ao processar respostas:', error)
      toast({
        title: "Erro",
        description: "Erro ao processar respostas: " + error.message,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Carregando perguntas...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Perguntas de Avaliação - {aluno.nome}</DialogTitle>
          <DialogDescription>
            Responda as perguntas para gerar a descrição do processo de aprendizagem
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="border rounded-lg p-4 space-y-3">
              <Label className="text-base font-medium">
                {idx + 1}. {q.pergunta}
              </Label>
               
               {(q.tipo === 'opcoes' || q.tipo === 'multipla_escolha') ? (
                 <div>
                   <RadioGroup 
                     value={answers[q.id]?.resposta || ''} 
                     onValueChange={(val) => handleAnswerChange(q.id, val)}
                   >
                     {q.opcoes?.map((opt) => (
                       <div key={opt} className="flex items-center space-x-2">
                         <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                         <Label htmlFor={`${q.id}-${opt}`}>{opt}</Label>
                       </div>
                     ))}
                   </RadioGroup>
                   <div className="mt-2 flex justify-end">
                     <Button 
                       type="button" 
                       variant="ghost" 
                       size="sm" 
                       className="text-xs text-muted-foreground"
                       onClick={() => handleAnswerChange(q.id, 'QUESTAO_NAO_APLICAVEL')}
                     >
                       Não se aplica
                     </Button>
                   </div>
                 </div>
               ) : (
                 <div>
                   <Textarea 
                     value={answers[q.id]?.resposta || ''}
                     onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                     placeholder="Digite sua resposta..."
                     rows={3}
                   />
                   <div className="mt-2 flex justify-end">
                     <Button 
                       type="button" 
                       variant="ghost" 
                       size="sm" 
                       className="text-xs text-muted-foreground"
                       onClick={() => handleAnswerChange(q.id, 'QUESTAO_NAO_APLICAVEL')}
                     >
                       Não se aplica
                     </Button>
                   </div>
                 </div>
               )}
              
              <div className="mt-2">
                <Label className="text-sm text-muted-foreground">
                  Observações adicionais (opcional)
                </Label>
                <Textarea 
                  value={answers[q.id]?.observacao || ''}
                  onChange={(e) => handleObservationChange(q.id, e.target.value)}
                  placeholder="Adicione observações..."
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleSaveDraft}>
            Salvar Rascunho
          </Button>
          <Button 
            type="button"
            variant="outline" 
            onClick={handleVisualizarAvaliacao}
          >
            <Eye className="h-4 w-4 mr-2" />
            Visualizar Avaliação
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!allAnswered || isSubmitting}
          >
            {isSubmitting ? "Processando..." : "Confirmar e Gerar RAV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}