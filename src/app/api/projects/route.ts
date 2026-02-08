/**
 * /api/projects - Project Management CRUD API
 *
 * GET  - List projects with optional filters (status, client_id)
 * POST - Create a new project
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ProjectInsert, ProjectStatus } from '@/lib/database.types'

// Valid enum values for validation
const VALID_STATUSES: ProjectStatus[] = ['active', 'completed', 'on_hold', 'cancelled']

/**
 * GET /api/projects
 * List all projects with optional filtering
 *
 * Query params:
 * - status: Filter by project status
 * - client_id: Filter by client ID
 * - limit: Number of results (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const status = searchParams.get('status') as ProjectStatus | null
    const client_id = searchParams.get('client_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate status filter if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Build query
    // Note: Using 'as any' until database types are regenerated from Supabase
    let query = (supabase
      .from('projects') as any)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (client_id) {
      query = query.eq('client_id', client_id)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error fetching projects:', error)
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
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
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects
 * Create a new project
 *
 * Required fields: name, client_name
 * Optional fields: client_id, description, status, budget_total, start_date, target_end_date
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    // Validate required fields
    const { name, client_name, client_id, description, status, budget_total, start_date, target_end_date } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!client_name || typeof client_name !== 'string' || client_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Client name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate status if provided
    const projectStatus: ProjectStatus = status && VALID_STATUSES.includes(status) ? status : 'active'

    // Validate budget_total if provided
    if (budget_total !== undefined && budget_total !== null) {
      if (typeof budget_total !== 'number' || budget_total < 0) {
        return NextResponse.json(
          { error: 'Budget total must be a positive number' },
          { status: 400 }
        )
      }
    }

    // Validate dates if provided
    if (start_date && isNaN(Date.parse(start_date))) {
      return NextResponse.json(
        { error: 'Invalid start_date format' },
        { status: 400 }
      )
    }

    if (target_end_date && isNaN(Date.parse(target_end_date))) {
      return NextResponse.json(
        { error: 'Invalid target_end_date format' },
        { status: 400 }
      )
    }

    // Prepare project data
    const projectData: ProjectInsert = {
      name: name.trim(),
      client_name: client_name.trim(),
      client_id: client_id || null,
      description: description?.trim() || null,
      status: projectStatus,
      budget_total: budget_total || null,
      budget_used: 0,
      start_date: start_date || null,
      target_end_date: target_end_date || null
    }

    // Insert project
    // Note: Using 'as any' until database types are regenerated from Supabase
    const { data, error } = await (supabase
      .from('projects') as any)
      .insert(projectData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating project:', error)
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Project created successfully',
        data
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating project:', error)

    // Handle JSON parsing errors
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
