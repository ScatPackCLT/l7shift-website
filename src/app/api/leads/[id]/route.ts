/**
 * /api/leads/[id] - Single Lead CRUD API
 *
 * GET    - Get a single lead by ID
 * PATCH  - Update lead fields (status, tier, ai_assessment, etc.)
 * DELETE - Delete a lead
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { LeadStatus, LeadTier, Json } from '@/lib/database.types'

// Valid enum values for validation
const VALID_STATUSES: LeadStatus[] = ['incoming', 'qualified', 'contacted', 'converted', 'disqualified']
const VALID_TIERS: LeadTier[] = ['SOFTBALL', 'MEDIUM', 'HARD', 'DISQUALIFY']

// ID validation - accepts integers or UUIDs
const VALID_ID = /^(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i

/**
 * GET /api/leads/[id]
 * Get a single lead by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate UUID format
    if (!VALID_ID.test(id)) {
      return NextResponse.json(
        { error: 'Invalid lead ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Note: Using 'as any' until database types are regenerated from Supabase
    const { data, error } = await (supabase
      .from('leads') as any)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        )
      }

      console.error('Supabase error fetching lead:', error)
      return NextResponse.json(
        { error: 'Failed to fetch lead' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/leads/[id]
 * Update a lead's fields
 *
 * Updatable fields: status, tier, ai_assessment, name, email, company, phone, message, answers
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate UUID format
    if (!VALID_ID.test(id)) {
      return NextResponse.json(
        { error: 'Invalid lead ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const body = await request.json()

    // Build update object with validation
    const updateData: Record<string, unknown> = {}
    let hasUpdates = false

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

    // Validate and add tier if provided
    if (body.tier !== undefined) {
      if (body.tier !== null && !VALID_TIERS.includes(body.tier)) {
        return NextResponse.json(
          { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')} or null` },
          { status: 400 }
        )
      }
      updateData.tier = body.tier
      hasUpdates = true
    }

    // Add ai_assessment if provided (JSON object)
    if (body.ai_assessment !== undefined) {
      if (body.ai_assessment !== null && typeof body.ai_assessment !== 'object') {
        return NextResponse.json(
          { error: 'ai_assessment must be an object or null' },
          { status: 400 }
        )
      }
      updateData.ai_assessment = body.ai_assessment as Json
      hasUpdates = true
    }

    // Add name if provided
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

    // Add email if provided
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

    // Add optional string fields
    if (body.company !== undefined) {
      updateData.company = body.company?.trim() || null
      hasUpdates = true
    }

    if (body.phone !== undefined) {
      updateData.phone = body.phone?.trim() || null
      hasUpdates = true
    }

    if (body.message !== undefined) {
      updateData.message = body.message?.trim() || null
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
      .from('leads') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        )
      }

      // Handle unique constraint violation (duplicate email)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A lead with this email already exists' },
          { status: 409 }
        )
      }

      console.error('Supabase error updating lead:', error)
      return NextResponse.json(
        { error: 'Failed to update lead' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Lead updated successfully',
      data
    })
  } catch (error) {
    console.error('Error updating lead:', error)

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
 * DELETE /api/leads/[id]
 * Delete a lead
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate UUID format
    if (!VALID_ID.test(id)) {
      return NextResponse.json(
        { error: 'Invalid lead ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Check if lead exists first
    const { data: existingLead, error: fetchError } = await (supabase
      .from('leads') as any)
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        )
      }
      console.error('Supabase error checking lead:', fetchError)
      return NextResponse.json(
        { error: 'Failed to delete lead' },
        { status: 500 }
      )
    }

    // Delete the lead
    const { error: deleteError } = await (supabase
      .from('leads') as any)
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Supabase error deleting lead:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete lead' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
