// Portal utilities for client lookup and data transformation
import { supabase } from '@/lib/supabase'
import type {
  Project,
  Task,
  Deliverable,
  RequirementDoc,
  ActivityLogEntry,
  Client
} from '@/lib/database.types'

// Slug configurations for known clients - maps URL slug to client identification
// In a production system, you'd add a 'slug' column to the clients/projects table
export const CLIENT_SLUG_MAP: Record<string, {
  projectName?: string      // Match by project name (partial match)
  clientName?: string       // Match by client_name on projects
  companyName?: string      // Match by company on clients table
  primaryColor: string
  accentColor: string
}> = {
  'scat-pack-clt': {
    projectName: 'Scat Pack',
    clientName: 'Ken',
    primaryColor: '#00F0FF',
    accentColor: '#BFFF00',
  },
  'prettypaidcloset': {
    projectName: 'Pretty Paid',
    clientName: 'Jazz',
    primaryColor: '#B76E79',
    accentColor: '#FF69B4',
  },
  'stitchwichs': {
    projectName: 'Stitchwichs',
    clientName: 'Nicole',
    primaryColor: '#8B5CF6',
    accentColor: '#F59E0B',
  },
}

export interface PortalProject {
  project: Project
  tasks: Task[]
  completion: number
  shiftHours: number
  traditionalEstimate: number
  phases: { name: string; status: 'completed' | 'active' | 'upcoming' }[]
  pendingApprovals: number
  pendingFeedback: number
  newDeliverables: number
  primaryColor: string
  accentColor: string
  discoveryRequired: boolean
}

// Derive project phases from task progress
function derivePhases(tasks: Task[], completion: number): { name: string; status: 'completed' | 'active' | 'upcoming' }[] {
  const hasActiveTasks = tasks.some(t => t.status === 'active' || t.status === 'review')
  const hasShippedTasks = tasks.some(t => t.status === 'shipped')
  const allBacklog = tasks.every(t => t.status === 'backlog')

  // Simple phase derivation based on completion
  if (completion === 0 && allBacklog) {
    return [
      { name: 'Discovery', status: 'active' as const },
      { name: 'Design', status: 'upcoming' as const },
      { name: 'Build', status: 'upcoming' as const },
      { name: 'Launch', status: 'upcoming' as const },
    ]
  } else if (completion < 25) {
    return [
      { name: 'Discovery', status: 'completed' as const },
      { name: 'Design', status: 'active' as const },
      { name: 'Build', status: 'upcoming' as const },
      { name: 'Launch', status: 'upcoming' as const },
    ]
  } else if (completion < 75) {
    return [
      { name: 'Discovery', status: 'completed' as const },
      { name: 'Design', status: 'completed' as const },
      { name: 'Build', status: 'active' as const },
      { name: 'Launch', status: 'upcoming' as const },
    ]
  } else if (completion < 100) {
    return [
      { name: 'Discovery', status: 'completed' as const },
      { name: 'Design', status: 'completed' as const },
      { name: 'Build', status: 'completed' as const },
      { name: 'Launch', status: 'active' as const },
    ]
  } else {
    return [
      { name: 'Discovery', status: 'completed' as const },
      { name: 'Design', status: 'completed' as const },
      { name: 'Build', status: 'completed' as const },
      { name: 'Launch', status: 'completed' as const },
    ]
  }
}

