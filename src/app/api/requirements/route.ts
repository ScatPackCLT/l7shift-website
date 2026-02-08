/**
 * /api/requirements - Requirements Document CRUD API
 *
 * GET  - List requirements with optional filters (project_id, status)
 * POST - Create a new requirement document
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { RequirementStatus } from '@/lib/database.types'

// Valid enum values for validation
const VALID_STATUSES: RequirementStatus[] = ['draft', 'review', 'approved', 'implemented']

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * GET /api/requirements
 * List all requirements with optional filtering
 *
 * Query params:
 * - project_id: Filter by project (required for security)
 * - status: Filter by requirement status
 * - limit: Number of results (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status') as RequirementStatus | null
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate project_id format if provided
    if (projectId && !UUID_REGEX.test(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project_id format' },
        { status: 400 }
      )
    }

    // Validate status filter if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Build query
    let query = (supabase
      .from('requirements_docs') as ReturnType<typeof supabase.from>)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error fetching requirements:', error)
      return NextResponse.json(
        { error: 'Failed to fetch requirements' },
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
    console.error('Error fetching requirements:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/requirements
 * Create a new requirement document
 *
 * Required fields: project_id, title, content, created_by
 * Optional fields: status, version
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    // Validate required fields
    const { project_id, title, content, created_by, status, version } = body

    if (!project_id || !UUID_REGEX.test(project_id)) {
      return NextResponse.json(
        { error: 'Valid project_id is required' },
        { status: 400 }
      )
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (!created_by || typeof created_by !== 'string') {
      return NextResponse.json(
        { error: 'created_by is required' },
        { status: 400 }
      )
    }

    // Validate status if provided
    const docStatus: RequirementStatus = status && VALID_STATUSES.includes(status) ? status : 'draft'

    // Prepare requirement data
    const requirementData = {
      project_id,
      title: title.trim(),
      content,
      created_by,
      status: docStatus,
      version: version || 1,
    }

    // Insert requirement
    const { data, error } = await (supabase
      .from('requirements_docs') as ReturnType<typeof supabase.from>)
      .insert(requirementData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating requirement:', error)
      return NextResponse.json(
        { error: 'Failed to create requirement' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Requirement created successfully',
        data
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating requirement:', error)

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
