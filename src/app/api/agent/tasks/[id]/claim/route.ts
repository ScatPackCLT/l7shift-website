/**
 * POST /api/agent/tasks/[id]/claim
 *
 * Agent claims a task for work.
 * - Sets agent_id on the task
 * - Sets agent_claimed_at timestamp
 * - Updates task status to 'active'
 * - Creates initial time_entry record
 * - Updates agent's current_task_id
 *
 * Request body:
 * - agent_id: string (required) - The claiming agent's ID
 * - session_id?: string - Optional session identifier
 * - notes?: string - Optional notes about the claim
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params

    // Validate task ID format
    if (!UUID_REGEX.test(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const body = await request.json()

    // Validate required fields
    const { agent_id, session_id, notes } = body

    if (!agent_id || typeof agent_id !== 'string') {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(agent_id)) {
      return NextResponse.json(
        { error: 'Invalid agent_id format' },
        { status: 400 }
      )
    }

    // First, verify the task exists and is available
    const { data: existingTask, error: fetchError } = await (supabase
      .from('tasks') as any)
      .select('id, project_id, title, status, agent_id, work_type')
      .eq('id', taskId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }
      console.error('Supabase error fetching task:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch task' },
        { status: 500 }
      )
    }

    // Check if task is already claimed
    if (existingTask.agent_id) {
      return NextResponse.json(
        {
          error: 'Task already claimed by another agent',
          claimed_by: existingTask.agent_id
        },
        { status: 409 }
      )
    }

    // Check if task is in a claimable state
    if (existingTask.status === 'shipped' || existingTask.status === 'icebox') {
      return NextResponse.json(
        { error: `Task cannot be claimed - status is ${existingTask.status}` },
        { status: 400 }
      )
    }

    const claimedAt = new Date().toISOString()

    // Claim the task
    const { data: updatedTask, error: updateError } = await (supabase
      .from('tasks') as any)
      .update({
        agent_id,
        agent_claimed_at: claimedAt,
        agent_notes: notes || null,
        status: 'active',
        updated_at: claimedAt
      })
      .eq('id', taskId)
      .is('agent_id', null) // Double-check not claimed (race condition protection)
      .select()
      .single()

    if (updateError) {
      // If the update affected 0 rows, another agent claimed it
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task was claimed by another agent' },
          { status: 409 }
        )
      }
      console.error('Supabase error claiming task:', updateError)
      return NextResponse.json(
        { error: 'Failed to claim task' },
        { status: 500 }
      )
    }

    // Create initial time entry
    const { data: timeEntry, error: timeEntryError } = await (supabase
      .from('time_entries') as any)
      .insert({
        task_id: taskId,
        agent_id,
        entry_type: 'work',
        started_at: claimedAt,
        notes: notes ? `Claimed: ${notes}` : 'Task claimed',
        metadata: session_id ? { session_id } : null
      })
      .select()
      .single()

    if (timeEntryError) {
      console.error('Warning: Failed to create time entry:', timeEntryError)
      // Don't fail the request - task claim was successful
    }

    // Update agent's current task and heartbeat
    const { error: agentUpdateError } = await (supabase
      .from('agents') as any)
      .update({
        current_task_id: taskId,
        session_id: session_id || null,
        last_heartbeat: claimedAt,
        status: 'active',
        updated_at: claimedAt
      })
      .eq('id', agent_id)

    if (agentUpdateError) {
      console.error('Warning: Failed to update agent:', agentUpdateError)
      // Don't fail the request - task claim was successful
    }

    return NextResponse.json({
      success: true,
      message: 'Task claimed successfully',
      data: {
        task: updatedTask,
        time_entry_id: timeEntry?.id || null,
        claimed_at: claimedAt
      }
    })
  } catch (error) {
    console.error('Error claiming task:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
