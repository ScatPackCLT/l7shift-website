/**
 * POST /api/agent/register
 *
 * Register a new Claude Code agent instance.
 * Returns agent_id to use in subsequent API calls.
 *
 * Request body:
 * - name: string (required) - Agent name/identifier
 * - description: string (optional) - What this agent specializes in
 * - capabilities: string[] (optional) - List of capabilities
 * - session_id: string (optional) - Claude session ID
 * - metadata: object (optional) - Additional agent metadata
 *
 * GET /api/agent/register
 *
 * List all registered agents.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { name, description, capabilities, session_id, metadata } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate capabilities if provided
    if (capabilities !== undefined && !Array.isArray(capabilities)) {
      return NextResponse.json(
        { error: 'capabilities must be an array of strings' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Create agent record
    const { data: agent, error } = await (supabase
      .from('agents') as any)
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        status: 'idle',
        capabilities: capabilities || null,
        session_id: session_id || null,
        last_heartbeat: now,
        total_tasks_completed: 0,
        total_hours_logged: 0,
        metadata: metadata || null
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating agent:', error)
      return NextResponse.json(
        { error: 'Failed to register agent' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Agent registered successfully',
      data: {
        agent_id: agent.id,
        agent
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error registering agent:', error)

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

export async function GET() {
  try {
    const supabase = createServerClient()

    const { data: agents, error } = await (supabase
      .from('agents') as any)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error fetching agents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: agents || []
    })
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
