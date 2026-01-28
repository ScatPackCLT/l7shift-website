import { NextRequest, NextResponse } from 'next/server'
import { supabase, ContactSubmission } from '@/lib/supabase'

// Make.com webhook for lead pipeline
const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/ud1mk1qkvy4hpu7rw7wtn45ukxhlixru'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, message } = body as ContactSubmission

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
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

    // Send to Make.com webhook for lead pipeline
    try {
      await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      })
    } catch (webhookError) {
      console.error('Make.com webhook error:', webhookError)
      // Continue even if webhook fails - don't block form submission
    }

    // Check if Supabase is configured (legacy contact_submissions table)
    if (!supabase) {
      console.log('Contact form submission (Supabase not configured):', { name, email })
      return NextResponse.json(
        { success: true, message: 'Contact form submitted successfully' },
        { status: 201 }
      )
    }

    // Insert into Supabase contact_submissions (legacy backup)
    const { data, error } = await (supabase
      .from('contact_submissions') as any)
      .insert([{ name, email, message }])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      // Don't fail the request - webhook already captured the lead
    }

    return NextResponse.json(
      { success: true, message: 'Contact form submitted successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
