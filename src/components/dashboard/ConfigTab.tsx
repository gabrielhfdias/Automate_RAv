import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConfigTabProps {
  userId: string;
}

const ConfigTab = ({ userId }: ConfigTabProps) => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    professor: '',
    matricula: '',
    bimestre: '',
    ano_letivo: '',
    coordenacao_regional: '',
    unidade_escolar: '',
    bloco: '',
    ano: '',
    turma_config: '',
    turno: ''
  });

  useEffect(() => {
    if (userId) {
      loadConfig();
    }
  }, [userId]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('professor_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig({
          professor: data.professor || '',
          matricula: data.matricula || '',
          bimestre: data.bimestre || '',
          ano_letivo: data.ano_letivo || '',
          coordenacao_regional: data.coordenacao_regional || '',
          unidade_escolar: data.unidade_escolar || '',
          bloco: data.bloco || '',
          ano: data.ano || '',
          turma_config: data.turma_config || '',
          turno: data.turno || ''
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar configuração:', error);
      toast.error('Erro ao carregar configuração');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Validações básicas
      if (!config.professor || !config.matricula || !config.bimestre) {
        toast.error('Preencha os campos obrigatórios: Professor, Matrícula e Bimestre');
        return;
      }

      // Salvar configuração principal
      const { error: configError } = await supabase
        .from('configuracoes')
        .upsert({
          professor_id: userId,
          professor: config.professor,
          matricula: config.matricula,
          bimestre: config.bimestre,
          ano_letivo: config.ano_letivo,
          coordenacao_regional: config.coordenacao_regional,
          unidade_escolar: config.unidade_escolar,
          bloco: config.bloco,
          ano: config.ano,
          turma_config: config.turma_config,
          turno: config.turno,
          template_id: null // Template fixo integrado
        }, {
          onConflict: 'professor_id'
        });

      if (configError) {
        throw configError;
      }

      toast.success('Configuração salva com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Configurações do Sistema</CardTitle>
        <CardDescription>
          Configure os dados básicos para geração dos relatórios RAV. 
          O template está integrado ao sistema - não é necessário upload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="professor">Professor *</Label>
            <Input
              id="professor"
              value={config.professor}
              onChange={(e) => updateConfig('professor', e.target.value)}
              placeholder="Nome do professor"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="matricula">Matrícula *</Label>
            <Input
              id="matricula"
              value={config.matricula}
              onChange={(e) => updateConfig('matricula', e.target.value)}
              placeholder="Matrícula do professor"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bimestre">Bimestre *</Label>
            <Select value={config.bimestre} onValueChange={(value) => updateConfig('bimestre', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o bimestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1º Bimestre">1º Bimestre</SelectItem>
                <SelectItem value="2º Bimestre">2º Bimestre</SelectItem>
                <SelectItem value="3º Bimestre">3º Bimestre</SelectItem>
                <SelectItem value="4º Bimestre">4º Bimestre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ano_letivo">Ano Letivo</Label>
            <Input
              id="ano_letivo"
              value={config.ano_letivo}
              onChange={(e) => updateConfig('ano_letivo', e.target.value)}
              placeholder="Ex: 2025"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coordenacao_regional">Coordenação Regional</Label>
            <Input
              id="coordenacao_regional"
              value={config.coordenacao_regional}
              onChange={(e) => updateConfig('coordenacao_regional', e.target.value)}
              placeholder="Ex: CRE Plano Piloto"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unidade_escolar">Unidade Escolar</Label>
            <Input
              id="unidade_escolar"
              value={config.unidade_escolar}
              onChange={(e) => updateConfig('unidade_escolar', e.target.value)}
              placeholder="Nome da escola"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bloco">Bloco</Label>
            <Select value={config.bloco} onValueChange={(value) => updateConfig('bloco', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o bloco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BIA - 1º Bloco">BIA - 1º Bloco</SelectItem>
                <SelectItem value="BIA - 2º Bloco">BIA - 2º Bloco</SelectItem>
                <SelectItem value="BIA - 3º Bloco">BIA - 3º Bloco</SelectItem>
                <SelectItem value="2º Bloco">2º Bloco</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ano">Ano</Label>
            <Select value={config.ano} onValueChange={(value) => updateConfig('ano', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1º Ano">1º Ano</SelectItem>
                <SelectItem value="2º Ano">2º Ano</SelectItem>
                <SelectItem value="3º Ano">3º Ano</SelectItem>
                <SelectItem value="4º Ano">4º Ano</SelectItem>
                <SelectItem value="5º Ano">5º Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="turma_config">Turma</Label>
            <Input
              id="turma_config"
              value={config.turma_config}
              onChange={(e) => updateConfig('turma_config', e.target.value)}
              placeholder="Ex: A, B, C"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="turno">Turno</Label>
            <Select value={config.turno} onValueChange={(value) => updateConfig('turno', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o turno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Matutino">Matutino</SelectItem>
                <SelectItem value="Vespertino">Vespertino</SelectItem>
                <SelectItem value="Noturno">Noturno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>


        <div className="pt-4">
          <Button onClick={handleSave} disabled={loading} className="w-full md:w-auto">
            {loading ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Informações Importantes:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Template RAV integrado ao sistema - não é necessário upload</li>
            <li>• Campos marcados com * são obrigatórios</li>
            <li>• As configurações serão aplicadas a todos os relatórios gerados</li>
            <li>• Você pode alterar essas configurações a qualquer momento</li>
            <li>• O tipo de processamento (Fixo/Dinâmico) é escolhido ao iniciar cada avaliação</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfigTab;