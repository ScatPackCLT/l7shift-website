/**
 * /api/clients - Client Management CRUD API
 *
 * GET  - List clients with optional filters (status)
 * POST - Create a new client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ClientInsert } from '@/lib/database.types'

// Valid status values for validation
type ClientStatus = 'active' | 'completed' | 'prospect' | 'churned'
const VALID_STATUSES: ClientStatus[] = ['active', 'completed', 'prospect', 'churned']

/**
 * GET /api/clients
 * List all clients with optional filtering
 *
 * Query params:
 * - status: Filter by client status
 * - limit: Number of results (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const status = searchParams.get('status') as ClientStatus | null
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
      .from('clients') as any)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error fetching clients:', error)
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
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
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clients
 * Create a new client
 *
 * Required fields: name, company, email
 * Optional fields: phone, status, total_value, avatar_url
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    // Validate required fields
    const { name, company, email, phone, status, total_value, avatar_url } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!company || typeof company !== 'string' || company.trim().length === 0) {
      return NextResponse.json(
        { error: 'Company is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate status if provided
    const clientStatus: ClientStatus = status && VALID_STATUSES.includes(status) ? status : 'prospect'

    // Validate total_value if provided
    if (total_value !== undefined && total_value !== null) {
      if (typeof total_value !== 'number' || total_value < 0) {
        return NextResponse.json(
          { error: 'Total value must be a positive number' },
          { status: 400 }
        )
      }
    }

    // Prepare client data
    const clientData: ClientInsert = {
      name: name.trim(),
      company: company.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      status: clientStatus,
      total_value: total_value || 0,
      avatar_url: avatar_url || null
    }

    // Insert client
    // Note: Using 'as any' until database types are regenerated from Supabase
    const { data, error } = await (supabase
      .from('clients') as any)
      .insert(clientData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating client:', error)

      // Handle unique constraint violation (duplicate email)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A client with this email already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create client' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Client created successfully',
        data
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating client:', error)

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
