/**
 * /api/leads - Lead Management CRUD API
 *
 * GET  - List leads with optional filters (status, tier)
 * POST - Create a new lead
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { LeadStatus, LeadTier, LeadSource } from '@/lib/database.types'

// Valid enum values for validation
const VALID_STATUSES: LeadStatus[] = ['incoming', 'qualified', 'contacted', 'converted', 'disqualified']
const VALID_TIERS: LeadTier[] = ['SOFTBALL', 'MEDIUM', 'HARD', 'DISQUALIFY']
const VALID_SOURCES: LeadSource[] = ['website', 'referral', 'linkedin', 'other']

/**
 * GET /api/leads
 * List all leads with optional filtering
 *
 * Query params:
 * - status: Filter by lead status
 * - tier: Filter by lead tier
 * - limit: Number of results (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const status = searchParams.get('status') as LeadStatus | null
    const tier = searchParams.get('tier') as LeadTier | null
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate status filter if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate tier filter if provided
    if (tier && !VALID_TIERS.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}` },
        { status: 400 }
      )
    }

    // Build query
    // Note: Using 'as any' until database types are regenerated from Supabase
    let query = (supabase
      .from('leads') as any)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (tier) {
      query = query.eq('tier', tier)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error fetching leads:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
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
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/leads
 * Create a new lead
 *
 * Required fields: name, email
 * Optional fields: company, phone, message, source, answers
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    // Validate required fields
    const { name, email, company, phone, message, source, answers } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
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

    // Validate source if provided
    const leadSource: LeadSource = source && VALID_SOURCES.includes(source) ? source : 'website'

    // Prepare lead data
    const leadData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      company: company?.trim() || null,
      phone: phone?.trim() || null,
      message: message?.trim() || null,
      source: leadSource,
      status: 'incoming' as const,
      tier: null,
      ai_assessment: null
    }

    // Insert lead
    // Note: Using 'as any' until database types are regenerated from Supabase
    const { data, error } = await (supabase
      .from('leads') as any)
      .insert(leadData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating lead:', error)

      // Handle unique constraint violation (duplicate email)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A lead with this email already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Lead created successfully',
        data
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating lead:', error)

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
