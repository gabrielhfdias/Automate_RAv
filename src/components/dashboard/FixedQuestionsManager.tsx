import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PerguntaFixa {
  id: string;
  pergunta: string;
  tipo: 'texto' | 'multipla_escolha';
  opcoes: string[] | null;
  ativa: boolean;
  ordem: number;
}

interface FixedQuestionsManagerProps {
  userId: string;
}

const FixedQuestionsManager = ({ userId }: FixedQuestionsManagerProps) => {
  const [perguntas, setPerguntas] = useState<PerguntaFixa[]>([]);
  const [loading, setLoading] = useState(false);
  const [novaPergunta, setNovaPergunta] = useState({
    pergunta: '',
    tipo: 'texto' as 'texto' | 'multipla_escolha',
    opcoes: ['']
  });
  const [editandoPergunta, setEditandoPergunta] = useState<PerguntaFixa | null>(null);
  const formularioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userId) {
      loadPerguntas();
    }
  }, [userId]);

  const loadPerguntas = async () => {
    try {
      const { data, error } = await supabase
        .from('perguntas_fixas')
        .select('*')
        .eq('professor_id', userId)
        .order('ordem');

      if (error) throw error;
      // Convertendo os dados para o tipo correto
      const perguntasFormatadas = (data || []).map(item => ({
        ...item,
        tipo: item.tipo as 'texto' | 'multipla_escolha',
        opcoes: item.opcoes as string[] | null
      }));
      setPerguntas(perguntasFormatadas);
    } catch (error: any) {
      console.error('Erro ao carregar perguntas:', error);
      toast.error('Erro ao carregar perguntas fixas');
    }
  };

  const adicionarPergunta = async () => {
    if (!novaPergunta.pergunta.trim()) {
      toast.error('Digite o texto da pergunta');
      return;
    }

    if (novaPergunta.tipo === 'multipla_escolha' && 
        (!novaPergunta.opcoes || novaPergunta.opcoes.filter(op => op.trim()).length < 2)) {
      toast.error('Adicione pelo menos 2 opções para pergunta de múltipla escolha');
      return;
    }

    setLoading(true);
    try {
      const proximaOrdem = Math.max(...perguntas.map(p => p.ordem), 0) + 1;
      
      const { error } = await supabase
        .from('perguntas_fixas')
        .insert({
          professor_id: userId,
          pergunta: novaPergunta.pergunta.trim(),
          tipo: novaPergunta.tipo,
          opcoes: novaPergunta.tipo === 'multipla_escolha' 
            ? novaPergunta.opcoes.filter(op => op.trim()) 
            : null,
          ordem: proximaOrdem,
          ativa: true
        });

      if (error) throw error;

      setNovaPergunta({ pergunta: '', tipo: 'texto', opcoes: [''] });
      await loadPerguntas();
      toast.success('Pergunta adicionada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao adicionar pergunta:', error);
      toast.error('Erro ao adicionar pergunta');
    } finally {
      setLoading(false);
    }
  };

  const removerPergunta = async (id: string) => {
    try {
      const { error } = await supabase
        .from('perguntas_fixas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadPerguntas();
      toast.success('Pergunta removida');
    } catch (error: any) {
      console.error('Erro ao remover pergunta:', error);
      toast.error('Erro ao remover pergunta');
    }
  };

  const toggleAtiva = async (id: string, ativa: boolean) => {
    try {
      const { error } = await supabase
        .from('perguntas_fixas')
        .update({ ativa })
        .eq('id', id);

      if (error) throw error;
      await loadPerguntas();
    } catch (error: any) {
      console.error('Erro ao atualizar pergunta:', error);
      toast.error('Erro ao atualizar pergunta');
    }
  };

  const atualizarOpcao = (index: number, valor: string) => {
    const novasOpcoes = [...novaPergunta.opcoes];
    novasOpcoes[index] = valor;
    setNovaPergunta(prev => ({ ...prev, opcoes: novasOpcoes }));
  };

  const adicionarOpcao = () => {
    setNovaPergunta(prev => ({ 
      ...prev, 
      opcoes: [...prev.opcoes, ''] 
    }));
  };

  const removerOpcao = (index: number) => {
    if (novaPergunta.opcoes.length > 1) {
      const novasOpcoes = novaPergunta.opcoes.filter((_, i) => i !== index);
      setNovaPergunta(prev => ({ ...prev, opcoes: novasOpcoes }));
    }
  };

  const editarPergunta = (pergunta: PerguntaFixa) => {
    console.log('Editando pergunta:', pergunta);
    setEditandoPergunta(pergunta);
    setNovaPergunta({
      pergunta: pergunta.pergunta,
      tipo: pergunta.tipo,
      opcoes: pergunta.opcoes && Array.isArray(pergunta.opcoes) ? pergunta.opcoes : ['']
    });
    console.log('Estado de edição configurado para:', pergunta.pergunta);
    toast.success('Pergunta carregada para edição');
    
    // Scroll automático para o formulário de edição
    setTimeout(() => {
      formularioRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  const cancelarEdicao = () => {
    setEditandoPergunta(null);
    setNovaPergunta({ pergunta: '', tipo: 'texto', opcoes: [''] });
  };

  const salvarEdicao = async () => {
    if (!editandoPergunta) return;
    
    if (!novaPergunta.pergunta.trim()) {
      toast.error('Digite o texto da pergunta');
      return;
    }

    if (novaPergunta.tipo === 'multipla_escolha' && 
        (!novaPergunta.opcoes || novaPergunta.opcoes.filter(op => op.trim()).length < 2)) {
      toast.error('Adicione pelo menos 2 opções para pergunta de múltipla escolha');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('perguntas_fixas')
        .update({
          pergunta: novaPergunta.pergunta.trim(),
          tipo: novaPergunta.tipo,
          opcoes: novaPergunta.tipo === 'multipla_escolha' 
            ? novaPergunta.opcoes.filter(op => op.trim()) 
            : null,
        })
        .eq('id', editandoPergunta.id);

      if (error) throw error;

      cancelarEdicao();
      await loadPerguntas();
      toast.success('Pergunta atualizada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar pergunta:', error);
      toast.error('Erro ao atualizar pergunta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card ref={formularioRef}>
        <CardHeader>
          <CardTitle>
            {editandoPergunta ? 'Editando Pergunta' : 'Perguntas Padrão Pré-definidas'}
          </CardTitle>
          <CardDescription>
            {editandoPergunta 
              ? 'Modifique os dados da pergunta e clique em "Salvar Edição"'
              : 'Configure perguntas fixas que serão usadas APENAS quando não houver documento do aluno para análise. Quando há documento, o sistema gera perguntas automaticamente baseadas na leitura do campo B pela IA.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nova-pergunta">Nova Pergunta</Label>
              <Textarea
                id="nova-pergunta"
                value={novaPergunta.pergunta}
                onChange={(e) => setNovaPergunta(prev => ({ ...prev, pergunta: e.target.value }))}
                placeholder="Digite sua pergunta..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo-pergunta">Tipo de Pergunta</Label>
              <Select 
                value={novaPergunta.tipo} 
                onValueChange={(value: 'texto' | 'multipla_escolha') => 
                  setNovaPergunta(prev => ({ ...prev, tipo: value, opcoes: value === 'multipla_escolha' ? [''] : [] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="texto">Texto Livre</SelectItem>
                  <SelectItem value="multipla_escolha">Múltipla Escolha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {novaPergunta.tipo === 'multipla_escolha' && (
              <div className="space-y-2">
                <Label>Opções de Resposta</Label>
                {novaPergunta.opcoes.map((opcao, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={opcao}
                      onChange={(e) => atualizarOpcao(index, e.target.value)}
                      placeholder={`Opção ${index + 1}`}
                    />
                    {novaPergunta.opcoes.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removerOpcao(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarOpcao}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Opção
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              {editandoPergunta ? (
                <>
                  <Button onClick={salvarEdicao} disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar Edição'}
                  </Button>
                  <Button onClick={cancelarEdicao} variant="outline">
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button onClick={adicionarPergunta} disabled={loading}>
                  {loading ? 'Adicionando...' : 'Adicionar Pergunta'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perguntas Configuradas ({perguntas.length})</CardTitle>
          <CardDescription>
            Gerencie suas perguntas fixas. Use o ícone de arrastar para reordenar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {perguntas.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma pergunta configurada. Quando você adicionar perguntas fixas,
              elas serão usadas no lugar das perguntas geradas automaticamente.
            </p>
          ) : (
            <div className="space-y-3">
              {perguntas.map((pergunta) => (
                <div key={pergunta.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Badge variant={pergunta.ativa ? "default" : "secondary"}>
                          {pergunta.ativa ? 'Ativa' : 'Inativa'}
                        </Badge>
                        <Badge variant="outline">
                          {pergunta.tipo === 'texto' ? 'Texto Livre' : 'Múltipla Escolha'}
                        </Badge>
                      </div>
                      <p className="font-medium">{pergunta.pergunta}</p>
                      {pergunta.opcoes && pergunta.opcoes.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground mb-1">Opções:</p>
                          <ul className="text-sm space-y-1">
                            {pergunta.opcoes.map((opcao, index) => (
                              <li key={index} className="ml-4">• {opcao}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editarPergunta(pergunta)}
                        disabled={editandoPergunta?.id === pergunta.id}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAtiva(pergunta.id, !pergunta.ativa)}
                      >
                        {pergunta.ativa ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removerPergunta(pergunta.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FixedQuestionsManager;