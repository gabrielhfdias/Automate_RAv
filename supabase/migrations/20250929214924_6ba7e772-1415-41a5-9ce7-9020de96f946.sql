-- Add missing fields to alunos table
ALTER TABLE public.alunos 
ADD COLUMN IF NOT EXISTS turma text,
ADD COLUMN IF NOT EXISTS serie text,
ADD COLUMN IF NOT EXISTS is_tea boolean DEFAULT false;

-- Add RLS policy for deleting student records
DROP POLICY IF EXISTS "Professors can delete their students" ON public.alunos;
CREATE POLICY "Professors can delete their students" 
ON public.alunos 
FOR DELETE 
USING (auth.uid() = professor_id);