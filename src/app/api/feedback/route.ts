/**
 * /api/feedback - Client Feedback API
 *
 * POST - Create feedback on a deliverable (triggers notification to admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendClientFeedbackNotification, emailAddresses } from '@/lib/email'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * POST /api/feedback
 * Submit feedback on a deliverable
 *
 * Required fields: deliverable_id, client_id, content
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { deliverable_id, client_id, content } = body

    // Validate required fields
    if (!deliverable_id || !UUID_REGEX.test(deliverable_id)) {
      return NextResponse.json(
        { error: 'Valid deliverable_id is required' },
        { status: 400 }
      )
    }

    if (!client_id || !UUID_REGEX.test(client_id)) {
      return NextResponse.json(
        { error: 'Valid client_id is required' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Insert feedback
    const { data, error } = await (supabase
      .from('client_feedback') as any)
      .insert({
        deliverable_id,
        client_id,
        content: content.trim(),
        resolved: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating feedback:', error)

      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Deliverable or client not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create feedback' },
        { status: 500 }
      )
    }

    // Send notification to admin
    try {
      // Get deliverable info
      const { data: deliverableData } = await (supabase
        .from('deliverables') as any)
        .select('name, project_id')
        .eq('id', deliverable_id)
        .single()

      // Get client info
      const { data: clientData } = await (supabase
        .from('clients') as any)
        .select('name')
        .eq('id', client_id)
        .single()

      // Get project info
      let projectName = 'Unknown Project'
      if (deliverableData?.project_id) {
        const { data: projectData } = await (supabase
          .from('projects') as any)
          .select('name')
          .eq('id', deliverableData.project_id)
          .single()
        projectName = projectData?.name || 'Unknown Project'
      }

      await sendClientFeedbackNotification(emailAddresses.admin, {
        feedbackId: data.id,
        clientName: clientData?.name || 'Unknown Client',
        projectName,
        deliverableName: deliverableData?.name || 'Unknown Deliverable',
        content: content.trim(),
        submittedAt: data.created_at || new Date().toISOString(),
      })
      console.log('Feedback notification sent to admin')
    } catch (emailError) {
      console.error('Failed to send feedback notification:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Feedback submitted successfully',
        data
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating feedback:', error)

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
