export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {

  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          depth_score: number | null
          focus_suggestions: string[] | null
          id: string
          insights: Json | null
          session_id: string | null
          strength_map: Json | null
        }
        Insert: {
          depth_score?: number | null
          focus_suggestions?: string[] | null
          id?: string
          insights?: Json | null
          session_id?: string | null
          strength_map?: Json | null
        }
        Update: {
          depth_score?: number | null
          focus_suggestions?: string[] | null
          id?: string
          insights?: Json | null
          session_id?: string | null
          strength_map?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "analyses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "reflection_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          id: string
          related_concept_ids: string[] | null
          session_id: string | null
          text: string
          type: string
        }
        Insert: {
          id?: string
          related_concept_ids?: string[] | null
          session_id?: string | null
          text: string
          type: string
        }
        Update: {
          id?: string
          related_concept_ids?: string[] | null
          session_id?: string | null
          text?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reflection_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_explanations: {
        Row: {
          concept_id: string | null
          concept_name: string | null
          content: string
          first_viewed_at: string | null
          generated_at: string | null
          id: string
          last_viewed_at: string | null
          responded_at: string | null
          session_id: string | null
          user_id: string | null
          user_response: string | null
          view_count: number | null
        }
        Insert: {
          concept_id?: string | null
          concept_name?: string | null
          content: string
          first_viewed_at?: string | null
          generated_at?: string | null
          id?: string
          last_viewed_at?: string | null
          responded_at?: string | null
          session_id?: string | null
          user_id?: string | null
          user_response?: string | null
          view_count?: number | null
        }
        Update: {
          concept_id?: string | null
          concept_name?: string | null
          content?: string
          first_viewed_at?: string | null
          generated_at?: string | null
          id?: string
          last_viewed_at?: string | null
          responded_at?: string | null
          session_id?: string | null
          user_id?: string | null
          user_response?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "concept_explanations_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_explanations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reflection_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_explanations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_topics: {
        Row: {
          concept_count: number | null
          created_at: string | null
          dominant_mastery: string | null
          id: string
          last_updated_at: string | null
          name: string
          user_id: string | null
        }
        Insert: {
          concept_count?: number | null
          created_at?: string | null
          dominant_mastery?: string | null
          id?: string
          last_updated_at?: string | null
          name: string
          user_id?: string | null
        }
        Update: {
          concept_count?: number | null
          created_at?: string | null
          dominant_mastery?: string | null
          id?: string
          last_updated_at?: string | null
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concept_topics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          description: string | null
          id: string
          importance: string | null
          name: string
          related_concept_names: string[] | null
          session_id: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          importance?: string | null
          name: string
          related_concept_names?: string[] | null
          session_id?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          importance?: string | null
          name?: string
          related_concept_names?: string[] | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concepts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reflection_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      deep_dive_lessons: {
        Row: {
          confirmatory_answer: string | null
          confirmatory_assessment: string | null
          confirmatory_question: string | null
          content: Json
          generated_at: string | null
          generation_count: number | null
          id: string
          read_at: string | null
          regenerated_at: string | null
          session_id: string | null
          target_concept_id: string | null
          target_concept_name: string | null
          user_id: string | null
        }
        Insert: {
          confirmatory_answer?: string | null
          confirmatory_assessment?: string | null
          confirmatory_question?: string | null
          content: Json
          generated_at?: string | null
          generation_count?: number | null
          id?: string
          read_at?: string | null
          regenerated_at?: string | null
          session_id?: string | null
          target_concept_id?: string | null
          target_concept_name?: string | null
          user_id?: string | null
        }
        Update: {
          confirmatory_answer?: string | null
          confirmatory_assessment?: string | null
          confirmatory_question?: string | null
          content?: Json
          generated_at?: string | null
          generation_count?: number | null
          id?: string
          read_at?: string | null
          regenerated_at?: string | null
          session_id?: string | null
          target_concept_id?: string | null
          target_concept_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deep_dive_lessons_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "reflection_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deep_dive_lessons_target_concept_id_fkey"
            columns: ["target_concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deep_dive_lessons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feynman_attempts: {
        Row: {
          attempt_number: number | null
          feedback: Json
          id: string
          session_id: string | null
          spark_cost: number | null
          submitted_at: string | null
          target_concept_id: string | null
          target_concept_name: string | null
          user_explanation: string
          user_id: string | null
        }
        Insert: {
          attempt_number?: number | null
          feedback: Json
          id?: string
          session_id?: string | null
          spark_cost?: number | null
          submitted_at?: string | null
          target_concept_id?: string | null
          target_concept_name?: string | null
          user_explanation: string
          user_id?: string | null
        }
        Update: {
          attempt_number?: number | null
          feedback?: Json
          id?: string
          session_id?: string | null
          spark_cost?: number | null
          submitted_at?: string | null
          target_concept_id?: string | null
          target_concept_name?: string | null
          user_explanation?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feynman_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reflection_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feynman_attempts_target_concept_id_fkey"
            columns: ["target_concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feynman_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_decks: {
        Row: {
          card_count: number | null
          cards: Json
          generated_at: string | null
          generation_count: number | null
          id: string
          progress: Json
          regenerated_at: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          card_count?: number | null
          cards: Json
          generated_at?: string | null
          generation_count?: number | null
          id?: string
          progress?: Json
          regenerated_at?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          card_count?: number | null
          cards?: Json
          generated_at?: string | null
          generation_count?: number | null
          id?: string
          progress?: Json
          regenerated_at?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_decks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "reflection_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_decks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_nodes: {
        Row: {
          canonical_name: string
          created_at: string | null
          current_mastery: string
          definition: string | null
          display_name: string
          first_seen_at: string | null
          hint_request_count: number | null
          id: string
          last_seen_at: string | null
          mastery_history: Json
          session_count: number | null
          session_ids: string[] | null
          skip_count: number | null
          synthesis: Json | null
          synthesis_generated_at: string | null
          topic_id: string | null
          topic_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          canonical_name: string
          created_at?: string | null
          current_mastery?: string
          definition?: string | null
          display_name: string
          first_seen_at?: string | null
          hint_request_count?: number | null
          id?: string
          last_seen_at?: string | null
          mastery_history?: Json
          session_count?: number | null
          session_ids?: string[] | null
          skip_count?: number | null
          synthesis?: Json | null
          synthesis_generated_at?: string | null
          topic_id?: string | null
          topic_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          canonical_name?: string
          created_at?: string | null
          current_mastery?: string
          definition?: string | null
          display_name?: string
          first_seen_at?: string | null
          hint_request_count?: number | null
          id?: string
          last_seen_at?: string | null
          mastery_history?: Json
          session_count?: number | null
          session_ids?: string[] | null
          skip_count?: number | null
          synthesis?: Json | null
          synthesis_generated_at?: string | null
          topic_id?: string | null
          topic_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_nodes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "concept_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_nodes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_quizzes: {
        Row: {
          attempts: Json
          generated_at: string | null
          generation_count: number | null
          id: string
          question_count: number | null
          questions: Json
          regenerated_at: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: Json
          generated_at?: string | null
          generation_count?: number | null
          id?: string
          question_count?: number | null
          questions: Json
          regenerated_at?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: Json
          generated_at?: string | null
          generation_count?: number | null
          id?: string
          question_count?: number | null
          questions?: Json
          regenerated_at?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_quizzes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "reflection_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_quizzes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          onboarding_completed: boolean | null
          preferences: Json | null
          subscription_tier: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id: string
          onboarding_completed?: boolean | null
          preferences?: Json | null
          subscription_tier?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          onboarding_completed?: boolean | null
          preferences?: Json | null
          subscription_tier?: string | null
        }
        Relationships: []
      }
      reflection_sessions: {
        Row: {
          content: string | null
          content_type: string
          created_at: string | null
          depth_score: number | null
          difficulty: string | null
          id: string
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          content?: string | null
          content_type: string
          created_at?: string | null
          depth_score?: number | null
          difficulty?: string | null
          id?: string
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          content?: string | null
          content_type?: string
          created_at?: string | null
          depth_score?: number | null
          difficulty?: string | null
          id?: string
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflection_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_conversations: {
        Row: {
          closing_analysis: Json | null
          id: string
          last_message_at: string | null
          message_count: number | null
          messages: Json
          session_id: string | null
          spark_cost: number | null
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          closing_analysis?: Json | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          messages?: Json
          session_id?: string | null
          spark_cost?: number | null
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          closing_analysis?: Json | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          messages?: Json
          session_id?: string | null
          spark_cost?: number | null
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutor_conversations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "reflection_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_answers: {
        Row: {
          answer: string | null
          confidence: string | null
          id: string
          question_id: string | null
          session_id: string | null
        }
        Insert: {
          answer?: string | null
          confidence?: string | null
          id?: string
          question_id?: string | null
          session_id?: string | null
        }
        Update: {
          answer?: string | null
          confidence?: string | null
          id?: string
          question_id?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "reflection_sessions"
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
