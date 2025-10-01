export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alunos: {
        Row: {
          arquivo_original_path: string
          arquivo_processado_path: string | null
          bimestre: string
          coluna_b_antiga: string | null
          coluna_b_gerada: string | null
          created_at: string
          evidencias_extraidas: string | null
          id: string
          is_tea: boolean | null
          nome: string
          professor_id: string
          prompt1_payload: Json | null
          prompt2_payload: Json | null
          serie: string | null
          status: string
          turma: string | null
          updated_at: string
        }
        Insert: {
          arquivo_original_path: string
          arquivo_processado_path?: string | null
          bimestre: string
          coluna_b_antiga?: string | null
          coluna_b_gerada?: string | null
          created_at?: string
          evidencias_extraidas?: string | null
          id?: string
          is_tea?: boolean | null
          nome: string
          professor_id: string
          prompt1_payload?: Json | null
          prompt2_payload?: Json | null
          serie?: string | null
          status?: string
          turma?: string | null
          updated_at?: string
        }
        Update: {
          arquivo_original_path?: string
          arquivo_processado_path?: string | null
          bimestre?: string
          coluna_b_antiga?: string | null
          coluna_b_gerada?: string | null
          created_at?: string
          evidencias_extraidas?: string | null
          id?: string
          is_tea?: boolean | null
          nome?: string
          professor_id?: string
          prompt1_payload?: Json | null
          prompt2_payload?: Json | null
          serie?: string | null
          status?: string
          turma?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alunos_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          aluno_id: string
          bimestre: string
          created_at: string
          id: string
          professor_id: string
          prompt_tipo: string
          respostas: Json
        }
        Insert: {
          aluno_id: string
          bimestre: string
          created_at?: string
          id?: string
          professor_id: string
          prompt_tipo: string
          respostas: Json
        }
        Update: {
          aluno_id?: string
          bimestre?: string
          created_at?: string
          id?: string
          professor_id?: string
          prompt_tipo?: string
          respostas?: Json
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          ano: string | null
          ano_letivo: string | null
          bimestre: string
          bloco: string | null
          coordenacao_regional: string | null
          id: string
          matricula: string
          professor: string | null
          professor_id: string
          prompt_tipo: string
          template_id: string | null
          turma_config: string | null
          turno: string | null
          unidade_escolar: string | null
          updated_at: string
        }
        Insert: {
          ano?: string | null
          ano_letivo?: string | null
          bimestre: string
          bloco?: string | null
          coordenacao_regional?: string | null
          id?: string
          matricula: string
          professor?: string | null
          professor_id: string
          prompt_tipo?: string
          template_id?: string | null
          turma_config?: string | null
          turno?: string | null
          unidade_escolar?: string | null
          updated_at?: string
        }
        Update: {
          ano?: string | null
          ano_letivo?: string | null
          bimestre?: string
          bloco?: string | null
          coordenacao_regional?: string | null
          id?: string
          matricula?: string
          professor?: string | null
          professor_id?: string
          prompt_tipo?: string
          template_id?: string | null
          turma_config?: string | null
          turno?: string | null
          unidade_escolar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          aluno_id: string
          created_at: string
          id: string
          mensagem: string
          professor_id: string
          status: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          id?: string
          mensagem: string
          professor_id: string
          status: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          id?: string
          mensagem?: string
          professor_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perguntas_fixas: {
        Row: {
          ativa: boolean
          created_at: string
          id: string
          opcoes: Json | null
          ordem: number
          pergunta: string
          professor_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          id?: string
          opcoes?: Json | null
          ordem?: number
          pergunta: string
          professor_id: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          id?: string
          opcoes?: Json | null
          ordem?: number
          pergunta?: string
          professor_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          matricula: string | null
          nome: string
        }
        Insert: {
          created_at?: string
          id: string
          matricula?: string | null
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          matricula?: string | null
          nome?: string
        }
        Relationships: []
      }
      rav_answers: {
        Row: {
          aluno_id: string
          created_at: string
          id: string
          observacao: string | null
          question_id: string
          resposta: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          id?: string
          observacao?: string | null
          question_id: string
          resposta: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          id?: string
          observacao?: string | null
          question_id?: string
          resposta?: string
        }
        Relationships: [
          {
            foreignKeyName: "rav_answers_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rav_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "rav_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      rav_questions: {
        Row: {
          aluno_id: string
          campo_id: string | null
          created_at: string
          id: string
          opcoes: Json | null
          ordem: number | null
          pergunta: string
          tipo: string | null
        }
        Insert: {
          aluno_id: string
          campo_id?: string | null
          created_at?: string
          id?: string
          opcoes?: Json | null
          ordem?: number | null
          pergunta: string
          tipo?: string | null
        }
        Update: {
          aluno_id?: string
          campo_id?: string | null
          created_at?: string
          id?: string
          opcoes?: Json | null
          ordem?: number | null
          pergunta?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rav_questions_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          arquivo_path: string
          bimestre: string
          created_at: string
          id: string
          nome: string
          professor_id: string
        }
        Insert: {
          arquivo_path: string
          bimestre: string
          created_at?: string
          id?: string
          nome: string
          professor_id: string
        }
        Update: {
          arquivo_path?: string
          bimestre?: string
          created_at?: string
          id?: string
          nome?: string
          professor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
