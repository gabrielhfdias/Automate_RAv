-- Create profiles table for teachers
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  matricula text UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create templates table
CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  arquivo_path text NOT NULL,
  bimestre text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors can manage their templates"
  ON public.templates FOR ALL
  USING (auth.uid() = professor_id);

-- Create alunos table
CREATE TABLE public.alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  professor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  bimestre text NOT NULL,
  arquivo_original_path text NOT NULL,
  arquivo_processado_path text,
  status text DEFAULT 'pendente' NOT NULL CHECK (status IN ('pendente', 'processando', 'concluido', 'erro', 'nome_nao_identificado')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors can manage their students"
  ON public.alunos FOR ALL
  USING (auth.uid() = professor_id);

-- Create configuracoes table
CREATE TABLE public.configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  matricula text NOT NULL,
  bimestre text NOT NULL,
  template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  prompt_tipo text DEFAULT 'fixo' NOT NULL CHECK (prompt_tipo IN ('dinamico', 'fixo')),
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors can manage their config"
  ON public.configuracoes FOR ALL
  USING (auth.uid() = professor_id);

-- Create logs table
CREATE TABLE public.logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE CASCADE NOT NULL,
  professor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL,
  mensagem text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors can view their logs"
  ON public.logs FOR SELECT
  USING (auth.uid() = professor_id);

CREATE POLICY "System can insert logs"
  ON public.logs FOR INSERT
  WITH CHECK (true);

-- Create avaliacoes table
CREATE TABLE public.avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE CASCADE NOT NULL,
  professor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  bimestre text NOT NULL,
  prompt_tipo text NOT NULL,
  respostas jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors can manage their evaluations"
  ON public.avaliacoes FOR ALL
  USING (auth.uid() = professor_id);

-- Trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alunos_updated_at
  BEFORE UPDATE ON public.alunos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at
  BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, matricula)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', 'Professor'),
    new.raw_user_meta_data->>'matricula'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', false);

INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-alunos', 'documentos-alunos', false);

INSERT INTO storage.buckets (id, name, public)
VALUES ('relatorios-processados', 'relatorios-processados', false);

-- Storage policies for templates
CREATE POLICY "Professors can upload their templates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'templates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Professors can view their templates"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'templates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Professors can delete their templates"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'templates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for student documents
CREATE POLICY "Professors can upload student documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documentos-alunos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Professors can view student documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documentos-alunos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for processed reports
CREATE POLICY "Professors can view processed reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'relatorios-processados' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "System can create processed reports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'relatorios-processados');