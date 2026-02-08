/**
 * POST /api/intake/submit
 * Submits the full intake questionnaire
 *
 * Saves to ShiftBoard and triggers Make.com automation for lead scoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

type IntakeSubmission = {
  token: string
  name: string
  email: string
  company: string
  role: string
  companySize: string
  industry: string
  industryOther?: string
  needs: string[]
  needsOther?: string
  visionClarity: string
  timeline: string
  budget: string
  decisionMaker: string
  currentTools: string
  frustration: string
  frustrationOther?: string
  pastExperience: string
  successCriteria: string
  source: string
  sourceOther?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: IntakeSubmission = await request.json()

    // Validate required fields
    const requiredFields = [
      'role',
      'companySize',
      'industry',
      'visionClarity',
      'timeline',
      'budget',
      'decisionMaker',
      'currentTools',
      'frustration',
      'pastExperience',
      'successCriteria',
      'source',
    ]

    const missingFields = requiredFields.filter(field => !body[field as keyof IntakeSubmission])
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    if (!body.needs || body.needs.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one project need' },
        { status: 400 }
      )
    }

    // Build answers object for storage
    const answers = {
      role: body.role,
      company_size: body.companySize,
      industry: body.industry,
      industry_other: body.industryOther || null,
      project_type: body.needs,
      project_type_other: body.needsOther || null,
      vision_clarity: body.visionClarity,
      timeline: body.timeline,
      budget: body.budget,
      decision_maker: body.decisionMaker,
      current_tools: body.currentTools,
      frustration: body.frustration,
      frustration_other: body.frustrationOther || null,
      past_experience: body.pastExperience,
      success_criteria: body.successCriteria,
      source: body.source,
      source_other: body.sourceOther || null,
    }

    // Try to save to Supabase
    let leadId: number | null = null
    let savedToDb = false

    try {
      const supabase = createServerClient()

      // Look up the token to get the lead_id
      // Type the response since tables may not exist yet
      type TokenRow = { lead_id: number | null }

      const { data: tokenData, error: tokenError } = await supabase
        .from('intake_tokens')
        .select('lead_id')
        .eq('token', body.token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single() as { data: TokenRow | null; error: unknown }

      if (!tokenError && tokenData) {
        leadId = tokenData.lead_id
      }

      // Save the intake submission
      const { error: insertError } = await supabase
        .from('intake_submissions')
        .insert({
          lead_id: leadId,
          token: body.token,
          answers: answers,
          submitted_at: new Date().toISOString(),
        } as never)

      if (insertError) {
        console.error('Failed to save intake submission:', insertError)
      } else {
        savedToDb = true
      }

      // Mark token as used
      if (body.token) {
        const { error: updateTokenError } = await supabase
          .from('intake_tokens')
          .update({
            used: true,
            used_at: new Date().toISOString()
          } as never)
          .eq('token', body.token)

        if (updateTokenError) {
          console.error('Failed to mark token as used:', updateTokenError)
        }
      }

      // Update the lead with intake data
      if (leadId) {
        const { error: updateLeadError } = await supabase
          .from('leads')
          .update({
            answers: answers,
          } as never)
          .eq('id', leadId)

        if (updateLeadError) {
          console.error('Failed to update lead with intake data:', updateLeadError)
        }
      }

    } catch (dbError) {
      console.error('Database error:', dbError)
      // Continue even if DB fails - we'll send email notification as fallback
    }

    // Trigger Make.com webhook for lead classification (if configured)
    const makeWebhookUrl = process.env.MAKE_INTAKE_WEBHOOK_URL
    if (makeWebhookUrl) {
      try {
        await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...body,
            answers,
            lead_id: leadId,
            submitted_at: new Date().toISOString(),
          }),
        })
      } catch (webhookError) {
        console.error('Failed to trigger Make.com webhook:', webhookError)
      }
    }

    console.log('Intake submission received:', JSON.stringify(body, null, 2))
    console.log('Saved to database:', savedToDb)

    // Send notification email as fallback/backup
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://l7shift.com'}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: body.name,
          email: body.email,
          message: formatIntakeEmail(body),
        }),
      })
    } catch (emailError) {
      console.error('Failed to send intake notification email:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'Intake submitted successfully',
      savedToDb,
    })
  } catch (error) {
    console.error('Intake submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit intake' },
      { status: 500 }
    )
  }
}

function formatIntakeEmail(data: IntakeSubmission): string {
  const formatValue = (key: string, value: string | string[], other?: string): string => {
    if (Array.isArray(value)) {
      let result = value.join(', ')
      if (value.includes('other') && other) {
        result += ` (${other})`
      }
      return result
    }
    if (value === 'other' && other) {
      return `Other: ${other}`
    }
    return value
  }

  return `
FULL INTAKE QUESTIONNAIRE SUBMITTED

=== Contact Info ===
Name: ${data.name}
Email: ${data.email}
Company: ${data.company || 'Not provided'}

=== About Them ===
Role: ${data.role}
Company Size: ${data.companySize}
Industry: ${formatValue('industry', data.industry, data.industryOther)}

=== Project Details ===
Needs: ${formatValue('needs', data.needs, data.needsOther)}
Vision Clarity: ${data.visionClarity}

=== Timeline & Budget ===
Timeline: ${data.timeline}
Budget: ${data.budget}
Decision Maker: ${data.decisionMaker}

=== Current Situation ===
Current Tools: ${data.currentTools}
Biggest Frustration: ${formatValue('frustration', data.frustration, data.frustrationOther)}
Past Dev Experience: ${data.pastExperience}

=== Success Criteria ===
"${data.successCriteria}"

=== Lead Source ===
${formatValue('source', data.source, data.sourceOther)}
  `.trim()
}
