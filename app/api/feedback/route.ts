import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { execution_id, rating, feedback, email } = await request.json()
    
    if (!execution_id || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        execution_id,
        rating: parseInt(rating),
        feedback: feedback || null,
        email: email || null,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Feedback insert error:', error)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data[0]?.id })
  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
