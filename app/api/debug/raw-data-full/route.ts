import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Debug endpoint accessed',
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to process debug request' },
      { status: 500 }
    )
  }
}
