import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  const appPassword = process.env.NEXT_PUBLIC_APP_PASSWORD || process.env.APP_PASSWORD

  if (!appPassword) {
    // No password set, allow access
    const response = NextResponse.json({ authenticated: true })
    response.cookies.set('authenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })
    return response
  }

  if (password === appPassword) {
    const response = NextResponse.json({ authenticated: true })
    response.cookies.set('authenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })
    return response
  }

  return NextResponse.json({ authenticated: false, error: 'Invalid password' }, { status: 401 })
}
