import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const executionId = req.nextUrl.searchParams.get('execution_id') || undefined

    // Try Supabase Storage first
    try {
      const pathnameSafe = file.name?.replace(/[^a-zA-Z0-9._-]/g, "_") || "upload.png"
      const fileExt = pathnameSafe.split('.').pop() || 'png'
      const fileName = `uploads/${Date.now()}-${crypto.randomUUID()}.${fileExt}`
      
      // Convert file to buffer
      const fileBuffer = await file.arrayBuffer()

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, fileBuffer, {
          contentType: file.type,
          upsert: false
        })

      if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName)

      // Log in DB (with optional execution id)
      await supabase.from('uploads').insert({ url: urlData.publicUrl, file_name: fileName.split('/').pop(), execution_id: executionId || null })

      return NextResponse.json({ url: urlData.publicUrl })
    } catch (supabaseErr) {
      console.error('Supabase upload error:', supabaseErr)
      // Fallback: data URL
      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString("base64")
      const mime = file.type || "image/png"
      const dataUrl = `data:${mime};base64,${base64}`
      return NextResponse.json({ url: dataUrl, warning: "Using data URL fallback (Supabase not configured)" })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 })
  }
}
