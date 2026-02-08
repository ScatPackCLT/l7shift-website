/**
 * /api/projects/[id] - Single Project CRUD API
 *
 * GET    - Get a single project by ID
 * PATCH  - Update project fields
 * DELETE - Delete a project
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ProjectUpdate, ProjectStatus } from '@/lib/database.types'

// Valid enum values for validation
const VALID_STATUSES: ProjectStatus[] = ['active', 'completed', 'on_hold', 'cancelled']

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * GET /api/projects/[id]
 * Get a single project by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Note: Using 'as any' until database types are regenerated from Supabase
    const { data, error } = await (supabase
      .from('projects') as any)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }

      console.error('Supabase error fetching project:', error)
      return NextResponse.json(
        { error: 'Failed to fetch project' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/projects/[id]
 * Update a project's fields
 *
 * Updatable fields: name, client_name, client_id, description, status, budget_total, budget_used, start_date, target_end_date, actual_end_date
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const body = await request.json()

    // Build update object with validation
    const updateData: ProjectUpdate = {}
    let hasUpdates = false

    // Validate and add name if provided
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Name must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.name = body.name.trim()
      hasUpdates = true
    }

    // Validate and add client_name if provided
    if (body.client_name !== undefined) {
      if (typeof body.client_name !== 'string' || body.client_name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Client name must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.client_name = body.client_name.trim()
      hasUpdates = true
    }

    // Add client_id if provided
    if (body.client_id !== undefined) {
      updateData.client_id = body.client_id || null
      hasUpdates = true
    }

    // Add description if provided
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
      hasUpdates = true
    }

    // Validate and add status if provided
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.status = body.status
      hasUpdates = true
    }

    // Validate budget fields
    if (body.budget_total !== undefined) {
      if (body.budget_total !== null && (typeof body.budget_total !== 'number' || body.budget_total < 0)) {
        return NextResponse.json(
          { error: 'Budget total must be a positive number or null' },
          { status: 400 }
        )
      }
      updateData.budget_total = body.budget_total
      hasUpdates = true
    }

    if (body.budget_used !== undefined) {
      if (body.budget_used !== null && (typeof body.budget_used !== 'number' || body.budget_used < 0)) {
        return NextResponse.json(
          { error: 'Budget used must be a positive number or null' },
          { status: 400 }
        )
      }
      updateData.budget_used = body.budget_used
      hasUpdates = true
    }

    // Validate date fields
    if (body.start_date !== undefined) {
      if (body.start_date !== null && isNaN(Date.parse(body.start_date))) {
        return NextResponse.json(
          { error: 'Invalid start_date format' },
          { status: 400 }
        )
      }
      updateData.start_date = body.start_date
      hasUpdates = true
    }

    if (body.target_end_date !== undefined) {
      if (body.target_end_date !== null && isNaN(Date.parse(body.target_end_date))) {
        return NextResponse.json(
          { error: 'Invalid target_end_date format' },
          { status: 400 }
        )
      }
      updateData.target_end_date = body.target_end_date
      hasUpdates = true
    }

    if (body.actual_end_date !== undefined) {
      if (body.actual_end_date !== null && isNaN(Date.parse(body.actual_end_date))) {
        return NextResponse.json(
          { error: 'Invalid actual_end_date format' },
          { status: 400 }
        )
      }
      updateData.actual_end_date = body.actual_end_date
      hasUpdates = true
    }

    // Ensure at least one field is being updated
    if (!hasUpdates) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    // Perform the update
    // Note: Using 'as any' until database types are regenerated from Supabase
    const { data, error } = await (supabase
      .from('projects') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }

      console.error('Supabase error updating project:', error)
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Project updated successfully',
      data
    })
  } catch (error) {
    console.error('Error updating project:', error)

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

/**
 * DELETE /api/projects/[id]
 * Delete a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Check if project exists first
    // Note: Using 'as any' until database types are regenerated from Supabase
    const { data: existingProject, error: fetchError } = await (supabase
      .from('projects') as any)
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }
      console.error('Supabase error checking project:', fetchError)
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      )
    }

    // Delete the project
    // Note: Using 'as any' until database types are regenerated from Supabase
    const { error: deleteError } = await (supabase
      .from('projects') as any)
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Supabase error deleting project:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
