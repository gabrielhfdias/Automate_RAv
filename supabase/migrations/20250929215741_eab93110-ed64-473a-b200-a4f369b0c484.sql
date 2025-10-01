-- Create table for custom fixed questions
CREATE TABLE public.perguntas_fixas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professor_id UUID NOT NULL,
  pergunta TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'multipla_escolha', 'sim_nao')),
  opcoes JSONB,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.perguntas_fixas ENABLE ROW LEVEL SECURITY;

-- Create policies for professors to manage their questions
CREATE POLICY "Professors can manage their fixed questions" 
ON public.perguntas_fixas 
FOR ALL 
USING (auth.uid() = professor_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_perguntas_fixas_updated_at
BEFORE UPDATE ON public.perguntas_fixas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with default questions for existing professors
INSERT INTO public.perguntas_fixas (professor_id, pergunta, tipo, ordem)
SELECT DISTINCT 
  p.id as professor_id,
  unnest(ARRAY[
    'Como o aluno demonstra compreensão dos conceitos apresentados?',
    'Quais evidências indicam o desenvolvimento da habilidade de resolução de problemas?',
    'Como o aluno aplica o conhecimento em situações práticas?',
    'Que progressos são observados na autonomia do aluno?',
    'Quais são as principais dificuldades identificadas?',
    'Como o aluno interage e colabora com os colegas?',
    'Que estratégias de estudo o aluno demonstra utilizar?',
    'Como o aluno expressa seu raciocínio e justifica suas respostas?',
    'Quais evidências mostram criatividade e pensamento crítico?',
    'Como o aluno lida com desafios e superação de obstáculos?',
    'Que aspectos indicam engajamento e motivação para aprender?',
    'Quais recomendações podem apoiar o desenvolvimento contínuo do aluno?'
  ]) as pergunta,
  'texto' as tipo,
  generate_series(1, 12) as ordem
FROM profiles p;