// Lookup project by client slug
export async function getProjectBySlug(slug: string): Promise<PortalProject | null> {
  if (!supabase) {
    console.error('Supabase client not initialized')
    return null
  }

  // Store in local variable for TypeScript narrowing
  const db = supabase

  const config = CLIENT_SLUG_MAP[slug]
  if (!config) {
    console.warn(`No config found for slug: ${slug}`)
    return null
  }

  try {
    // Find project by name pattern or client name
    let query = db.from('projects').select('*')

    if (config.projectName) {
      query = query.ilike('name', `%${config.projectName}%`)
    } else if (config.clientName) {
      query = query.ilike('client_name', `%${config.clientName}%`)
    }

    const { data: projects, error: projectError } = await query.limit(1) as {
      data: Project[] | null
      error: unknown
    }

    if (projectError || !projects || projects.length === 0) {
      console.warn(`No project found for slug: ${slug}`)
      return null
    }

    const project = projects[0]

    // Fetch tasks for this project
    const tasksResult = await db
      .from('tasks')
      .select('*')
      .eq('project_id', project.id)
      .order('order_index', { ascending: true })

    if (tasksResult.error) {
      console.error('Error fetching tasks:', tasksResult.error)
    }

    const projectTasks: Task[] = (tasksResult.data as Task[] | null) || []

    // Calculate metrics
    const shippedTasks = projectTasks.filter(t => t.status === 'shipped').length
    const completion = projectTasks.length > 0
      ? Math.round((shippedTasks / projectTasks.length) * 100)
      : 0
    const shiftHours = projectTasks.reduce((sum, t) => sum + (t.shift_hours || 0), 0)
    const traditionalEstimate = projectTasks.reduce((sum, t) => sum + (t.traditional_hours_estimate || 0), 0)

    // Count pending items
    const { data: pendingReqs } = await db
      .from('requirements_docs')
      .select('id')
      .eq('project_id', project.id)
      .eq('status', 'review')

    const { data: pendingDeliverables } = await db
      .from('deliverables')
      .select('id')
      .eq('project_id', project.id)
      .in('status', ['in_review', 'pending'])

    const { data: newDeliverables } = await db
      .from('deliverables')
      .select('id')
      .eq('project_id', project.id)
      .gte('uploaded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    // Determine if discovery is required (no tasks yet)
    const discoveryRequired = projectTasks.length === 0 && shiftHours === 0

    return {
      project,
      tasks: projectTasks,
      completion,
      shiftHours,
      traditionalEstimate,
      phases: derivePhases(projectTasks, completion),
      pendingApprovals: pendingReqs?.length || 0,
      pendingFeedback: pendingDeliverables?.length || 0,
      newDeliverables: newDeliverables?.length || 0,
      primaryColor: config.primaryColor,
      accentColor: config.accentColor,
      discoveryRequired,
    }
  } catch (error) {
    console.error('Error in getProjectBySlug:', error)
    return null
  }
}

// Fetch activity for a project
export async function getProjectActivity(projectId: string, limit: number = 20): Promise<ActivityLogEntry[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching activity:', error)
    return []
  }
}

// Fetch requirements for a project
export async function getProjectRequirements(projectId: string): Promise<RequirementDoc[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('requirements_docs')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching requirements:', error)
    return []
  }
}

// Fetch deliverables for a project
export async function getProjectDeliverables(projectId: string): Promise<Deliverable[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('deliverables')
      .select('*')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching deliverables:', error)
    return []
  }
}

// Sign off on a requirement
export async function signOffRequirement(
  docId: string,
  clientId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  if (!supabase) return false
  const db = supabase

  try {
    // Create signoff record
    const { error: signoffError } = await db
      .from('requirement_signoffs')
      .insert({
        doc_id: docId,
        client_id: clientId,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
      } as never)

    if (signoffError) throw signoffError

    // Update requirement status to approved
    const { error: updateError } = await db
      .from('requirements_docs')
      .update({ status: 'approved' } as never)
      .eq('id', docId)

    if (updateError) throw updateError

    return true
  } catch (error) {
    console.error('Error signing off requirement:', error)
    return false
  }
}

// Approve a deliverable
export async function approveDeliverable(
  deliverableId: string,
  approvedBy: string
): Promise<boolean> {
  if (!supabase) return false
  const db = supabase

  try {
    const { error } = await (db
      .from('deliverables') as ReturnType<typeof db.from>)
      .update({
        status: 'approved',
        client_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
      })
      .eq('id', deliverableId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error approving deliverable:', error)
    return false
  }
}

// Transform activity log entry to display format
export function transformActivityEntry(entry: ActivityLogEntry): {
  id: string
  type: 'task_created' | 'task_shipped' | 'deliverable_uploaded' | 'deliverable_approved' | 'requirement_created' | 'requirement_approved' | 'feedback_received' | 'milestone_reached' | 'project_update'
  title: string
  description?: string
  actor: string
  actorType: 'internal' | 'client' | 'system'
  timestamp: Date
  metadata?: Record<string, unknown>
} {
  const metadata = entry.metadata as Record<string, unknown> | null

  return {
    id: entry.id,
    type: entry.action as 'task_created' | 'task_shipped' | 'deliverable_uploaded' | 'deliverable_approved' | 'requirement_created' | 'requirement_approved' | 'feedback_received' | 'milestone_reached' | 'project_update',
    title: (metadata?.title as string) || `${entry.entity_type} ${entry.action}`,
    description: metadata?.description as string | undefined,
    actor: entry.actor,
    actorType: entry.actor_type,
    timestamp: new Date(entry.created_at),
    metadata: metadata || undefined,
  }
}
