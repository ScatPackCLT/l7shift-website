import { Resend } from 'resend'

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY)

// Email addresses
export const emailAddresses = {
  noReply: 'no-reply@l7shift.com',
  info: 'info@l7shift.com',
  admin: 'ken@l7shift.com', // Owner gets all notifications
}

// Generate HTML email template
function generateEmailHTML(
  title: string,
  bodyContent: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #FAFAFA; margin: 0; padding: 0; background-color: #0A0A0A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A0A0A; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #1A1A1A; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px; text-align: center; background: linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(255, 0, 170, 0.1)); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #00F0FF, #FF00AA); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">L7 SHIFT</h1>
              <p style="color: #888; margin: 8px 0 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Strategy • Systems • Solutions</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px; background: #1A1A1A;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: #0A0A0A; padding: 20px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="color: #666; font-size: 12px; margin: 0;">
                <a href="https://l7shift.com" style="color: #00F0FF;">l7shift.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Send new lead notification to admin
 */
export async function sendNewLeadNotification(data: {
  name: string
  email: string
  message: string
  source?: string
}): Promise<{ success: boolean; error?: string; resendId?: string }> {
  const bodyContent = `
    <h2 style="color: #00F0FF; margin: 0 0 16px; font-size: 20px;">New Contact Form Submission</h2>

    <div style="background: rgba(0, 240, 255, 0.1); border-left: 3px solid #00F0FF; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px;"><strong style="color: #00F0FF;">Name:</strong> ${data.name}</p>
      <p style="margin: 0 0 8px;"><strong style="color: #00F0FF;">Email:</strong> <a href="mailto:${data.email}" style="color: #FAFAFA;">${data.email}</a></p>
      ${data.source ? `<p style="margin: 0 0 8px;"><strong style="color: #00F0FF;">Source:</strong> ${data.source}</p>` : ''}
    </div>

    <div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="color: #888; margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Message</p>
      <p style="color: #FAFAFA; margin: 0; white-space: pre-wrap;">${data.message}</p>
    </div>

    <p style="color: #888; font-size: 12px; margin: 24px 0 0;">
      Received at ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
    </p>
  `

  try {
    const result = await resend.emails.send({
      from: `L7 Shift <${emailAddresses.noReply}>`,
      to: emailAddresses.admin,
      replyTo: data.email, // So Ken can reply directly to the lead
      subject: `New Lead: ${data.name}`,
      html: generateEmailHTML('New Contact Form Submission', bodyContent),
    })

    return {
      success: true,
      resendId: result.data?.id
    }
  } catch (error) {
    console.error('Error sending lead notification email:', error)
    return {
      success: false,
      error: String(error)
    }
  }
}

/**
 * Send confirmation email to the person who submitted the form
 */
export async function sendContactConfirmation(data: {
  name: string
  email: string
}): Promise<{ success: boolean; error?: string }> {
  const bodyContent = `
    <h2 style="color: #FAFAFA; margin: 0 0 16px; font-size: 20px;">Thanks for reaching out, ${data.name}!</h2>

    <p style="color: #AAA; margin: 0 0 20px;">We've received your message and will get back to you within 24 hours.</p>

    <div style="background: rgba(191, 255, 0, 0.1); border-left: 3px solid #BFFF00; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="color: #BFFF00; margin: 0; font-weight: 600;">What happens next?</p>
      <ul style="color: #AAA; margin: 12px 0 0; padding-left: 20px;">
        <li>We'll review your project needs</li>
        <li>You'll receive a personalized response from our team</li>
        <li>If it's a fit, we'll schedule a discovery call</li>
      </ul>
    </div>

    <p style="color: #AAA; margin: 20px 0;">In the meantime, feel free to explore our <a href="https://l7shift.com" style="color: #00F0FF;">website</a> to learn more about how we help businesses transform their digital presence.</p>

    <p style="color: #888; margin: 24px 0 0;">— The L7 Shift Team</p>
  `

  try {
    await resend.emails.send({
      from: `L7 Shift <${emailAddresses.noReply}>`,
      to: data.email,
      subject: "We got your message!",
      html: generateEmailHTML('Thanks for Reaching Out', bodyContent),
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending contact confirmation email:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Send requirement signoff notification to admin
 */
export async function sendRequirementSignoffNotification(data: {
  requirementTitle: string
  signedBy: string
  signature: string
  signedAt: Date
  projectName: string
  clientName: string
  ipAddress: string
}): Promise<{ success: boolean; error?: string; resendId?: string }> {
  const formattedDate = data.signedAt.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  const bodyContent = `
    <h2 style="color: #BFFF00; margin: 0 0 16px; font-size: 20px;">Requirement Signed Off</h2>

    <p style="color: #AAA; margin: 0 0 20px;">A client has approved a requirements document.</p>

    <div style="background: rgba(191, 255, 0, 0.1); border-left: 3px solid #BFFF00; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 12px;"><strong style="color: #BFFF00;">Document:</strong></p>
      <p style="margin: 0; color: #FAFAFA; font-size: 16px;">${data.requirementTitle}</p>
    </div>

    <div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 12px;"><strong style="color: #00F0FF;">Signoff Details</strong></p>
      <table style="width: 100%; color: #AAA; font-size: 14px;">
        <tr>
          <td style="padding: 4px 0; color: #888;">Project:</td>
          <td style="padding: 4px 0;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #888;">Client:</td>
          <td style="padding: 4px 0;">${data.clientName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #888;">Signed By:</td>
          <td style="padding: 4px 0;">${data.signedBy}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #888;">Signature:</td>
          <td style="padding: 4px 0; font-style: italic;">"${data.signature}"</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #888;">Signed At:</td>
          <td style="padding: 4px 0;">${formattedDate} ET</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #888;">IP Address:</td>
          <td style="padding: 4px 0; font-family: monospace; font-size: 12px;">${data.ipAddress}</td>
        </tr>
      </table>
    </div>

    <div style="background: rgba(0, 240, 255, 0.1); border-left: 3px solid #00F0FF; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="color: #00F0FF; margin: 0 0 8px; font-weight: 600;">Next Steps</p>
      <p style="color: #AAA; margin: 0; font-size: 14px;">This requirement is now approved. You can proceed with implementation.</p>
    </div>
  `

  try {
    const result = await resend.emails.send({
      from: `L7 Shift <${emailAddresses.noReply}>`,
      to: emailAddresses.admin,
      subject: `Requirement Approved: ${data.requirementTitle}`,
      html: generateEmailHTML('Requirement Signed Off', bodyContent),
    })

    return {
      success: true,
      resendId: result.data?.id
    }
  } catch (error) {
    console.error('Error sending requirement signoff notification email:', error)
    return {
      success: false,
      error: String(error)
    }
  }
}

// =============================================================================
// SHIFTBOARD NOTIFICATION EMAILS
// =============================================================================

export interface TaskDetails {
  taskId: string
  taskTitle: string
  projectName: string
  completedAt: string
  description?: string
  portalUrl?: string
}

export interface DeliverableDetails {
  deliverableId: string
  deliverableName: string
  projectName: string
  type: string
  description?: string
  version: number
  portalUrl?: string
}

export interface RequirementDetails {
  requirementId: string
  requirementTitle: string
  projectName: string
  phase: string
  summary?: string
  portalUrl?: string
}

export interface FeedbackDetails {
  feedbackId: string
  clientName: string
  projectName: string
  deliverableName: string
  content: string
  submittedAt: string
}

export interface ProjectSummary {
  projectName: string
  clientName: string
  weekOf: string
  tasksCompleted: number
  tasksInProgress: number
  tasksUpcoming: number
  deliverablesAwaitingReview: number
  requirementsAwaitingSignoff: number
  recentActivity: {
    description: string
    timestamp: string
  }[]
  portalUrl?: string
}

/**
 * Notify client when a task is marked as shipped/completed
 */
export async function sendTaskCompletedNotification(
  clientEmail: string,
  taskDetails: TaskDetails
): Promise<{ success: boolean; error?: string; resendId?: string }> {
  const portalLink = taskDetails.portalUrl || 'https://l7shift.com/portal'

  const bodyContent = `
    <h2 style="color: #BFFF00; margin: 0 0 16px; font-size: 20px;">Task Completed</h2>

    <p style="color: #AAA; margin: 0 0 20px;">Great news! A task on your project has been completed.</p>

    <div style="background: rgba(191, 255, 0, 0.1); border-left: 3px solid #BFFF00; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px;"><strong style="color: #BFFF00;">Task:</strong> <span style="color: #FAFAFA;">${taskDetails.taskTitle}</span></p>
      <p style="margin: 0 0 8px;"><strong style="color: #BFFF00;">Project:</strong> <span style="color: #FAFAFA;">${taskDetails.projectName}</span></p>
      <p style="margin: 0;"><strong style="color: #BFFF00;">Completed:</strong> <span style="color: #888;">${new Date(taskDetails.completedAt).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</span></p>
    </div>

    ${taskDetails.description ? `
    <div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="color: #888; margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Details</p>
      <p style="color: #FAFAFA; margin: 0;">${taskDetails.description}</p>
    </div>
    ` : ''}

    <div style="margin: 24px 0; text-align: center;">
      <a href="${portalLink}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #00F0FF, #FF00AA); color: #0A0A0A; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View in Portal</a>
    </div>

    <p style="color: #666; font-size: 12px; margin: 24px 0 0; text-align: center;">
      You're receiving this because you're a client on this project.
    </p>
  `

  try {
    const result = await resend.emails.send({
      from: `L7 Shift <${emailAddresses.noReply}>`,
      to: clientEmail,
      subject: `Task Completed: ${taskDetails.taskTitle}`,
      html: generateEmailHTML('Task Completed', bodyContent),
    })

    return {
      success: true,
      resendId: result.data?.id
    }
  } catch (error) {
    console.error('Error sending task completed notification:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Notify client when a new deliverable is uploaded and ready for review
 */
export async function sendDeliverableReadyNotification(
  clientEmail: string,
  deliverableDetails: DeliverableDetails
): Promise<{ success: boolean; error?: string; resendId?: string }> {
  const portalLink = deliverableDetails.portalUrl || 'https://l7shift.com/portal'

  const typeLabels: Record<string, string> = {
    design: 'Design',
    document: 'Document',
    prototype: 'Prototype',
    code: 'Code',
  }

  const bodyContent = `
    <h2 style="color: #FF00AA; margin: 0 0 16px; font-size: 20px;">New Deliverable Ready for Review</h2>

    <p style="color: #AAA; margin: 0 0 20px;">A new deliverable has been uploaded and is waiting for your review.</p>

    <div style="background: rgba(255, 0, 170, 0.1); border-left: 3px solid #FF00AA; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px;"><strong style="color: #FF00AA;">Deliverable:</strong> <span style="color: #FAFAFA;">${deliverableDetails.deliverableName}</span></p>
      <p style="margin: 0 0 8px;"><strong style="color: #FF00AA;">Project:</strong> <span style="color: #FAFAFA;">${deliverableDetails.projectName}</span></p>
      <p style="margin: 0 0 8px;"><strong style="color: #FF00AA;">Type:</strong> <span style="color: #888;">${typeLabels[deliverableDetails.type] || deliverableDetails.type}</span></p>
      <p style="margin: 0;"><strong style="color: #FF00AA;">Version:</strong> <span style="color: #888;">v${deliverableDetails.version}</span></p>
    </div>

    ${deliverableDetails.description ? `
    <div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="color: #888; margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Description</p>
      <p style="color: #FAFAFA; margin: 0;">${deliverableDetails.description}</p>
    </div>
    ` : ''}

    <div style="margin: 24px 0; text-align: center;">
      <a href="${portalLink}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #00F0FF, #FF00AA); color: #0A0A0A; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Review Deliverable</a>
    </div>

    <p style="color: #666; font-size: 12px; margin: 24px 0 0; text-align: center;">
      Please review and provide feedback or approval at your earliest convenience.
    </p>
  `

  try {
    const result = await resend.emails.send({
      from: `L7 Shift <${emailAddresses.noReply}>`,
      to: clientEmail,
      subject: `Review Requested: ${deliverableDetails.deliverableName}`,
      html: generateEmailHTML('Deliverable Ready for Review', bodyContent),
    })

    return {
      success: true,
      resendId: result.data?.id
    }
  } catch (error) {
    console.error('Error sending deliverable ready notification:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Notify client when a requirement document is ready for signoff
 */
export async function sendApprovalNeededNotification(
  clientEmail: string,
  requirementDetails: RequirementDetails
): Promise<{ success: boolean; error?: string; resendId?: string }> {
  const portalLink = requirementDetails.portalUrl || 'https://l7shift.com/portal'

  const bodyContent = `
    <h2 style="color: #00F0FF; margin: 0 0 16px; font-size: 20px;">Approval Required</h2>

    <p style="color: #AAA; margin: 0 0 20px;">A requirements document is ready for your review and signoff.</p>

    <div style="background: rgba(0, 240, 255, 0.1); border-left: 3px solid #00F0FF; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px;"><strong style="color: #00F0FF;">Document:</strong> <span style="color: #FAFAFA;">${requirementDetails.requirementTitle}</span></p>
      <p style="margin: 0 0 8px;"><strong style="color: #00F0FF;">Project:</strong> <span style="color: #FAFAFA;">${requirementDetails.projectName}</span></p>
      <p style="margin: 0;"><strong style="color: #00F0FF;">Phase:</strong> <span style="color: #888;">${requirementDetails.phase}</span></p>
    </div>

    ${requirementDetails.summary ? `
    <div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="color: #888; margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Summary</p>
      <p style="color: #FAFAFA; margin: 0;">${requirementDetails.summary}</p>
    </div>
    ` : ''}

    <div style="background: rgba(255, 170, 0, 0.1); border: 1px solid rgba(255, 170, 0, 0.3); padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="color: #FFAA00; margin: 0; font-size: 13px;">
        <strong>Action Required:</strong> Please review and sign off on this document to allow us to proceed with implementation.
      </p>
    </div>

    <div style="margin: 24px 0; text-align: center;">
      <a href="${portalLink}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #BFFF00, #00F0FF); color: #0A0A0A; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Review & Sign Off</a>
    </div>

    <p style="color: #666; font-size: 12px; margin: 24px 0 0; text-align: center;">
      Your signoff is required before we can begin implementation.
    </p>
  `

  try {
    const result = await resend.emails.send({
      from: `L7 Shift <${emailAddresses.noReply}>`,
      to: clientEmail,
      subject: `Signoff Required: ${requirementDetails.requirementTitle}`,
      html: generateEmailHTML('Approval Needed', bodyContent),
    })

    return {
      success: true,
      resendId: result.data?.id
    }
  } catch (error) {
    console.error('Error sending approval needed notification:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Notify Ken (admin) when a client submits feedback on a deliverable
 */
export async function sendClientFeedbackNotification(
  kenEmail: string,
  feedbackDetails: FeedbackDetails
): Promise<{ success: boolean; error?: string; resendId?: string }> {
  const bodyContent = `
    <h2 style="color: #FFAA00; margin: 0 0 16px; font-size: 20px;">New Client Feedback</h2>

    <p style="color: #AAA; margin: 0 0 20px;">A client has submitted feedback on a deliverable.</p>

    <div style="background: rgba(255, 170, 0, 0.1); border-left: 3px solid #FFAA00; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px;"><strong style="color: #FFAA00;">Client:</strong> <span style="color: #FAFAFA;">${feedbackDetails.clientName}</span></p>
      <p style="margin: 0 0 8px;"><strong style="color: #FFAA00;">Project:</strong> <span style="color: #FAFAFA;">${feedbackDetails.projectName}</span></p>
      <p style="margin: 0 0 8px;"><strong style="color: #FFAA00;">Deliverable:</strong> <span style="color: #FAFAFA;">${feedbackDetails.deliverableName}</span></p>
      <p style="margin: 0;"><strong style="color: #FFAA00;">Submitted:</strong> <span style="color: #888;">${new Date(feedbackDetails.submittedAt).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</span></p>
    </div>

    <div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="color: #888; margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Feedback</p>
      <p style="color: #FAFAFA; margin: 0; white-space: pre-wrap;">${feedbackDetails.content}</p>
    </div>

    <p style="color: #666; font-size: 12px; margin: 24px 0 0;">
      Received at ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
    </p>
  `

  try {
    const result = await resend.emails.send({
      from: `L7 Shift <${emailAddresses.noReply}>`,
      to: kenEmail,
      subject: `Feedback from ${feedbackDetails.clientName}: ${feedbackDetails.deliverableName}`,
      html: generateEmailHTML('Client Feedback Received', bodyContent),
    })

    return {
      success: true,
      resendId: result.data?.id
    }
  } catch (error) {
    console.error('Error sending client feedback notification:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Send weekly project status digest to client
 */
export async function sendWeeklyStatusDigest(
  clientEmail: string,
  projectSummary: ProjectSummary
): Promise<{ success: boolean; error?: string; resendId?: string }> {
  const portalLink = projectSummary.portalUrl || 'https://l7shift.com/portal'

  const activityHtml = projectSummary.recentActivity.length > 0
    ? projectSummary.recentActivity.map(activity => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
            <span style="color: #FAFAFA; font-size: 13px;">${activity.description}</span><br>
            <span style="color: #666; font-size: 11px;">${activity.timestamp}</span>
          </td>
        </tr>
      `).join('')
    : '<tr><td style="padding: 8px 0; color: #666; font-size: 13px;">No activity this week</td></tr>'

  const bodyContent = `
    <h2 style="color: #FAFAFA; margin: 0 0 8px; font-size: 20px;">Weekly Project Update</h2>
    <p style="color: #888; margin: 0 0 24px; font-size: 13px;">Week of ${projectSummary.weekOf}</p>

    <div style="background: rgba(0, 240, 255, 0.1); border-left: 3px solid #00F0FF; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 4px;"><strong style="color: #00F0FF;">Project:</strong> <span style="color: #FAFAFA;">${projectSummary.projectName}</span></p>
      <p style="margin: 0;"><strong style="color: #00F0FF;">Client:</strong> <span style="color: #888;">${projectSummary.clientName}</span></p>
    </div>

    <!-- Stats Grid -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
      <tr>
        <td width="33%" style="padding: 12px; background: rgba(191, 255, 0, 0.1); border-radius: 8px 0 0 8px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #BFFF00;">${projectSummary.tasksCompleted}</div>
          <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Completed</div>
        </td>
        <td width="33%" style="padding: 12px; background: rgba(0, 240, 255, 0.1); text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #00F0FF;">${projectSummary.tasksInProgress}</div>
          <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px;">In Progress</div>
        </td>
        <td width="33%" style="padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 0 8px 8px 0; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #888;">${projectSummary.tasksUpcoming}</div>
          <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Upcoming</div>
        </td>
      </tr>
    </table>

    ${(projectSummary.deliverablesAwaitingReview > 0 || projectSummary.requirementsAwaitingSignoff > 0) ? `
    <!-- Action Items -->
    <div style="background: rgba(255, 0, 170, 0.1); border: 1px solid rgba(255, 0, 170, 0.3); padding: 16px; border-radius: 8px; margin: 0 0 24px;">
      <p style="color: #FF00AA; margin: 0 0 12px; font-weight: 600; font-size: 13px;">Action Required</p>
      ${projectSummary.deliverablesAwaitingReview > 0 ? `<p style="color: #FAFAFA; margin: 0 0 4px; font-size: 13px;">${projectSummary.deliverablesAwaitingReview} deliverable(s) awaiting your review</p>` : ''}
      ${projectSummary.requirementsAwaitingSignoff > 0 ? `<p style="color: #FAFAFA; margin: 0; font-size: 13px;">${projectSummary.requirementsAwaitingSignoff} requirement(s) awaiting your signoff</p>` : ''}
    </div>
    ` : ''}

    <!-- Recent Activity -->
    <div style="margin: 0 0 24px;">
      <p style="color: #888; margin: 0 0 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Recent Activity</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 12px;">
        ${activityHtml}
      </table>
    </div>

    <div style="margin: 24px 0; text-align: center;">
      <a href="${portalLink}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #00F0FF, #FF00AA); color: #0A0A0A; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View Full Dashboard</a>
    </div>

    <p style="color: #666; font-size: 12px; margin: 24px 0 0; text-align: center;">
      You're receiving this weekly digest as a client of L7 Shift.
    </p>
  `

  try {
    const result = await resend.emails.send({
      from: `L7 Shift <${emailAddresses.noReply}>`,
      to: clientEmail,
      subject: `Weekly Update: ${projectSummary.projectName}`,
      html: generateEmailHTML('Weekly Project Update', bodyContent),
    })

    return {
      success: true,
      resendId: result.data?.id
    }
  } catch (error) {
    console.error('Error sending weekly status digest:', error)
    return { success: false, error: String(error) }
  }
}
