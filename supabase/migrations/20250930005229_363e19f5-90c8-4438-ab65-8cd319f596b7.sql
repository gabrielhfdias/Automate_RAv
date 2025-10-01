-- Corrigir o check constraint para aceitar 'multipla_escolha'
ALTER TABLE public.rav_questions DROP CONSTRAINT IF EXISTS rav_questions_tipo_check;

-- Adicionar o novo constraint com tipos corretos
ALTER TABLE public.rav_questions ADD CONSTRAINT rav_questions_tipo_check 
CHECK (tipo IN ('texto', 'opcoes', 'multipla_escolha'));

-- Expandir a tabela configuracoes com novos campos
ALTER TABLE public.configuracoes 
ADD COLUMN IF NOT EXISTS professor TEXT,
ADD COLUMN IF NOT EXISTS ano_letivo TEXT,
ADD COLUMN IF NOT EXISTS coordenacao_regional TEXT,
ADD COLUMN IF NOT EXISTS unidade_escolar TEXT,
ADD COLUMN IF NOT EXISTS bloco TEXT,
ADD COLUMN IF NOT EXISTS ano TEXT,
ADD COLUMN IF NOT EXISTS turma_config TEXT,
ADD COLUMN IF NOT EXISTS turno TEXT;