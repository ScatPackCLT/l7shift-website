/**
 * /api/notifications/test - Test Email Notifications
 *
 * POST - Send a test notification email
 *
 * This endpoint is for testing the notification system.
 * In production, you may want to restrict access to admin users only.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  sendTaskCompletedNotification,
  sendDeliverableReadyNotification,
  sendApprovalNeededNotification,
  sendClientFeedbackNotification,
  sendWeeklyStatusDigest,
  emailAddresses,
} from '@/lib/email'

type NotificationType =
  | 'task_completed'
  | 'deliverable_ready'
  | 'approval_needed'
  | 'client_feedback'
  | 'weekly_digest'

/**
 * POST /api/notifications/test
 *
 * Body:
 * - type: The type of notification to send
 * - email: The recipient email address (defaults to admin)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, email } = body

    const recipientEmail = email || emailAddresses.admin

    if (!type) {
      return NextResponse.json(
        {
          error: 'Notification type is required',
          validTypes: [
            'task_completed',
            'deliverable_ready',
            'approval_needed',
            'client_feedback',
            'weekly_digest',
          ],
        },
        { status: 400 }
      )
    }

    let result: { success: boolean; error?: string; resendId?: string }

    switch (type as NotificationType) {
      case 'task_completed':
        result = await sendTaskCompletedNotification(recipientEmail, {
          taskId: 'test-task-123',
          taskTitle: 'Implement User Authentication',
          projectName: 'Acme Corp Website Redesign',
          completedAt: new Date().toISOString(),
          description: 'Added magic link authentication with email verification and session management.',
          portalUrl: 'https://l7shift.com/portal',
        })
        break

      case 'deliverable_ready':
        result = await sendDeliverableReadyNotification(recipientEmail, {
          deliverableId: 'test-deliverable-456',
          deliverableName: 'Homepage Design v2',
          projectName: 'Acme Corp Website Redesign',
          type: 'design',
          description: 'Updated homepage with new hero section, improved mobile layout, and refreshed color palette.',
          version: 2,
          portalUrl: 'https://l7shift.com/portal',
        })
        break

      case 'approval_needed':
        result = await sendApprovalNeededNotification(recipientEmail, {
          requirementId: 'test-requirement-789',
          requirementTitle: 'Phase 1: Core Platform Requirements',
          projectName: 'Acme Corp Website Redesign',
          phase: 'Phase 1',
          summary: 'Foundation features including authentication, customer portal, and basic service management.',
          portalUrl: 'https://l7shift.com/portal',
        })
        break

      case 'client_feedback':
        result = await sendClientFeedbackNotification(emailAddresses.admin, {
          feedbackId: 'test-feedback-101',
          clientName: 'Jane Smith',
          projectName: 'Acme Corp Website Redesign',
          deliverableName: 'Homepage Design v2',
          content: 'Love the new design! Just a few minor tweaks:\n\n1. Can we make the CTA button slightly larger?\n2. The hero image looks great on desktop but could be optimized for mobile\n3. Consider adding more whitespace around the testimonials section',
          submittedAt: new Date().toISOString(),
        })
        break

      case 'weekly_digest':
        result = await sendWeeklyStatusDigest(recipientEmail, {
          projectName: 'Acme Corp Website Redesign',
          clientName: 'Acme Corporation',
          weekOf: new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          tasksCompleted: 5,
          tasksInProgress: 3,
          tasksUpcoming: 8,
          deliverablesAwaitingReview: 2,
          requirementsAwaitingSignoff: 1,
          recentActivity: [
            {
              description: 'Homepage design v2 uploaded for review',
              timestamp: '2 hours ago',
            },
            {
              description: 'User authentication task completed',
              timestamp: 'Yesterday',
            },
            {
              description: 'Phase 1 requirements ready for signoff',
              timestamp: '2 days ago',
            },
            {
              description: 'Brand style guide approved',
              timestamp: '3 days ago',
            },
          ],
          portalUrl: 'https://l7shift.com/portal',
        })
        break

      default:
        return NextResponse.json(
          {
            error: `Unknown notification type: ${type}`,
            validTypes: [
              'task_completed',
              'deliverable_ready',
              'approval_needed',
              'client_feedback',
              'weekly_digest',
            ],
          },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test ${type} notification sent to ${recipientEmail}`,
        resendId: result.resendId,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send notification',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending test notification:', error)

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
 * GET /api/notifications/test
 * Returns information about available test notification types
 */
export async function GET() {
  return NextResponse.json({
    message: 'Notification Test Endpoint',
    usage: 'POST with { "type": "<notification_type>", "email": "<optional_recipient>" }',
    availableTypes: {
      task_completed: 'Notifies client when a task is marked as shipped',
      deliverable_ready: 'Notifies client when a deliverable is uploaded for review',
      approval_needed: 'Notifies client when a requirement document needs signoff',
      client_feedback: 'Notifies admin when client submits feedback on a deliverable',
      weekly_digest: 'Sends weekly project status summary to client',
    },
    defaultRecipient: emailAddresses.admin,
    example: {
      type: 'task_completed',
      email: 'test@example.com',
    },
  })
}
