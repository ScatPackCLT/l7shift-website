/**
 * /api/requirements/[id] - Single Requirement Document CRUD API
 *
 * GET   - Get a single requirement by ID
 * PATCH - Update requirement fields (title, content, status, etc.)
 * DELETE - Delete a requirement
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { RequirementStatus } from '@/lib/database.types'
import { sendApprovalNeededNotification } from '@/lib/email'

// Valid enum values for validation
const VALID_STATUSES: RequirementStatus[] = ['draft', 'review', 'approved', 'implemented']

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * GET /api/requirements/[id]
 * Get a single requirement by ID, including signoff status
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
        { error: 'Invalid requirement ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Get requirement document
    const { data: requirement, error: reqError } = await (supabase
      .from('requirements_docs') as ReturnType<typeof supabase.from>)
      .select('*')
      .eq('id', id)
      .single()

    if (reqError) {
      if (reqError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Requirement not found' },
          { status: 404 }
        )
      }

      console.error('Supabase error fetching requirement:', reqError)
      return NextResponse.json(
        { error: 'Failed to fetch requirement' },
        { status: 500 }
      )
    }

    // Get signoff information if any
    const { data: signoffs } = await (supabase
      .from('requirement_signoffs') as ReturnType<typeof supabase.from>)
      .select('*')
      .eq('doc_id', id)
      .order('signed_at', { ascending: false })

    return NextResponse.json({
      success: true,
      data: {
        ...requirement,
        signoffs: signoffs || [],
        signedOff: signoffs && signoffs.length > 0,
        signedAt: signoffs && signoffs.length > 0 ? signoffs[0].signed_at : null
      }
    })
  } catch (error) {
    console.error('Error fetching requirement:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/requirements/[id]
 * Update a requirement's fields
 *
 * Updatable fields: title, content, status, version
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
        { error: 'Invalid requirement ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const body = await request.json()

    // Build update object with validation
    const updateData: Record<string, unknown> = {}
    let hasUpdates = false

    // Validate and add title if provided
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length === 0) {
        return NextResponse.json(
          { error: 'Title must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.title = body.title.trim()
      hasUpdates = true
    }

    // Add content if provided
    if (body.content !== undefined) {
      if (typeof body.content !== 'string') {
        return NextResponse.json(
          { error: 'Content must be a string' },
          { status: 400 }
        )
      }
      updateData.content = body.content
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

    // Add version if provided
    if (body.version !== undefined) {
      if (typeof body.version !== 'number' || body.version < 1) {
        return NextResponse.json(
          { error: 'Version must be a positive number' },
          { status: 400 }
        )
      }
      updateData.version = body.version
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

    // Get current requirement status before update (for notification logic)
    const { data: currentRequirement } = await (supabase
      .from('requirements_docs') as ReturnType<typeof supabase.from>)
      .select('status, project_id, title')
      .eq('id', id)
      .single()

    const wasNotReview = currentRequirement?.status !== 'review'
    const isBeingSetToReview = body.status === 'review'

    // Perform the update
    const { data, error } = await (supabase
      .from('requirements_docs') as ReturnType<typeof supabase.from>)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Requirement not found' },
          { status: 404 }
        )
      }

      console.error('Supabase error updating requirement:', error)
      return NextResponse.json(
        { error: 'Failed to update requirement' },
        { status: 500 }
      )
    }

    // Send notification if requirement was just set to review status
    if (wasNotReview && isBeingSetToReview && data) {
      try {
        // Get project and client info
        const { data: projectData } = await (supabase
          .from('projects') as ReturnType<typeof supabase.from>)
          .select('name, client_id')
          .eq('id', data.project_id)
          .single()

        if (projectData?.client_id) {
          const { data: clientData } = await (supabase
            .from('clients') as ReturnType<typeof supabase.from>)
            .select('email, name')
            .eq('id', projectData.client_id)
            .single()

          if (clientData?.email) {
            // Extract phase from title if present (e.g., "Phase 1: Core Platform")
            const phaseMatch = data.title.match(/^(Phase \d+)/i)
            const phase = phaseMatch ? phaseMatch[1] : 'Requirements'

            await sendApprovalNeededNotification(clientData.email, {
              requirementId: id,
              requirementTitle: data.title,
              projectName: projectData.name || 'Your Project',
              phase: phase,
              summary: undefined, // Content is typically too long for email
              portalUrl: `https://l7shift.com/portal`,
            })
            console.log(`Approval needed notification sent to ${clientData.email}`)
          }
        }
      } catch (emailError) {
        console.error('Failed to send approval needed notification:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Requirement updated successfully',
      data
    })
  } catch (error) {
    console.error('Error updating requirement:', error)

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
 * DELETE /api/requirements/[id]
 * Delete a requirement document
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
        { error: 'Invalid requirement ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Delete the requirement
    const { error } = await (supabase
      .from('requirements_docs') as ReturnType<typeof supabase.from>)
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase error deleting requirement:', error)
      return NextResponse.json(
        { error: 'Failed to delete requirement' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Requirement deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting requirement:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
