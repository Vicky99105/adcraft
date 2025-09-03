import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { templates, userImageUrl, prompt, webhookUrl } = body || {}

    // Handle both old format (array of URLs) and new format (array of {url, prompt})
    let templateUrls: string[] = []
    let templatePrompts: string[] = []
    
    if (Array.isArray(templates)) {
      if (templates.length === 0) {
        return NextResponse.json({ error: "No templates provided" }, { status: 400 })
      }
      
      // Check if it's new format (objects with url and prompt)
      if (typeof templates[0] === 'object' && templates[0].url) {
        templateUrls = templates.map((t: any) => t.url)
        templatePrompts = templates.map((t: any) => t.prompt || prompt || "")
      } else {
        // Old format (array of URLs)
        templateUrls = templates
        templatePrompts = templates.map(() => prompt || "")
      }
    } else {
      return NextResponse.json({ error: "Templates must be an array" }, { status: 400 })
    }
    
    if (!userImageUrl || typeof userImageUrl !== "string") {
      return NextResponse.json({ error: "userImageUrl is required" }, { status: 400 })
    }

    const url = (webhookUrl || process.env.N8N_WEBHOOK_URL) as string | undefined
    if (!url) {
      return NextResponse.json(
        { error: "Missing webhook URL. Set env N8N_WEBHOOK_URL or provide override in request." },
        { status: 400 },
      )
    }

    // Use provided execution_id if any (e.g., created client-side), else create one
    let executionId: string | undefined = typeof body?.execution_id === 'string' ? body.execution_id : undefined
    if (!executionId) {
      const { data: execInsert, error: execInsertErr } = await supabase
        .from('executions')
        .insert({ 
          status: 'started', 
          templates: templateUrls, 
          user_image_url: userImageUrl, 
          prompts: templatePrompts 
        })
        .select('id')
        .single()
      executionId = execInsert?.id as string | undefined
      if (execInsertErr) {
        console.error('Failed to create execution row:', execInsertErr)
      }
    } else {
          // If provided, ensure row exists and set to started
    await supabase.from('executions').upsert({ 
      id: executionId, 
      status: 'started', 
      templates: templateUrls, 
      user_image_url: userImageUrl, 
      prompts: templatePrompts,
      started_at: new Date().toISOString() 
    }, { onConflict: 'id' })
    }

    const payload = {
      userImage: userImageUrl,
      templates: templateUrls,
      prompts: templatePrompts,
      ...(executionId ? { execution_id: executionId } : {}),
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    let json: any
    try {
      json = JSON.parse(text)
    } catch {
      json = { raw: text }
    }

    // Update execution row with status
    if (executionId) {
      const status = res.ok ? 'success' : 'error'
      const resultCount = Array.isArray(json) ? json.length : (typeof json === 'object' ? Object.keys(json).length : 0)
      const { error: execUpdateErr } = await supabase
        .from('executions')
        .update({ status, finished_at: new Date().toISOString(), error: res.ok ? null : JSON.stringify(json).slice(0, 4000), result_count: resultCount })
        .eq('id', executionId)
      if (execUpdateErr) {
        console.error('Failed to update execution row:', execUpdateErr)
      }
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "n8n webhook returned error", status: res.status, response: json, execution_id: executionId },
        { status: 502 },
      )
    }

    return NextResponse.json({ ...json, execution_id: executionId })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Trigger failed" }, { status: 500 })
  }
}
