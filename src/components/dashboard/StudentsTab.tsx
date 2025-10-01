import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { RefreshCw, Download, Play, MessageSquare, Eye, AlertCircle, X, GraduationCap, Brain } from "lucide-react"
import { QuestionsModal } from "./QuestionsModal"
import { ProcessingTypeModal } from "./ProcessingTypeModal"
import { ColunaEditModal } from "./ColunaEditModal"
import { RAVPreviewModal } from "./RAVPreviewModal"

interface Student {
  id: string
  nome: string
  professor_id: string
  bimestre: string
  arquivo_original_path: string
  arquivo_processado_path: string | null
  status: string
  created_at: string
  evidencias_extraidas?: string
  coluna_b_gerada?: string
  turma?: string
  serie?: string
  is_tea?: boolean
}

interface StudentsTabProps {
  userId: string
}

export default function StudentsTab({ userId }: StudentsTabProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<string>("todos")
  const [busca, setBusca] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [questionsModalOpen, setQuestionsModalOpen] = useState(false)
  const [processingModalOpen, setProcessingModalOpen] = useState(false)
  const [colunaEditModalOpen, setColunaEditModalOpen] = useState(false)
  const [studentForProcessing, setStudentForProcessing] = useState<Student | null>(null)
  const [studentForEdit, setStudentForEdit] = useState<Student | null>(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [studentForPreview, setStudentForPreview] = useState<Student | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (userId) {
      loadStudents()
    }
  }, [userId])

  const loadStudents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select('*')
        .eq('professor_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setStudents(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar alunos:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar alunos: " + error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = async (path: string, nome: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('relatorios-processados')
        .download(path)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `RAV_${nome}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Sucesso!",
        description: "Relatório baixado com sucesso"
      })
    } catch (error: any) {
      console.error('Erro ao baixar:', error)
      toast({
        title: "Erro",
        description: "Erro ao baixar relatório: " + error.message,
        variant: "destructive"
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="secondary">Pendente</Badge>
      case 'extraindo_dados':
        return <Badge variant="default">Extraindo Dados</Badge>
      case 'aguardando_perguntas':
        return <Badge variant="default">Gerando Perguntas</Badge>
      case 'aguardando_respostas':
        return <Badge variant="destructive">Aguardando Respostas</Badge>
      case 'processando_resposta':
        return <Badge variant="default">Processando Resposta</Badge>
      case 'gerando_documento':
        return <Badge variant="default">Gerando Documento</Badge>
      case 'concluido':
        return <Badge variant="default" className="bg-green-100 text-green-800">Concluído</Badge>
      case 'erro':
        return <Badge variant="destructive">Erro</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getProgress = (status: string) => {
    switch (status) {
      case 'pendente': return 0
      case 'extraindo_dados': return 20
      case 'aguardando_perguntas': return 30
      case 'aguardando_respostas': return 50
      case 'processando_resposta': return 70
      case 'gerando_documento': return 90
      case 'concluido': return 100
      case 'erro': return 0
      default: return 0
    }
  }

  const iniciarAvaliacao = (student: Student) => {
    setStudentForProcessing(student)
    setProcessingModalOpen(true)
  }

  const handleProcessingTypeConfirm = async (type: "fixo" | "dinamico") => {
    if (!studentForProcessing) return

    setProcessing(studentForProcessing.id)
    try {
      const { error } = await supabase.functions.invoke('extract-student-data', {
        body: { 
          aluno_id: studentForProcessing.id,
          prompt_tipo: type 
        }
      })

      if (error) throw error

      // Chamar geração de perguntas
      const { error: questionsError } = await supabase.functions.invoke('generate-questions', {
        body: { 
          aluno_id: studentForProcessing.id,
          prompt_tipo: type 
        }
      })

      if (questionsError) throw questionsError

      toast({
        title: "Sucesso!",
        description: "Avaliação iniciada com sucesso. Responda as perguntas geradas."
      })

      loadStudents()
    } catch (error: any) {
      console.error('Erro ao iniciar avaliação:', error)
      toast({
        title: "Erro",
        description: "Erro ao iniciar avaliação: " + error.message,
        variant: "destructive"
      })
    } finally {
      setProcessing(null)
      setStudentForProcessing(null)
    }
  }

  const abrirPerguntas = (student: Student) => {
    setSelectedStudent(student)
    setQuestionsModalOpen(true)
  }

  const verDetalhes = (student: Student) => {
    setStudentForEdit(student)
    setColunaEditModalOpen(true)
  }

  const baixarPDF = async (alunoId: string) => {
    if (isDownloading) return // Prevenir duplo clique
    
    setIsDownloading(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-pdf-rav', {
        body: { aluno_id: alunoId }
      })

      if (error) throw error

      if (data.success) {
        // Fazer download do arquivo do storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('relatorios-processados')
          .download(data.fileName)

        if (downloadError) throw downloadError

        // Criar e fazer download do arquivo
        const url = URL.createObjectURL(fileData)
        const a = document.createElement('a')
        a.href = url
        a.download = data.fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: "Sucesso!",
          description: "Documento gerado e baixado com sucesso!"
        })
      }
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error)
      toast({
        title: "Erro",
        description: "Erro ao gerar PDF: " + error.message,
        variant: "destructive"
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const visualizarRAV = async (student: Student) => {
    try {
      if (!student.arquivo_processado_path) {
        toast({
          title: "Erro",
          description: "Documento RAV não encontrado",
          variant: "destructive"
        })
        return
      }

      // Download do arquivo para visualizar
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('relatorios-processados')
        .download(student.arquivo_processado_path)

      if (downloadError) throw downloadError

      // Abrir em nova aba para visualização
      const url = URL.createObjectURL(fileData)
      window.open(url, '_blank')
      
      // Limpar URL após um tempo
      setTimeout(() => URL.revokeObjectURL(url), 10000)

    } catch (error: any) {
      console.error('Erro ao visualizar RAV:', error)
      toast({
        title: "Erro",
        description: "Erro ao abrir documento: " + error.message,
        variant: "destructive"
      })
    }
  }


  const verErro = (student: Student) => {
    // Implementar modal de erro se necessário
    toast({
      title: "Erro",
      description: "Funcionalidade em desenvolvimento"
    })
  }

  const reprocessar = async (alunoId: string) => {
    setProcessing(alunoId)
    try {
      // Resetar status para pendente primeiro
      await supabase
        .from('alunos')
        .update({ status: 'pendente' })
        .eq('id', alunoId)

      // Limpar perguntas e respostas anteriores se existirem
      await Promise.all([
        supabase.from('rav_questions').delete().eq('aluno_id', alunoId),
        supabase.from('rav_answers').delete().eq('aluno_id', alunoId)
      ])

      toast({
        title: "Sucesso!",
        description: "Aluno resetado. Clique em 'Iniciar Avaliação' novamente."
      })

      loadStudents()
    } catch (error: any) {
      console.error('Erro ao reprocessar:', error)
      toast({
        title: "Erro",
        description: "Erro ao reprocessar: " + error.message,
        variant: "destructive"
      })
    } finally {
      setProcessing(null)
    }
  }

  const continuarAvaliacao = async (student: Student) => {
    setProcessing(student.id)
    try {
      // Verificar se há perguntas já geradas
      const { data: perguntas } = await supabase
        .from('rav_questions')
        .select('*')
        .eq('aluno_id', student.id)

      if (perguntas && perguntas.length > 0) {
        // Se há perguntas, ir direto para responder
        await supabase
          .from('alunos')
          .update({ status: 'aguardando_respostas' })
          .eq('id', student.id)
        
        toast({
          title: "Perguntas encontradas!",
          description: "Continuando de onde parou. Clique em 'Responder Perguntas'."
        })
      } else {
        // Se não há perguntas, tentar gerar novamente
        const { error: questionsError } = await supabase.functions.invoke('generate-questions', {
          body: { 
            aluno_id: student.id,
            prompt_tipo: 'dinamico' // Default para dinâmico
          }
        })

        if (questionsError) {
          throw questionsError
        }

        toast({
          title: "Perguntas geradas!",
          description: "Avaliação continuada com sucesso."
        })
      }

      loadStudents()
    } catch (error: any) {
      console.error('Erro ao continuar avaliação:', error)
      toast({
        title: "Erro",
        description: "Erro ao continuar avaliação: " + error.message,
        variant: "destructive"
      })
    } finally {
      setProcessing(null)
    }
  }

  const deleteStudent = async (student: Student) => {
    setDeleting(student.id)
    try {
      // Delete student record
      const { error: deleteError } = await supabase
        .from('alunos')
        .delete()
        .eq('id', student.id)

      if (deleteError) throw deleteError

      // Delete files from storage
      const filesToDelete = []
      if (student.arquivo_original_path) {
        filesToDelete.push(supabase.storage.from('documentos-alunos').remove([student.arquivo_original_path]))
      }
      if (student.arquivo_processado_path) {
        filesToDelete.push(supabase.storage.from('relatorios-processados').remove([student.arquivo_processado_path]))
      }

      // Delete related questions and answers
      filesToDelete.push(
        supabase.from('rav_questions').delete().eq('aluno_id', student.id),
        supabase.from('rav_answers').delete().eq('aluno_id', student.id)
      )

      await Promise.all(filesToDelete)

      toast({
        title: "Sucesso!",
        description: `Aluno ${student.nome} excluído com sucesso.`
      })

      loadStudents()
    } catch (error: any) {
      console.error('Erro ao excluir aluno:', error)
      toast({
        title: "Erro",
        description: "Erro ao excluir aluno: " + error.message,
        variant: "destructive"
      })
    } finally {
      setDeleting(null)
    }
  }

  const extractStudentName = (filename: string): string => {
    // Extract name from filename patterns like "RAV_2°_bimestre_Gabriel.docx"
    const patterns = [
      /RAV_.*?_.*?_(.+)\.docx?$/i,
      /.*_(.+)\.docx?$/i,
      /(.+)\.docx?$/i
    ]
    
    for (const pattern of patterns) {
      const match = filename.match(pattern)
      if (match && match[1]) {
        return match[1].replace(/[_-]/g, ' ').trim()
      }
    }
    
    return filename.replace(/\.docx?$/i, '')
  }

  // Filtrar estudantes
  const filteredStudents = students.filter(student => {
    const matchesStatus = filtroStatus === "todos" || student.status === filtroStatus
    const matchesSearch = student.nome.toLowerCase().includes(busca.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Estatísticas
  const totalStudents = students.length
  const aguardandoCount = students.filter(s => s.status === 'aguardando_respostas').length
  const concluidosCount = students.filter(s => s.status === 'concluido').length
  const errosCount = students.filter(s => s.status === 'erro').length

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Painel de Controle - Alunos</CardTitle>
          
          {/* Estatísticas no topo */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{totalStudents}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{aguardandoCount}</div>
              <div className="text-sm text-muted-foreground">Aguardando</div>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{concluidosCount}</div>
              <div className="text-sm text-muted-foreground">Concluídos</div>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{errosCount}</div>
              <div className="text-sm text-muted-foreground">Erros</div>
            </div>
          </div>
          
          {/* Filtros */}
          <div className="flex gap-2 mt-4">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aguardando_respostas">Aguardando Respostas</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="erro">Com Erro</SelectItem>
              </SelectContent>
            </Select>
            
            <Input 
              placeholder="Buscar por nome..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="max-w-sm"
            />
            
            <Button onClick={loadStudents} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {students.length === 0 
                ? "Nenhum aluno encontrado. Faça o upload de documentos na aba 'Upload'."
                : "Nenhum aluno encontrado com os filtros aplicados."
              }
            </p>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student) => (
                <div key={student.id} className="border rounded-lg p-4 relative">
                  {/* Delete Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        disabled={deleting === student.id || (processing === student.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o aluno <strong>{student.nome}</strong>? 
                          Esta ação não pode ser desfeita e removerá todos os dados associados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteStudent(student)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <div className="flex items-start justify-between pr-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        <p className="font-semibold text-lg">{student.nome || extractStudentName(student.arquivo_original_path)}</p>
                        {student.is_tea && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            <Brain className="h-3 w-3 mr-1" />
                            TEA
                          </Badge>
                        )}
                        {getStatusBadge(student.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        {student.serie && (
                          <span>{student.serie}</span>
                        )}
                        {student.turma && (
                          <span>Turma: {student.turma}</span>
                        )}
                        <span>{student.bimestre}</span>
                        <span>Upload: {new Date(student.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      
                      {/* Barra de progresso */}
                      {student.status !== 'concluido' && student.status !== 'erro' && (
                        <div className="mt-2">
                          <Progress value={getProgress(student.status)} className="w-64" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {getProgress(student.status)}% - {student.status.replace('_', ' ')}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {/* Botões baseados no status */}
                      {student.status === 'pendente' && (
                        <Button 
                          size="sm" 
                          onClick={() => iniciarAvaliacao(student)}
                          disabled={processing === student.id}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          {processing === student.id ? "Iniciando..." : "Iniciar Avaliação"}
                        </Button>
                      )}
                      
                      {student.status === 'aguardando_respostas' && (
                        <div className="flex flex-col gap-2 items-end">
                          <Button size="sm" onClick={() => abrirPerguntas(student)}>
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Responder Perguntas
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => reprocessar(student.id)}
                            disabled={processing === student.id}
                          >
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Reiniciar
                          </Button>
                        </div>
                      )}

                      {/* Status intermediários que precisam de ação */}
                      {(student.status === 'aguardando_perguntas' || 
                        student.status === 'extraindo_dados' || 
                        student.status === 'processando_resposta' ||
                        student.status === 'gerando_documento') && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => continuarAvaliacao(student)}
                            disabled={processing === student.id}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            {processing === student.id ? "Verificando..." : "Continuar Avaliação"}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => reprocessar(student.id)}
                            disabled={processing === student.id}
                          >
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Reiniciar
                          </Button>
                        </>
                      )}
                      
                      {student.status === 'concluido' && (
                        <div className="flex flex-col gap-2 items-end">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setStudentForPreview(student)
                                setPreviewModalOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Visualizar RAV
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => downloadReport(student.arquivo_processado_path!, student.nome)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Baixar RAV
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => baixarPDF(student.id)}
                              disabled={isDownloading}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              {isDownloading ? "Baixando..." : "Baixar PDF"}
                            </Button>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                disabled={processing === student.id}
                              >
                                <AlertCircle className="h-4 w-4 mr-1" />
                                Reiniciar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Reinício</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja reiniciar a avaliação de <strong>{student.nome}</strong>? 
                                  Esta ação irá apagar todas as respostas e o RAV gerado, retornando o aluno para o status pendente.
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => reprocessar(student.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Sim, Reiniciar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                      
                      {student.status === 'erro' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => verErro(student)}
                          >
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Ver Erro
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => reprocessar(student.id)}
                            disabled={processing === student.id}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            {processing === student.id ? "Reprocessando..." : "Reprocessar"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Perguntas */}
      {selectedStudent && (
        <QuestionsModal
          isOpen={questionsModalOpen}
          onOpenChange={setQuestionsModalOpen}
          aluno={selectedStudent}
          onComplete={() => {
            loadStudents()
            setSelectedStudent(null)
          }}
        />
      )}

      {/* Modal de Tipo de Processamento */}
      {studentForProcessing && (
        <ProcessingTypeModal
          isOpen={processingModalOpen}
          onOpenChange={setProcessingModalOpen}
          studentName={extractStudentName(studentForProcessing.nome)}
          onConfirm={handleProcessingTypeConfirm}
        />
      )}

      {/* Modal de Edição da Coluna B */}
      {studentForEdit && (
        <ColunaEditModal
          isOpen={colunaEditModalOpen}
          onClose={() => {
            setColunaEditModalOpen(false)
            setStudentForEdit(null)
          }}
          aluno={studentForEdit}
          onSaved={() => {
            loadStudents()
          }}
        />
      )}

      {previewModalOpen && studentForPreview && (
        <RAVPreviewModal
          isOpen={previewModalOpen}
          onOpenChange={setPreviewModalOpen}
          aluno={studentForPreview}
        />
      )}
    </>
  )
}