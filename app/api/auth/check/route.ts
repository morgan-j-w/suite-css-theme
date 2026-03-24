import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authenticated = request.cookies.get('authenticated')?.value === 'true'
  
  return NextResponse.json({ authenticated })
}
