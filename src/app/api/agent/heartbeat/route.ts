/**
 * POST /api/agent/heartbeat
 *
 * Send a heartbeat to keep agent status active.
 * Should be called periodically while agent is working.
 *
 * Request body:
 * - agent_id: string (required) - The agent's ID
 * - status: 'active' | 'idle' (optional) - Current status
 * - current_task_id: string (optional) - Task currently being worked on
 * - session_id: string (optional) - Current session ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { AgentStatus } from '@/lib/database.types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_STATUSES: AgentStatus[] = ['active', 'idle', 'offline']

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { agent_id, status, current_task_id, session_id } = body

    // Validate agent_id
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

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate current_task_id if provided
    if (current_task_id && !UUID_REGEX.test(current_task_id)) {
      return NextResponse.json(
        { error: 'Invalid current_task_id format' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Build update object
    const updateData: any = {
      last_heartbeat: now,
      updated_at: now
    }

    if (status) {
      updateData.status = status
    }

    if (current_task_id !== undefined) {
      updateData.current_task_id = current_task_id || null
    }

    if (session_id !== undefined) {
      updateData.session_id = session_id || null
    }

    // Update agent
    const { data: agent, error } = await (supabase
      .from('agents') as any)
      .update(updateData)
      .eq('id', agent_id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        )
      }
      console.error('Supabase error updating agent:', error)
      return NextResponse.json(
        { error: 'Failed to update agent' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Heartbeat received',
      data: {
        agent_id: agent.id,
        status: agent.status,
        current_task_id: agent.current_task_id,
        last_heartbeat: agent.last_heartbeat
      }
    })
  } catch (error) {
    console.error('Error processing heartbeat:', error)

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
