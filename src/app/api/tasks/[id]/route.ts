/**
 * /api/tasks/[id] - Single Task CRUD API
 *
 * GET    - Get a single task by ID
 * PATCH  - Update task fields
 * DELETE - Delete a task
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { TaskUpdate, TaskStatus, TaskPriority } from '@/lib/database.types'
import { sendTaskCompletedNotification } from '@/lib/email'

// Valid enum values for validation
const VALID_STATUSES: TaskStatus[] = ['backlog', 'active', 'review', 'shipped', 'icebox']
const VALID_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * GET /api/tasks/[id]
 * Get a single task by ID
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
        { error: 'Invalid task ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Note: Using 'as any' until database types are regenerated from Supabase
    const { data, error } = await (supabase
      .from('tasks') as any)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }

      console.error('Supabase error fetching task:', error)
      return NextResponse.json(
        { error: 'Failed to fetch task' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/tasks/[id]
 * Update a task's fields
 *
 * Updatable fields: title, description, status, priority, shift_hours, traditional_hours_estimate, assigned_to, sprint_id, order_index
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
        { error: 'Invalid task ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const body = await request.json()

    // Build update object with validation
    const updateData: TaskUpdate = {}
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

      // Auto-set shipped_at when status changes to shipped
      if (body.status === 'shipped') {
        updateData.shipped_at = new Date().toISOString()
      } else if (body.status !== 'shipped') {
        updateData.shipped_at = null
      }
    }

    // Validate and add priority if provided
    if (body.priority !== undefined) {
      if (!VALID_PRIORITIES.includes(body.priority)) {
        return NextResponse.json(
          { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.priority = body.priority
      hasUpdates = true
    }

    // Validate numeric fields
    if (body.shift_hours !== undefined) {
      if (typeof body.shift_hours !== 'number' || body.shift_hours < 0) {
        return NextResponse.json(
          { error: 'Shift hours must be a positive number' },
          { status: 400 }
        )
      }
      updateData.shift_hours = body.shift_hours
      hasUpdates = true
    }

    if (body.traditional_hours_estimate !== undefined) {
      if (typeof body.traditional_hours_estimate !== 'number' || body.traditional_hours_estimate < 0) {
        return NextResponse.json(
          { error: 'Traditional hours estimate must be a positive number' },
          { status: 400 }
        )
      }
      updateData.traditional_hours_estimate = body.traditional_hours_estimate
      hasUpdates = true
    }

    if (body.order_index !== undefined) {
      if (typeof body.order_index !== 'number') {
        return NextResponse.json(
          { error: 'Order index must be a number' },
          { status: 400 }
        )
      }
      updateData.order_index = body.order_index
      hasUpdates = true
    }

    // Add assigned_to if provided
    if (body.assigned_to !== undefined) {
      updateData.assigned_to = body.assigned_to?.trim() || null
      hasUpdates = true
    }

    // Validate and add sprint_id if provided
    if (body.sprint_id !== undefined) {
      if (body.sprint_id !== null && !UUID_REGEX.test(body.sprint_id)) {
        return NextResponse.json(
          { error: 'Invalid sprint_id format' },
          { status: 400 }
        )
      }
      updateData.sprint_id = body.sprint_id
      hasUpdates = true
    }

    // Validate and add project_id if provided (for moving tasks between projects)
    if (body.project_id !== undefined) {
      if (!UUID_REGEX.test(body.project_id)) {
        return NextResponse.json(
          { error: 'Invalid project_id format' },
          { status: 400 }
        )
      }
      updateData.project_id = body.project_id
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

    // Get current task status before update (for notification logic)
    const { data: currentTask } = await (supabase
      .from('tasks') as any)
      .select('status, project_id')
      .eq('id', id)
      .single()

    const wasNotShipped = currentTask?.status !== 'shipped'
    const isBeingShipped = body.status === 'shipped'

    // Perform the update
    // Note: Using 'as any' until database types are regenerated from Supabase
    const { data, error } = await (supabase
      .from('tasks') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }

      // Handle foreign key violation
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Referenced project or sprint not found' },
          { status: 404 }
        )
      }

      console.error('Supabase error updating task:', error)
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      )
    }

    // Send notification if task was just shipped
    if (wasNotShipped && isBeingShipped && data) {
      try {
        // Get project and client info for notification
        const { data: projectData } = await (supabase
          .from('projects') as any)
          .select('name, client_id')
          .eq('id', data.project_id)
          .single()

        if (projectData?.client_id) {
          const { data: clientData } = await (supabase
            .from('clients') as any)
            .select('email, name')
            .eq('id', projectData.client_id)
            .single()

          if (clientData?.email) {
            await sendTaskCompletedNotification(clientData.email, {
              taskId: id,
              taskTitle: data.title,
              projectName: projectData.name || 'Your Project',
              completedAt: data.shipped_at || new Date().toISOString(),
              description: data.description || undefined,
              portalUrl: `https://l7shift.com/portal`,
            })
            console.log(`Task completed notification sent to ${clientData.email}`)
          }
        }
      } catch (emailError) {
        // Don't fail the request if email fails
        console.error('Failed to send task completed notification:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Task updated successfully',
      data
    })
  } catch (error) {
    console.error('Error updating task:', error)

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
 * DELETE /api/tasks/[id]
 * Delete a task
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
        { error: 'Invalid task ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Check if task exists first
    // Note: Using 'as any' until database types are regenerated from Supabase
    const { data: existingTask, error: fetchError } = await (supabase
      .from('tasks') as any)
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }
      console.error('Supabase error checking task:', fetchError)
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 500 }
      )
    }

    // Delete the task
    // Note: Using 'as any' until database types are regenerated from Supabase
    const { error: deleteError } = await (supabase
      .from('tasks') as any)
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Supabase error deleting task:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
