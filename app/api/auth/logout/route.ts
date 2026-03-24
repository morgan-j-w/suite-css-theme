import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  response.cookies.set('authenticated', '', {
    httpOnly: true,
    maxAge: 0 // Delete the cookie
  })
  return response
}
