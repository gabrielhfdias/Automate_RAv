-- Criar tabela para perguntas geradas pela IA (Prompt 1)
CREATE TABLE public.rav_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('opcoes', 'texto')),
  opcoes JSONB,
  campo_id TEXT,
  ordem INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para respostas do professor
CREATE TABLE public.rav_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.rav_questions(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  resposta TEXT NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar novos campos na tabela alunos
ALTER TABLE public.alunos 
  ADD COLUMN evidencias_extraidas TEXT,
  ADD COLUMN coluna_b_antiga TEXT,
  ADD COLUMN coluna_b_gerada TEXT,
  ADD COLUMN prompt1_payload JSONB,
  ADD COLUMN prompt2_payload JSONB;

-- Atualizar constraint de status
ALTER TABLE public.alunos DROP CONSTRAINT IF EXISTS alunos_status_check;
ALTER TABLE public.alunos ADD CONSTRAINT alunos_status_check 
  CHECK (status IN (
    'pendente', 
    'extraindo_dados', 
    'aguardando_perguntas',
    'aguardando_respostas', 
    'processando_resposta',
    'gerando_documento',
    'concluido', 
    'erro'
  ));

-- Habilitar RLS
ALTER TABLE public.rav_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rav_answers ENABLE ROW LEVEL SECURITY;

-- Policies para rav_questions
CREATE POLICY "Users can view their own questions" 
ON public.rav_questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.alunos 
    WHERE alunos.id = rav_questions.aluno_id 
    AND alunos.professor_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own questions" 
ON public.rav_questions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.alunos 
    WHERE alunos.id = rav_questions.aluno_id 
    AND alunos.professor_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own questions" 
ON public.rav_questions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.alunos 
    WHERE alunos.id = rav_questions.aluno_id 
    AND alunos.professor_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own questions" 
ON public.rav_questions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.alunos 
    WHERE alunos.id = rav_questions.aluno_id 
    AND alunos.professor_id = auth.uid()
  )
);

-- Policies para rav_answers
CREATE POLICY "Users can view their own answers" 
ON public.rav_answers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.alunos 
    WHERE alunos.id = rav_answers.aluno_id 
    AND alunos.professor_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own answers" 
ON public.rav_answers 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.alunos 
    WHERE alunos.id = rav_answers.aluno_id 
    AND alunos.professor_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own answers" 
ON public.rav_answers 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.alunos 
    WHERE alunos.id = rav_answers.aluno_id 
    AND alunos.professor_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own answers" 
ON public.rav_answers 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.alunos 
    WHERE alunos.id = rav_answers.aluno_id 
    AND alunos.professor_id = auth.uid()
  )
);