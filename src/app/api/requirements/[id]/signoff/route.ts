/**
 * /api/requirements/[id]/signoff - Requirement Signoff API
 *
 * POST - Record a client signoff on a requirement document
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendRequirementSignoffNotification } from '@/lib/email'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * POST /api/requirements/[id]/signoff
 * Record a client signoff on a requirement document
 *
 * Required fields: client_id, signed_by, signature
 */
export async function POST(
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

    // Validate required fields
    const { client_id, signed_by, signature } = body

    if (!client_id || typeof client_id !== 'string') {
      return NextResponse.json(
        { error: 'client_id is required' },
        { status: 400 }
      )
    }

    if (!signed_by || typeof signed_by !== 'string' || signed_by.trim().length === 0) {
      return NextResponse.json(
        { error: 'signed_by (client name) is required' },
        { status: 400 }
      )
    }

    if (!signature || typeof signature !== 'string' || signature.trim().length === 0) {
      return NextResponse.json(
        { error: 'signature (typed name) is required' },
        { status: 400 }
      )
    }

    // Get IP address from request headers
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown'

    // Get user agent
    const userAgent = request.headers.get('user-agent') || null

    // First, verify the requirement exists and is in 'review' status
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

    // Check if already approved
    if (requirement.status === 'approved' || requirement.status === 'implemented') {
      return NextResponse.json(
        { error: 'This requirement has already been approved' },
        { status: 400 }
      )
    }

    // Check for existing signoff
    const { data: existingSignoff } = await (supabase
      .from('requirement_signoffs') as ReturnType<typeof supabase.from>)
      .select('id')
      .eq('doc_id', id)
      .eq('client_id', client_id)
      .single()

    if (existingSignoff) {
      return NextResponse.json(
        { error: 'You have already signed off on this requirement' },
        { status: 400 }
      )
    }

    // Create the signoff record
    const signoffData = {
      doc_id: id,
      client_id,
      signed_at: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
    }

    const { data: signoff, error: signoffError } = await (supabase
      .from('requirement_signoffs') as ReturnType<typeof supabase.from>)
      .insert(signoffData)
      .select()
      .single()

    if (signoffError) {
      console.error('Supabase error creating signoff:', signoffError)
      return NextResponse.json(
        { error: 'Failed to create signoff' },
        { status: 500 }
      )
    }

    // Update the requirement status to 'approved'
    const { error: updateError } = await (supabase
      .from('requirements_docs') as ReturnType<typeof supabase.from>)
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Supabase error updating requirement status:', updateError)
      // Don't fail the request - signoff was recorded
    }

    // Get project info for the email
    const { data: project } = await (supabase
      .from('projects') as ReturnType<typeof supabase.from>)
      .select('name, client_name')
      .eq('id', requirement.project_id)
      .single()

    // Send email notification to Ken
    const emailResult = await sendRequirementSignoffNotification({
      requirementTitle: requirement.title,
      signedBy: signed_by.trim(),
      signature: signature.trim(),
      signedAt: new Date(),
      projectName: project?.name || 'Unknown Project',
      clientName: project?.client_name || signed_by.trim(),
      ipAddress,
    })

    if (!emailResult.success) {
      console.error('Failed to send signoff notification email:', emailResult.error)
      // Don't fail the request - signoff was recorded
    }

    return NextResponse.json({
      success: true,
      message: 'Requirement signed off successfully',
      data: {
        signoff,
        requirement: {
          ...requirement,
          status: 'approved'
        }
      }
    })
  } catch (error) {
    console.error('Error processing signoff:', error)

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
