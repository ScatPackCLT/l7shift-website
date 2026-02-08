/**
 * /api/deliverables - Deliverable Management API
 *
 * GET  - List deliverables with optional filters
 * POST - Create a new deliverable (triggers notification to client)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendDeliverableReadyNotification } from '@/lib/email'
import type { DeliverableStatus } from '@/lib/database.types'

// Valid status values
const VALID_STATUSES: DeliverableStatus[] = ['pending', 'uploaded', 'in_review', 'approved', 'rejected']

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * GET /api/deliverables
 * List all deliverables with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    const project_id = searchParams.get('project_id')
    const status = searchParams.get('status') as DeliverableStatus | null
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate project_id format if provided
    if (project_id && !UUID_REGEX.test(project_id)) {
      return NextResponse.json(
        { error: 'Invalid project_id format' },
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

    let query = (supabase
      .from('deliverables') as any)
      .select('*', { count: 'exact' })
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (project_id) {
      query = query.eq('project_id', project_id)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error fetching deliverables:', error)
      return NextResponse.json(
        { error: 'Failed to fetch deliverables' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false
      }
    })
  } catch (error) {
    console.error('Error fetching deliverables:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/deliverables
 * Create a new deliverable and notify client
 *
 * Required fields: project_id, name, type, url
 * Optional fields: description, task_id, thumbnail_url, status, version
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const {
      project_id,
      task_id,
      name,
      description,
      type,
      url,
      thumbnail_url,
      status,
      version,
      notify_client = true, // Option to skip notification
    } = body

    // Validate required fields
    if (!project_id || !UUID_REGEX.test(project_id)) {
      return NextResponse.json(
        { error: 'Valid project_id is required' },
        { status: 400 }
      )
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { error: 'Type is required (e.g., design, document, prototype, code)' },
        { status: 400 }
      )
    }

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate optional fields
    if (task_id && !UUID_REGEX.test(task_id)) {
      return NextResponse.json(
        { error: 'Invalid task_id format' },
        { status: 400 }
      )
    }

    const deliverableStatus: DeliverableStatus = status && VALID_STATUSES.includes(status) ? status : 'uploaded'

    // Prepare deliverable data
    const deliverableData = {
      project_id,
      task_id: task_id || null,
      name: name.trim(),
      description: description?.trim() || null,
      type: type.trim(),
      url,
      thumbnail_url: thumbnail_url || null,
      status: deliverableStatus,
      version: version || 1,
      uploaded_at: new Date().toISOString(),
      client_approved: false,
    }

    // Insert deliverable
    const { data, error } = await (supabase
      .from('deliverables') as any)
      .insert(deliverableData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating deliverable:', error)

      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Project or task not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create deliverable' },
        { status: 500 }
      )
    }

    // Send notification to client if requested
    if (notify_client && data) {
      try {
        // Get project and client info
        const { data: projectData } = await (supabase
          .from('projects') as any)
          .select('name, client_id')
          .eq('id', project_id)
          .single()

        if (projectData?.client_id) {
          const { data: clientData } = await (supabase
            .from('clients') as any)
            .select('email, name')
            .eq('id', projectData.client_id)
            .single()

          if (clientData?.email) {
            await sendDeliverableReadyNotification(clientData.email, {
              deliverableId: data.id,
              deliverableName: data.name,
              projectName: projectData.name || 'Your Project',
              type: data.type,
              description: data.description || undefined,
              version: data.version,
              portalUrl: `https://l7shift.com/portal`,
            })
            console.log(`Deliverable notification sent to ${clientData.email}`)
          }
        }
      } catch (emailError) {
        console.error('Failed to send deliverable notification:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Deliverable created successfully',
        data
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating deliverable:', error)

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
