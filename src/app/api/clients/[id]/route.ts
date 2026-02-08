/**
 * /api/clients/[id] - Single Client CRUD API
 *
 * GET    - Get a single client by ID
 * PATCH  - Update client fields
 * DELETE - Delete a client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ClientUpdate } from '@/lib/database.types'

// Valid status values for validation
type ClientStatus = 'active' | 'completed' | 'prospect' | 'churned'
const VALID_STATUSES: ClientStatus[] = ['active', 'completed', 'prospect', 'churned']

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * GET /api/clients/[id]
 * Get a single client by ID
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
        { error: 'Invalid client ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Note: Using 'as any' until database types are regenerated from Supabase
    const { data, error } = await (supabase
      .from('clients') as any)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        )
      }

      console.error('Supabase error fetching client:', error)
      return NextResponse.json(
        { error: 'Failed to fetch client' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/clients/[id]
 * Update a client's fields
 *
 * Updatable fields: name, company, email, phone, status, total_value, avatar_url
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
        { error: 'Invalid client ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const body = await request.json()

    // Build update object with validation
    const updateData: ClientUpdate = {}
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

    // Validate and add company if provided
    if (body.company !== undefined) {
      if (typeof body.company !== 'string' || body.company.trim().length === 0) {
        return NextResponse.json(
          { error: 'Company must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.company = body.company.trim()
      hasUpdates = true
    }

    // Validate and add email if provided
    if (body.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (typeof body.email !== 'string' || !emailRegex.test(body.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
      updateData.email = body.email.toLowerCase().trim()
      hasUpdates = true
    }

    // Add phone if provided
    if (body.phone !== undefined) {
      updateData.phone = body.phone?.trim() || null
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

    // Validate and add total_value if provided
    if (body.total_value !== undefined) {
      if (typeof body.total_value !== 'number' || body.total_value < 0) {
        return NextResponse.json(
          { error: 'Total value must be a positive number' },
          { status: 400 }
        )
      }
      updateData.total_value = body.total_value
      hasUpdates = true
    }

    // Add avatar_url if provided
    if (body.avatar_url !== undefined) {
      updateData.avatar_url = body.avatar_url || null
      hasUpdates = true
    }

    // Add last_active if provided
    if (body.last_active !== undefined) {
      if (body.last_active !== null && isNaN(Date.parse(body.last_active))) {
        return NextResponse.json(
          { error: 'Invalid last_active format' },
          { status: 400 }
        )
      }
      updateData.last_active = body.last_active
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
      .from('clients') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        )
      }

      // Handle unique constraint violation (duplicate email)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A client with this email already exists' },
          { status: 409 }
        )
      }

      console.error('Supabase error updating client:', error)
      return NextResponse.json(
        { error: 'Failed to update client' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Client updated successfully',
      data
    })
  } catch (error) {
    console.error('Error updating client:', error)

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
 * DELETE /api/clients/[id]
 * Delete a client
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
        { error: 'Invalid client ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Check if client exists first
    // Note: Using 'as any' until database types are regenerated from Supabase
    const { data: existingClient, error: fetchError } = await (supabase
      .from('clients') as any)
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        )
      }
      console.error('Supabase error checking client:', fetchError)
      return NextResponse.json(
        { error: 'Failed to delete client' },
        { status: 500 }
      )
    }

    // Delete the client
    // Note: Using 'as any' until database types are regenerated from Supabase
    const { error: deleteError } = await (supabase
      .from('clients') as any)
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Supabase error deleting client:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete client' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
