import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Supabase client for auth
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Password hashing with bcrypt (cost factor 12 for security)
const BCRYPT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Generate secure random token
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Generate session ID
export function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex')
}

// User types
export interface User {
  id: string
  email: string
  password_hash: string
  role: 'admin' | 'internal' | 'client'
  client_slug?: string
  name: string
  failed_login_attempts: number
  locked_until?: Date
  created_at: Date
  updated_at: Date
}

export interface Session {
  id: string
  user_id: string
  token: string
  ip_address: string
  user_agent: string
  created_at: Date
  expires_at: Date
}

// Get user by email from Supabase
export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = getSupabaseAdmin()

  // Fallback to env-based users if Supabase not configured
  if (!supabase) {
    return getEnvUser(email)
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()

  if (error || !data) {
    // Fallback to env users
    return getEnvUser(email)
  }

  return data as User
}

// Environment-based users (fallback when Supabase not available)
// Passwords MUST be set via environment variables in production
function getEnvUser(email: string): User | null {
  const normalizedEmail = email.toLowerCase().trim()

  const envUsers: Record<string, Omit<User, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts' | 'locked_until'> & { envPassword: string }> = {
    'ken@l7shift.com': {
      email: 'ken@l7shift.com',
      password_hash: '', // Will be compared with bcrypt
      envPassword: process.env.ADMIN_PASSWORD || '',
      role: 'admin',
      name: 'Ken',
    },
    'closetsbyjazz@gmail.com': {
      email: 'closetsbyjazz@gmail.com',
      password_hash: '',
      envPassword: process.env.PPC_CLIENT_PASSWORD || '',
      role: 'client',
      client_slug: 'prettypaidcloset',
      name: 'Jasmine Mayham (Jazz)',
    },
    'ken@scatpackclt.com': {
      email: 'ken@scatpackclt.com',
      password_hash: '',
      envPassword: process.env.SCATPACK_CLIENT_PASSWORD || '',
      role: 'client',
      client_slug: 'scat-pack-clt',
      name: 'Ken',
    },
    'nicole@stitchwichs.com': {
      email: 'nicole@stitchwichs.com',
      password_hash: '',
      envPassword: process.env.STITCHWICHS_CLIENT_PASSWORD || '',
      role: 'client',
      client_slug: 'stitchwichs',
      name: 'Nicole',
    },
  }

  const envUser = envUsers[normalizedEmail]
  if (!envUser || !envUser.envPassword) {
    return null
  }

  // For env users, we store the plain password temporarily
  // The login route will handle comparison
  return {
    id: `env_${normalizedEmail}`,
    email: envUser.email,
    password_hash: envUser.envPassword, // Plain for env users, bcrypt for DB users
    role: envUser.role,
    client_slug: envUser.client_slug,
    name: envUser.name,
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date(),
  }
}

// Check if user is env-based (uses plain password comparison)
export function isEnvUser(userId: string): boolean {
  return userId.startsWith('env_')
}

// Create session in Supabase
export async function createSession(
  userId: string,
  token: string,
  ipAddress: string,
  userAgent: string
): Promise<Session | null> {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    // Return mock session for env users
    return {
      id: generateSessionId(),
      user_id: userId,
      token,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    }
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      token,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create session:', error)
    return null
  }

  return data as Session
}

// Validate session token
export async function validateSession(token: string): Promise<User | null> {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    // For env users, we can't validate sessions server-side
    // The middleware handles this via cookies
    return null
  }

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*, users(*)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (sessionError || !session) {
    return null
  }

  return session.users as User
}

// Invalidate session (logout)
export async function invalidateSession(token: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  if (!supabase) return

  await supabase
    .from('sessions')
    .delete()
    .eq('token', token)
}

// Invalidate all sessions for user (security measure)
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  if (!supabase) return

  await supabase
    .from('sessions')
    .delete()
    .eq('user_id', userId)
}

// Record failed login attempt
export async function recordFailedLogin(email: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  if (!supabase) return

  const { data: user } = await supabase
    .from('users')
    .select('id, failed_login_attempts')
    .eq('email', email.toLowerCase())
    .single()

  if (user) {
    const newAttempts = (user.failed_login_attempts || 0) + 1
    const lockUntil = newAttempts >= 5
      ? new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes after 5 attempts
      : null

    await supabase
      .from('users')
      .update({
        failed_login_attempts: newAttempts,
        locked_until: lockUntil?.toISOString(),
      })
      .eq('id', user.id)
  }
}

// Clear failed login attempts on successful login
export async function clearFailedLogins(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  if (!supabase) return

  await supabase
    .from('users')
    .update({
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq('id', userId)
}

// Check if account is locked
export async function isAccountLocked(email: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  if (!supabase) return false

  const { data: user } = await supabase
    .from('users')
    .select('locked_until')
    .eq('email', email.toLowerCase())
    .single()

  if (!user?.locked_until) return false

  return new Date(user.locked_until) > new Date()
}

// Log security event
export async function logSecurityEvent(
  event: string,
  email: string,
  ipAddress: string,
  userAgent: string,
  success: boolean,
  details?: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    // Log to console in development
    console.log(`[SECURITY] ${event}:`, { email, ipAddress, success, details })
    return
  }

  await supabase
    .from('security_logs')
    .insert({
      event,
      email,
      ip_address: ipAddress,
      user_agent: userAgent,
      success,
      details,
    })
}
