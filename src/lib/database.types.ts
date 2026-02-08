// L7 Shift Internal Platform - Database Types
// Auto-generated types for Supabase tables

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'cancelled'
export type TaskStatus = 'backlog' | 'active' | 'review' | 'shipped' | 'icebox'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskWorkType = 'human_only' | 'ai_suitable' | 'hybrid'
export type RequirementStatus = 'draft' | 'review' | 'approved' | 'implemented'
export type DeliverableStatus = 'pending' | 'uploaded' | 'in_review' | 'approved' | 'rejected'
export type LeadStatus = 'incoming' | 'qualified' | 'contacted' | 'converted' | 'disqualified'
export type LeadTier = 'SOFTBALL' | 'MEDIUM' | 'HARD' | 'DISQUALIFY'
export type LeadSource = 'website' | 'referral' | 'linkedin' | 'other'
export type AgentStatus = 'active' | 'idle' | 'offline'
export type TimeEntryType = 'work' | 'review' | 'blocked'

export interface Database {
  public: {
    Tables: {
      // Projects - Core project management
      projects: {
        Row: {
          id: string
          name: string
          client_id: string | null
          client_name: string
          description: string | null
          status: ProjectStatus
          budget_total: number | null
          budget_used: number | null
          start_date: string | null
          target_end_date: string | null
          actual_end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          client_id?: string | null
          client_name: string
          description?: string | null
          status?: ProjectStatus
          budget_total?: number | null
          budget_used?: number | null
          start_date?: string | null
          target_end_date?: string | null
          actual_end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          client_id?: string | null
          client_name?: string
          description?: string | null
          status?: ProjectStatus
          budget_total?: number | null
          budget_used?: number | null
          start_date?: string | null
          target_end_date?: string | null
          actual_end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // Tasks - Individual work items
      tasks: {
        Row: {
          id: string
          project_id: string
          sprint_id: string | null
          title: string
          description: string | null
          status: TaskStatus
          priority: TaskPriority
          work_type: TaskWorkType | null
          shift_hours: number
          traditional_hours_estimate: number
          assigned_to: string | null
          agent_id: string | null
          agent_claimed_at: string | null
          agent_notes: string | null
          files_modified: string[] | null
          requirements: Json | null
          acceptance_criteria: string[] | null
          created_at: string
          updated_at: string
          shipped_at: string | null
          order_index: number
        }
        Insert: {
          id?: string
          project_id: string
          sprint_id?: string | null
          title: string
          description?: string | null
          status?: TaskStatus
          priority?: TaskPriority
          work_type?: TaskWorkType | null
          shift_hours?: number
          traditional_hours_estimate?: number
          assigned_to?: string | null
          agent_id?: string | null
          agent_claimed_at?: string | null
          agent_notes?: string | null
          files_modified?: string[] | null
          requirements?: Json | null
          acceptance_criteria?: string[] | null
          created_at?: string
          updated_at?: string
          shipped_at?: string | null
          order_index?: number
        }
        Update: {
          id?: string
          project_id?: string
          sprint_id?: string | null
          title?: string
          description?: string | null
          status?: TaskStatus
          priority?: TaskPriority
          work_type?: TaskWorkType | null
          shift_hours?: number
          traditional_hours_estimate?: number
          assigned_to?: string | null
          agent_id?: string | null
          agent_claimed_at?: string | null
          agent_notes?: string | null
          files_modified?: string[] | null
          requirements?: Json | null
          acceptance_criteria?: string[] | null
          created_at?: string
          updated_at?: string
          shipped_at?: string | null
          order_index?: number
        }
      }

      // Sprints - Time-boxed work periods
      sprints: {
        Row: {
          id: string
          project_id: string
          name: string
          goals: string | null
          start_date: string
          end_date: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          goals?: string | null
          start_date: string
          end_date: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          goals?: string | null
          start_date?: string
          end_date?: string
          created_at?: string
        }
      }

      // Task Comments - Discussion on tasks
      task_comments: {
        Row: {
          id: string
          task_id: string
          author: string
          author_type: 'internal' | 'client'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          author: string
          author_type: 'internal' | 'client'
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          author?: string
          author_type?: 'internal' | 'client'
          content?: string
          created_at?: string
        }
      }

      // Client Portal Sessions
      client_portal_sessions: {
        Row: {
          id: string
          client_id: string
          project_id: string
          pin_hash: string | null
          magic_link_token: string | null
          magic_link_expires: string | null
          last_active: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          project_id: string
          pin_hash?: string | null
          magic_link_token?: string | null
          magic_link_expires?: string | null
          last_active?: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          project_id?: string
          pin_hash?: string | null
          magic_link_token?: string | null
          magic_link_expires?: string | null
          last_active?: string
          created_at?: string
        }
      }

      // Deliverables - Files and assets for client review
      deliverables: {
        Row: {
          id: string
          project_id: string
          task_id: string | null
          name: string
          description: string | null
          type: string
          url: string
          thumbnail_url: string | null
          status: DeliverableStatus
          version: number
          uploaded_at: string
          client_approved: boolean
          approved_at: string | null
          approved_by: string | null
        }
        Insert: {
          id?: string
          project_id: string
          task_id?: string | null
          name: string
          description?: string | null
          type: string
          url: string
          thumbnail_url?: string | null
          status?: DeliverableStatus
          version?: number
          uploaded_at?: string
          client_approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          task_id?: string | null
          name?: string
          description?: string | null
          type?: string
          url?: string
          thumbnail_url?: string | null
          status?: DeliverableStatus
          version?: number
          uploaded_at?: string
          client_approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
        }
      }

      // Client Feedback - Comments on deliverables
      client_feedback: {
        Row: {
          id: string
          deliverable_id: string
          client_id: string
          content: string
          created_at: string
          resolved: boolean
          resolved_at: string | null
        }
        Insert: {
          id?: string
          deliverable_id: string
          client_id: string
          content: string
          created_at?: string
          resolved?: boolean
          resolved_at?: string | null
        }
        Update: {
          id?: string
          deliverable_id?: string
          client_id?: string
          content?: string
          created_at?: string
          resolved?: boolean
          resolved_at?: string | null
        }
      }

      // Requirements Documents
      requirements_docs: {
        Row: {
          id: string
          project_id: string
          title: string
          content: string
          version: number
          status: RequirementStatus
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          content: string
          version?: number
          status?: RequirementStatus
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          content?: string
          version?: number
          status?: RequirementStatus
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }

      // Requirement Signoffs - Audit trail
      requirement_signoffs: {
        Row: {
          id: string
          doc_id: string
          client_id: string
          signed_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          doc_id: string
          client_id: string
          signed_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          doc_id?: string
          client_id?: string
          signed_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
      }

      // Requirement Comments
      requirement_comments: {
        Row: {
          id: string
          doc_id: string
          author_type: 'internal' | 'client'
          author_id: string
          content: string
          created_at: string
          resolved: boolean
        }
        Insert: {
          id?: string
          doc_id: string
          author_type: 'internal' | 'client'
          author_id: string
          content: string
          created_at?: string
          resolved?: boolean
        }
        Update: {
          id?: string
          doc_id?: string
          author_type?: 'internal' | 'client'
          author_id?: string
          content?: string
          created_at?: string
          resolved?: boolean
        }
      }

      // Clients - Client management
      clients: {
        Row: {
          id: string
          name: string
          company: string
          email: string
          phone: string | null
          status: 'active' | 'completed' | 'prospect' | 'churned'
          total_value: number
          joined_at: string
          last_active: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          company: string
          email: string
          phone?: string | null
          status?: 'active' | 'completed' | 'prospect' | 'churned'
          total_value?: number
          joined_at?: string
          last_active?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          company?: string
          email?: string
          phone?: string | null
          status?: 'active' | 'completed' | 'prospect' | 'churned'
          total_value?: number
          joined_at?: string
          last_active?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // Contact Submissions - Website contact form
      contact_submissions: {
        Row: {
          id: number
          created_at: string
          name: string
          email: string
          message: string
        }
        Insert: {
          id?: number
          created_at?: string
          name: string
          email: string
          message: string
        }
        Update: {
          id?: number
          created_at?: string
          name?: string
          email?: string
          message?: string
        }
      }

      // Leads - Lead pipeline management
      leads: {
        Row: {
          id: string
          name: string
          email: string
          company: string | null
          phone: string | null
          message: string | null
          status: LeadStatus
          tier: LeadTier | null
          source: LeadSource
          answers: Json | null
          ai_assessment: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          company?: string | null
          phone?: string | null
          message?: string | null
          status?: LeadStatus
          tier?: LeadTier | null
          source?: LeadSource
          answers?: Json | null
          ai_assessment?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          company?: string | null
          phone?: string | null
          message?: string | null
          status?: LeadStatus
          tier?: LeadTier | null
          source?: LeadSource
          answers?: Json | null
          ai_assessment?: Json | null
          created_at?: string
          updated_at?: string
        }
      }

      // Intake Tokens - Track intake form access tokens
      intake_tokens: {
        Row: {
          id: string
          lead_id: number | null
          token: string
          used: boolean
          used_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          lead_id?: number | null
          token: string
          used?: boolean
          used_at?: string | null
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: number | null
          token?: string
          used?: boolean
          used_at?: string | null
          expires_at?: string
          created_at?: string
        }
      }

      // Intake Submissions - Full questionnaire responses
      intake_submissions: {
        Row: {
          id: string
          lead_id: number | null
          token: string | null
          answers: Json
          submitted_at: string
          created_at: string
        }
        Insert: {
          id?: string
          lead_id?: number | null
          token?: string | null
          answers: Json
          submitted_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: number | null
          token?: string | null
          answers?: Json
          submitted_at?: string
          created_at?: string
        }
      }

      // Agents - Claude Code instances
      agents: {
        Row: {
          id: string
          name: string
          description: string | null
          status: AgentStatus
          capabilities: string[] | null
          current_task_id: string | null
          session_id: string | null
          last_heartbeat: string | null
          total_tasks_completed: number
          total_hours_logged: number
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: AgentStatus
          capabilities?: string[] | null
          current_task_id?: string | null
          session_id?: string | null
          last_heartbeat?: string | null
          total_tasks_completed?: number
          total_hours_logged?: number
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: AgentStatus
          capabilities?: string[] | null
          current_task_id?: string | null
          session_id?: string | null
          last_heartbeat?: string | null
          total_tasks_completed?: number
          total_hours_logged?: number
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }

      // Time Entries - Detailed time logging for tasks
      time_entries: {
        Row: {
          id: string
          task_id: string
          agent_id: string | null
          user_id: string | null
          entry_type: TimeEntryType
          started_at: string
          ended_at: string | null
          duration_minutes: number | null
          notes: string | null
          files_modified: string[] | null
          commit_hash: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          agent_id?: string | null
          user_id?: string | null
          entry_type?: TimeEntryType
          started_at?: string
          ended_at?: string | null
          duration_minutes?: number | null
          notes?: string | null
          files_modified?: string[] | null
          commit_hash?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          agent_id?: string | null
          user_id?: string | null
          entry_type?: TimeEntryType
          started_at?: string
          ended_at?: string | null
          duration_minutes?: number | null
          notes?: string | null
          files_modified?: string[] | null
          commit_hash?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }

      // Activity Log - Track all changes
      activity_log: {
        Row: {
          id: string
          project_id: string
          entity_type: string
          entity_id: string
          action: string
          actor: string
          actor_type: 'internal' | 'client' | 'system'
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          entity_type: string
          entity_id: string
          action: string
          actor: string
          actor_type: 'internal' | 'client' | 'system'
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          entity_type?: string
          entity_id?: string
          action?: string
          actor?: string
          actor_type?: 'internal' | 'client' | 'system'
          metadata?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      // Project metrics view
      project_metrics: {
        Row: {
          project_id: string
          total_tasks: number
          shipped_tasks: number
          active_tasks: number
          review_tasks: number
          backlog_tasks: number
          total_shift_hours: number
          total_traditional_estimate: number
          completion_percentage: number
        }
      }
    }
    Functions: {
      get_project_velocity: {
        Args: { p_project_id: string; days: number }
        Returns: { date: string; shipped_count: number }[]
      }
    }
  }
}

// User roles and permissions
export type UserRole = 'admin' | 'internal' | 'client'

// Convenience types
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export type Sprint = Database['public']['Tables']['sprints']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type ClientUpdate = Database['public']['Tables']['clients']['Update']
export type Deliverable = Database['public']['Tables']['deliverables']['Row']
export type RequirementDoc = Database['public']['Tables']['requirements_docs']['Row']
export type ActivityLogEntry = Database['public']['Tables']['activity_log']['Row']

export type Lead = Database['public']['Tables']['leads']['Row']
export type LeadInsert = Database['public']['Tables']['leads']['Insert']
export type LeadUpdate = Database['public']['Tables']['leads']['Update']

export type IntakeToken = Database['public']['Tables']['intake_tokens']['Row']
export type IntakeTokenInsert = Database['public']['Tables']['intake_tokens']['Insert']
export type IntakeTokenUpdate = Database['public']['Tables']['intake_tokens']['Update']

export type IntakeSubmission = Database['public']['Tables']['intake_submissions']['Row']
export type IntakeSubmissionInsert = Database['public']['Tables']['intake_submissions']['Insert']
export type IntakeSubmissionUpdate = Database['public']['Tables']['intake_submissions']['Update']

export type Agent = Database['public']['Tables']['agents']['Row']
export type AgentInsert = Database['public']['Tables']['agents']['Insert']
export type AgentUpdate = Database['public']['Tables']['agents']['Update']

export type TimeEntry = Database['public']['Tables']['time_entries']['Row']
export type TimeEntryInsert = Database['public']['Tables']['time_entries']['Insert']
export type TimeEntryUpdate = Database['public']['Tables']['time_entries']['Update']

// ShiftCards types
export type ShiftCardTier = 'basic' | 'pro' | 'custom'
export type ShiftCardAvatarType = 'initials' | 'photo'
export type ShiftCardEventType = 'view' | 'save' | 'click'

export interface ShiftCard {
  id: string
  user_id: string | null
  slug: string
  tier: ShiftCardTier
  theme: string
  name: string
  title: string | null
  company: string | null
  email: string | null
  phone: string | null
  website: string | null
  tagline: string | null
  bio: string | null
  avatar_type: ShiftCardAvatarType
  avatar_url: string | null
  socials: {
    linkedin?: string
    twitter?: string
    github?: string
    instagram?: string
  }
  custom_domain: string | null
  accent_color: string | null
  show_branding: boolean
  animations_enabled: boolean
  custom_css: string | null
  published: boolean
  created_at: string
  updated_at: string
}

export interface ShiftCardUser {
  id: string
  email: string
  password_hash: string | null
  tier: ShiftCardTier | null
  stripe_customer_id: string | null
  created_at: string
}

export interface ShiftCardAnalytics {
  id: string
  card_id: string
  event_type: ShiftCardEventType
  click_target: string | null
  referrer: string | null
  user_agent: string | null
  ip_hash: string | null
  created_at: string
}
