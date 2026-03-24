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
      assistant_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          messages: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          messages?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          messages?: Json
          user_id?: string | null
        }
        Relationships: []
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
      concepts: {
        Row: {
          description: string | null
          id: string
          importance: string | null
          name: string
          related_concept_names: string[] | null
          relationships: Json | null
          session_id: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          importance?: string | null
          name: string
          related_concept_names?: string[] | null
          relationships?: Json | null
          session_id?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          importance?: string | null
          name?: string
          related_concept_names?: string[] | null
          relationships?: Json | null
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
      curricula: {
        Row: {
          completed_at: string | null
          completed_concept_ids: string[] | null
          concept_count: number | null
          created_at: string | null
          current_concept_index: number | null
          deadline: string | null
          edit_count: number | null
          estimated_minutes: number | null
          id: string
          input_type: string | null
          last_activity_at: string | null
          original_units: Json
          outcomes: Json | null
          recommended_start_index: number | null
          schedule: Json | null
          scope_note: string | null
          skipped_concept_ids: string[] | null
          started_at: string | null
          status: string | null
          target_description: string | null
          title: string
          total_sparks_spent: number | null
          units: Json
          user_id: string | null
          user_input: string
        }
        Insert: {
          completed_at?: string | null
          completed_concept_ids?: string[] | null
          concept_count?: number | null
          created_at?: string | null
          current_concept_index?: number | null
          deadline?: string | null
          edit_count?: number | null
          estimated_minutes?: number | null
          id?: string
          input_type?: string | null
          last_activity_at?: string | null
          original_units: Json
          outcomes?: Json | null
          recommended_start_index?: number | null
          schedule?: Json | null
          scope_note?: string | null
          skipped_concept_ids?: string[] | null
          started_at?: string | null
          status?: string | null
          target_description?: string | null
          title: string
          total_sparks_spent?: number | null
          units: Json
          user_id?: string | null
          user_input: string
        }
        Update: {
          completed_at?: string | null
          completed_concept_ids?: string[] | null
          concept_count?: number | null
          created_at?: string | null
          current_concept_index?: number | null
          deadline?: string | null
          edit_count?: number | null
          estimated_minutes?: number | null
          id?: string
          input_type?: string | null
          last_activity_at?: string | null
          original_units?: Json
          outcomes?: Json | null
          recommended_start_index?: number | null
          schedule?: Json | null
          scope_note?: string | null
          skipped_concept_ids?: string[] | null
          started_at?: string | null
          status?: string | null
          target_description?: string | null
          title?: string
          total_sparks_spent?: number | null
          units?: Json
          user_id?: string | null
          user_input?: string
        }
        Relationships: [
          {
            foreignKeyName: "curricula_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_concept_progress: {
        Row: {
          completed_at: string | null
          concept_id: string | null
          concept_name: string | null
          curriculum_id: string | null
          flow_session_id: string | null
          id: string
          mastery_at_completion: string | null
          path_taken: string | null
          sparks_spent: number | null
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          concept_id?: string | null
          concept_name?: string | null
          curriculum_id?: string | null
          flow_session_id?: string | null
          id?: string
          mastery_at_completion?: string | null
          path_taken?: string | null
          sparks_spent?: number | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          concept_id?: string | null
          concept_name?: string | null
          curriculum_id?: string | null
          flow_session_id?: string | null
          id?: string
          mastery_at_completion?: string | null
          path_taken?: string | null
          sparks_spent?: number | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_concept_progress_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_concept_progress_flow_session_id_fkey"
            columns: ["flow_session_id"]
            isOneToOne: false
            referencedRelation: "flow_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_concept_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          key: string
          rollout_percentage: number | null
          rules: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          key: string
          rollout_percentage?: number | null
          rules?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          key?: string
          rollout_percentage?: number | null
          rules?: Json | null
          updated_at?: string | null
        }
        Relationships: []
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
      flashcard_challenge_attempts: {
        Row: {
          challenge_id: string | null
          completed_at: string | null
          display_name: string | null
          id: string
          score: number | null
          total: number | null
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          completed_at?: string | null
          display_name?: string | null
          id?: string
          score?: number | null
          total?: number | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          completed_at?: string | null
          display_name?: string | null
          id?: string
          score?: number | null
          total?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_challenge_attempts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "flashcard_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_challenges: {
        Row: {
          challenge_token: string | null
          challenger_score: number | null
          challenger_total: number | null
          challenger_user_id: string | null
          created_at: string | null
          deck_id: string | null
          expires_at: string | null
          id: string
        }
        Insert: {
          challenge_token?: string | null
          challenger_score?: number | null
          challenger_total?: number | null
          challenger_user_id?: string | null
          created_at?: string | null
          deck_id?: string | null
          expires_at?: string | null
          id?: string
        }
        Update: {
          challenge_token?: string | null
          challenger_score?: number | null
          challenger_total?: number | null
          challenger_user_id?: string | null
          created_at?: string | null
          deck_id?: string | null
          expires_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_challenges_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_decks: {
        Row: {
          cards_know_it: number | null
          cards_not_studied: number | null
          cards_still_learning: number | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          last_settings: Json | null
          last_studied_at: string | null
          share_token: string | null
          shared_by_user_id: string | null
          source_concept_ids: string[] | null
          source_session_id: string | null
          source_topic: string | null
          source_type: string | null
          title: string
          total_cards: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cards_know_it?: number | null
          cards_not_studied?: number | null
          cards_still_learning?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          last_settings?: Json | null
          last_studied_at?: string | null
          share_token?: string | null
          shared_by_user_id?: string | null
          source_concept_ids?: string[] | null
          source_session_id?: string | null
          source_topic?: string | null
          source_type?: string | null
          title: string
          total_cards?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cards_know_it?: number | null
          cards_not_studied?: number | null
          cards_still_learning?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          last_settings?: Json | null
          last_studied_at?: string | null
          share_token?: string | null
          shared_by_user_id?: string | null
          source_concept_ids?: string[] | null
          source_session_id?: string | null
          source_topic?: string | null
          source_type?: string | null
          title?: string
          total_cards?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_decks_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "reflection_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_sessions: {
        Row: {
          cards: Json
          cards_correct: number | null
          cards_needs_review: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          practice_session_id: string | null
          total_cards: number | null
          user_id: string
        }
        Insert: {
          cards: Json
          cards_correct?: number | null
          cards_needs_review?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          practice_session_id?: string | null
          total_cards?: number | null
          user_id: string
        }
        Update: {
          cards?: Json
          cards_correct?: number | null
          cards_needs_review?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          practice_session_id?: string | null
          total_cards?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_sessions_practice_session_id_fkey"
            columns: ["practice_session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_study_sessions: {
        Row: {
          cards_know_it: number | null
          cards_seen: number | null
          cards_still_learning: number | null
          cards_studied: string[] | null
          completed_at: string | null
          completion_percentage: number | null
          deck_id: string | null
          duration_seconds: number | null
          id: string
          mode: string | null
          settings_used: Json | null
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          cards_know_it?: number | null
          cards_seen?: number | null
          cards_still_learning?: number | null
          cards_studied?: string[] | null
          completed_at?: string | null
          completion_percentage?: number | null
          deck_id?: string | null
          duration_seconds?: number | null
          id?: string
          mode?: string | null
          settings_used?: Json | null
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          cards_know_it?: number | null
          cards_seen?: number | null
          cards_still_learning?: number | null
          cards_studied?: string[] | null
          completed_at?: string | null
          completion_percentage?: number | null
          deck_id?: string | null
          duration_seconds?: number | null
          id?: string
          mode?: string | null
          settings_used?: Json | null
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_study_sessions_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          card_type: string | null
          concept_id: string | null
          concept_tag: string | null
          created_at: string | null
          deck_id: string | null
          front: string
          id: string
          is_ai_generated: boolean | null
          is_edited: boolean | null
          is_starred: boolean | null
          last_seen_at: string | null
          original_back: string | null
          original_front: string | null
          position: number | null
          progress_state: string | null
          times_correct: number | null
          times_incorrect: number | null
          times_seen: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          back: string
          card_type?: string | null
          concept_id?: string | null
          concept_tag?: string | null
          created_at?: string | null
          deck_id?: string | null
          front: string
          id?: string
          is_ai_generated?: boolean | null
          is_edited?: boolean | null
          is_starred?: boolean | null
          last_seen_at?: string | null
          original_back?: string | null
          original_front?: string | null
          position?: number | null
          progress_state?: string | null
          times_correct?: number | null
          times_incorrect?: number | null
          times_seen?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          back?: string
          card_type?: string | null
          concept_id?: string | null
          concept_tag?: string | null
          created_at?: string | null
          deck_id?: string | null
          front?: string
          id?: string
          is_ai_generated?: boolean | null
          is_edited?: boolean | null
          is_starred?: boolean | null
          last_seen_at?: string | null
          original_back?: string | null
          original_front?: string | null
          position?: number | null
          progress_state?: string | null
          times_correct?: number | null
          times_incorrect?: number | null
          times_seen?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_concept_progress: {
        Row: {
          completed_at: string | null
          concept_id: string | null
          final_mastery_report: string | null
          flow_session_id: string | null
          id: string
          orchestrator_plan: Json | null
          redirected_away: boolean | null
          self_reported_vs_actual: string | null
          started_at: string | null
          status: string | null
          step_count: number | null
          strong_signals: number | null
          user_id: string | null
          weak_signals: number | null
        }
        Insert: {
          completed_at?: string | null
          concept_id?: string | null
          final_mastery_report?: string | null
          flow_session_id?: string | null
          id: string
          orchestrator_plan?: Json | null
          redirected_away?: boolean | null
          self_reported_vs_actual?: string | null
          started_at?: string | null
          status?: string | null
          step_count?: number | null
          strong_signals?: number | null
          user_id?: string | null
          weak_signals?: number | null
        }
        Update: {
          completed_at?: string | null
          concept_id?: string | null
          final_mastery_report?: string | null
          flow_session_id?: string | null
          id?: string
          orchestrator_plan?: Json | null
          redirected_away?: boolean | null
          self_reported_vs_actual?: string | null
          started_at?: string | null
          status?: string | null
          step_count?: number | null
          strong_signals?: number | null
          user_id?: string | null
          weak_signals?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_concept_progress_flow_session_id_fkey"
            columns: ["flow_session_id"]
            isOneToOne: false
            referencedRelation: "flow_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_sessions: {
        Row: {
          completed_at: string | null
          concepts_completed: string[] | null
          concepts_in_progress: string[] | null
          created_at: string | null
          current_concept_id: string | null
          curriculum_id: string | null
          id: string
          initial_plan: Json
          is_public: boolean | null
          last_activity_at: string | null
          learner_profile: Json | null
          reflection_session_id: string | null
          source_concept_id: string | null
          source_session_id: string | null
          source_type: string | null
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          concepts_completed?: string[] | null
          concepts_in_progress?: string[] | null
          created_at?: string | null
          current_concept_id?: string | null
          curriculum_id?: string | null
          id: string
          initial_plan?: Json
          is_public?: boolean | null
          last_activity_at?: string | null
          learner_profile?: Json | null
          reflection_session_id?: string | null
          source_concept_id?: string | null
          source_session_id?: string | null
          source_type?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          concepts_completed?: string[] | null
          concepts_in_progress?: string[] | null
          created_at?: string | null
          current_concept_id?: string | null
          curriculum_id?: string | null
          id?: string
          initial_plan?: Json
          is_public?: boolean | null
          last_activity_at?: string | null
          learner_profile?: Json | null
          reflection_session_id?: string | null
          source_concept_id?: string | null
          source_session_id?: string | null
          source_type?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_sessions_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_sessions_reflection_session_id_fkey"
            columns: ["reflection_session_id"]
            isOneToOne: false
            referencedRelation: "reflection_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_steps: {
        Row: {
          ai_reasoning: string | null
          concept_id: string | null
          content: Json
          created_at: string | null
          evaluation: Json | null
          flow_session_id: string | null
          id: string
          responded_at: string | null
          response_type: string | null
          step_number: number
          step_type: string
          user_id: string | null
          user_response: string | null
        }
        Insert: {
          ai_reasoning?: string | null
          concept_id?: string | null
          content?: Json
          created_at?: string | null
          evaluation?: Json | null
          flow_session_id?: string | null
          id: string
          responded_at?: string | null
          response_type?: string | null
          step_number: number
          step_type: string
          user_id?: string | null
          user_response?: string | null
        }
        Update: {
          ai_reasoning?: string | null
          concept_id?: string | null
          content?: Json
          created_at?: string | null
          evaluation?: Json | null
          flow_session_id?: string | null
          id?: string
          responded_at?: string | null
          response_type?: string | null
          step_number?: number
          step_type?: string
          user_id?: string | null
          user_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_steps_flow_session_id_fkey"
            columns: ["flow_session_id"]
            isOneToOne: false
            referencedRelation: "flow_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_nodes: {
        Row: {
          added_manually: boolean | null
          canonical_name: string
          category_id: string | null
          created_at: string | null
          current_mastery: string
          definition: string | null
          display_name: string
          first_seen_at: string | null
          hint_request_count: number | null
          id: string
          is_archived: boolean | null
          is_sub_concept: boolean | null
          last_seen_at: string | null
          mastery_history: Json
          parent_concept_id: string | null
          session_count: number | null
          session_ids: string[] | null
          skip_count: number | null
          synthesis: Json | null
          synthesis_generated_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          added_manually?: boolean | null
          canonical_name: string
          category_id?: string | null
          created_at?: string | null
          current_mastery?: string
          definition?: string | null
          display_name: string
          first_seen_at?: string | null
          hint_request_count?: number | null
          id: string
          is_archived?: boolean | null
          is_sub_concept?: boolean | null
          last_seen_at?: string | null
          mastery_history?: Json
          parent_concept_id?: string | null
          session_count?: number | null
          session_ids?: string[] | null
          skip_count?: number | null
          synthesis?: Json | null
          synthesis_generated_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          added_manually?: boolean | null
          canonical_name?: string
          category_id?: string | null
          created_at?: string | null
          current_mastery?: string
          definition?: string | null
          display_name?: string
          first_seen_at?: string | null
          hint_request_count?: number | null
          id?: string
          is_archived?: boolean | null
          is_sub_concept?: boolean | null
          last_seen_at?: string | null
          mastery_history?: Json
          parent_concept_id?: string | null
          session_count?: number | null
          session_ids?: string[] | null
          skip_count?: number | null
          synthesis?: Json | null
          synthesis_generated_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_nodes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vault_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_nodes_parent_concept_id_fkey"
            columns: ["parent_concept_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
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
      plan_limits: {
        Row: {
          ai_messages_limit: number | null
          curricula_limit: number | null
          deep_dives_limit: number | null
          flashcards_limit: number | null
          flow_sessions_limit: number | null
          plan: string
          quizzes_limit: number | null
          sessions_limit: number | null
          vault_concepts_limit: number | null
        }
        Insert: {
          ai_messages_limit?: number | null
          curricula_limit?: number | null
          deep_dives_limit?: number | null
          flashcards_limit?: number | null
          flow_sessions_limit?: number | null
          plan: string
          quizzes_limit?: number | null
          sessions_limit?: number | null
          vault_concepts_limit?: number | null
        }
        Update: {
          ai_messages_limit?: number | null
          curricula_limit?: number | null
          deep_dives_limit?: number | null
          flashcards_limit?: number | null
          flow_sessions_limit?: number | null
          plan?: string
          quizzes_limit?: number | null
          sessions_limit?: number | null
          vault_concepts_limit?: number | null
        }
        Relationships: []
      }
      practice_exports: {
        Row: {
          created_at: string | null
          export_type: string | null
          file_url: string | null
          id: string
          practice_session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          export_type?: string | null
          file_url?: string | null
          id?: string
          practice_session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          export_type?: string | null
          file_url?: string | null
          id?: string
          practice_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_exports_practice_session_id_fkey"
            columns: ["practice_session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_exports_user_id_fkey"
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
      practice_responses: {
        Row: {
          ai_feedback: string | null
          created_at: string | null
          difficulty_level: number | null
          evaluation_dimensions: Json | null
          id: string
          practice_session_id: string | null
          question_id: string | null
          question_number: number | null
          question_text: string | null
          question_type: string | null
          response_quality: string | null
          target_concept: string | null
          time_spent_seconds: number | null
          user_id: string
          user_response: string | null
        }
        Insert: {
          ai_feedback?: string | null
          created_at?: string | null
          difficulty_level?: number | null
          evaluation_dimensions?: Json | null
          id?: string
          practice_session_id?: string | null
          question_id?: string | null
          question_number?: number | null
          question_text?: string | null
          question_type?: string | null
          response_quality?: string | null
          target_concept?: string | null
          time_spent_seconds?: number | null
          user_id: string
          user_response?: string | null
        }
        Update: {
          ai_feedback?: string | null
          created_at?: string | null
          difficulty_level?: number | null
          evaluation_dimensions?: Json | null
          id?: string
          practice_session_id?: string | null
          question_id?: string | null
          question_number?: number | null
          question_text?: string | null
          question_type?: string | null
          response_quality?: string | null
          target_concept?: string | null
          time_spent_seconds?: number | null
          user_id?: string
          user_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_responses_practice_session_id_fkey"
            columns: ["practice_session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          concept_ids_updated: string[] | null
          difficulty: string | null
          exam_format: string | null
          generated_content: Json | null
          id: string
          overall_performance: string | null
          question_count: number | null
          results: Json | null
          source: string | null
          source_concept_ids: string[] | null
          source_session_id: string | null
          started_at: string | null
          status: string | null
          time_limit_minutes: number | null
          time_spent_seconds: number | null
          tokens_consumed: number | null
          tool: string
          topic: string | null
          topic_normalized: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          concept_ids_updated?: string[] | null
          difficulty?: string | null
          exam_format?: string | null
          generated_content?: Json | null
          id?: string
          overall_performance?: string | null
          question_count?: number | null
          results?: Json | null
          source?: string | null
          source_concept_ids?: string[] | null
          source_session_id?: string | null
          started_at?: string | null
          status?: string | null
          time_limit_minutes?: number | null
          time_spent_seconds?: number | null
          tokens_consumed?: number | null
          tool: string
          topic?: string | null
          topic_normalized?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          concept_ids_updated?: string[] | null
          difficulty?: string | null
          exam_format?: string | null
          generated_content?: Json | null
          id?: string
          overall_performance?: string | null
          question_count?: number | null
          results?: Json | null
          source?: string | null
          source_concept_ids?: string[] | null
          source_session_id?: string | null
          started_at?: string | null
          status?: string | null
          time_limit_minutes?: number | null
          time_spent_seconds?: number | null
          tokens_consumed?: number | null
          tool?: string
          topic?: string | null
          topic_normalized?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "reflection_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhook_events: {
        Row: {
          id: string
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          id?: string
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          id?: string
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string
          email_verification_sent_at: string | null
          email_verification_token: string | null
          email_verified: boolean | null
          guidance_answer_dismissed: boolean | null
          id: string
          learning_context: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          preferences: Json | null
          reminder_declined: boolean | null
          reminder_frequency: string | null
          stripe_customer_id: string | null
          subscription_tier: string | null
          user_type: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          email_verification_sent_at?: string | null
          email_verification_token?: string | null
          email_verified?: boolean | null
          guidance_answer_dismissed?: boolean | null
          id: string
          learning_context?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          preferences?: Json | null
          reminder_declined?: boolean | null
          reminder_frequency?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          user_type?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          email_verification_sent_at?: string | null
          email_verification_token?: string | null
          email_verified?: boolean | null
          guidance_answer_dismissed?: boolean | null
          id?: string
          learning_context?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          preferences?: Json | null
          reminder_declined?: boolean | null
          reminder_frequency?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      reflection_sessions: {
        Row: {
          completed_at: string | null
          content: string | null
          content_source: Json | null
          content_type: string
          created_at: string | null
          depth_score: number | null
          difficulty: string | null
          id: string
          is_public: boolean | null
          session_type: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content?: string | null
          content_source?: Json | null
          content_type: string
          created_at?: string | null
          depth_score?: number | null
          difficulty?: string | null
          id?: string
          is_public?: boolean | null
          session_type?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content?: string | null
          content_source?: Json | null
          content_type?: string
          created_at?: string | null
          depth_score?: number | null
          difficulty?: string | null
          id?: string
          is_public?: boolean | null
          session_type?: string | null
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
      review_schedule: {
        Row: {
          concept_id: string
          consecutive_successful_reviews: number | null
          created_at: string | null
          id: string
          is_mastered: boolean | null
          last_response_quality: string | null
          last_reviewed_at: string | null
          mastered_at: string | null
          next_review_date: string
          review_interval_days: number
          total_reviews: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          concept_id: string
          consecutive_successful_reviews?: number | null
          created_at?: string | null
          id?: string
          is_mastered?: boolean | null
          last_response_quality?: string | null
          last_reviewed_at?: string | null
          mastered_at?: string | null
          next_review_date: string
          review_interval_days: number
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          concept_id?: string
          consecutive_successful_reviews?: number | null
          created_at?: string | null
          id?: string
          is_mastered?: boolean | null
          last_response_quality?: string | null
          last_reviewed_at?: string | null
          mastered_at?: string | null
          next_review_date?: string
          review_interval_days?: number
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_schedule_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_schedule_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sets: {
        Row: {
          concept_ids: string[]
          created_at: string | null
          id: string
          last_studied_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          concept_ids?: string[]
          created_at?: string | null
          id?: string
          last_studied_at?: string | null
          name: string
          user_id: string
        }
        Update: {
          concept_ids?: string[]
          created_at?: string | null
          id?: string
          last_studied_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          pending_plan: string | null
          plan: string
          seats: number | null
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pending_plan?: string | null
          plan: string
          seats?: number | null
          status: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pending_plan?: string | null
          plan?: string
          seats?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      token_costs: {
        Row: {
          action: string
          description: string | null
          is_free: boolean | null
          token_cost: number
        }
        Insert: {
          action: string
          description?: string | null
          is_free?: boolean | null
          token_cost: number
        }
        Update: {
          action?: string
          description?: string | null
          is_free?: boolean | null
          token_cost?: number
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          action: string | null
          created_at: string | null
          id: string
          reference_id: string | null
          tokens_after: number
          tokens_before: number
          tokens_consumed: number
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: string
          reference_id?: string | null
          tokens_after: number
          tokens_before: number
          tokens_consumed: number
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string
          reference_id?: string | null
          tokens_after?: number
          tokens_before?: number
          tokens_consumed?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_action_fkey"
            columns: ["action"]
            isOneToOne: false
            referencedRelation: "token_costs"
            referencedColumns: ["action"]
          },
        ]
      }
      trigger_debug_logs: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
        }
        Relationships: []
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
      usage_tracking: {
        Row: {
          created_at: string | null
          id: string
          monthly_limit: number | null
          period_end: string
          period_start: string
          plan: string
          tokens_from_ai_messages: number | null
          tokens_from_deep_dives: number | null
          tokens_from_flashcards: number | null
          tokens_from_flow_mode: number | null
          tokens_from_learn_mode: number | null
          tokens_from_other: number | null
          tokens_from_practice: number | null
          tokens_from_sessions: number | null
          tokens_used: number | null
          updated_at: string | null
          user_id: string
          vault_concept_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          monthly_limit?: number | null
          period_end?: string
          period_start?: string
          plan?: string
          tokens_from_ai_messages?: number | null
          tokens_from_deep_dives?: number | null
          tokens_from_flashcards?: number | null
          tokens_from_flow_mode?: number | null
          tokens_from_learn_mode?: number | null
          tokens_from_other?: number | null
          tokens_from_practice?: number | null
          tokens_from_sessions?: number | null
          tokens_used?: number | null
          updated_at?: string | null
          user_id: string
          vault_concept_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          monthly_limit?: number | null
          period_end?: string
          period_start?: string
          plan?: string
          tokens_from_ai_messages?: number | null
          tokens_from_deep_dives?: number | null
          tokens_from_flashcards?: number | null
          tokens_from_flow_mode?: number | null
          tokens_from_learn_mode?: number | null
          tokens_from_other?: number | null
          tokens_from_practice?: number | null
          tokens_from_sessions?: number | null
          tokens_used?: number | null
          updated_at?: string | null
          user_id?: string
          vault_concept_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      user_feedback: {
        Row: {
          content: string
          created_at: string | null
          id: string
          screen_resolution: string | null
          type: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          screen_resolution?: string | null
          type: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          screen_resolution?: string | null
          type?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_collapsed: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_collapsed?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_collapsed?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_tokens: {
        Args: {
          p_action: string
          p_category: string
          p_reference_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      increment_card_stats: {
        Args: { p_card_id: string; p_is_correct: boolean }
        Returns: undefined
      }
      increment_usage: {
        Args: { amount?: number; feature_name: string; target_user_id: string }
        Returns: undefined
      }
      record_ai_message: {
        Args: {
          p_message_type: string
          p_token_count: number
          p_user_id: string
        }
        Returns: undefined
      }
      reset_expired_usage: { Args: never; Returns: undefined }
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
