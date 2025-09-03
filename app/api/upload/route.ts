import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

// Supabase Storage limits (adjust based on your plan)
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const RECOMMENDED_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const executionId = req.nextUrl.searchParams.get('execution_id') || undefined

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.` 
      }, { status: 400 })
    }

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
        // Check if it's a size-related error
        if (error.message.includes('size') || error.message.includes('exceeded')) {
          return NextResponse.json({ 
            error: `File too large for storage. Please use a smaller image (under ${RECOMMENDED_FILE_SIZE / (1024 * 1024)}MB). Current size: ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
            fileSize: file.size,
            maxSize: RECOMMENDED_FILE_SIZE
          }, { status: 400 })
        }
        throw new Error(`Supabase upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName)

      // Log in DB (with optional execution id)
      await supabase.from('uploads').insert({ 
        url: urlData.publicUrl, 
        file_name: fileName.split('/').pop(), 
        execution_id: executionId || null,
        file_size: file.size,
        content_type: file.type
      })

      return NextResponse.json({ 
        url: urlData.publicUrl,
        fileSize: file.size,
        message: "File uploaded successfully to Supabase Storage"
      })
    } catch (supabaseErr) {
      console.error('Supabase upload error:', supabaseErr)
      
      // Don't fallback to base64 for large files - return error instead
      if (file.size > RECOMMENDED_FILE_SIZE) {
        return NextResponse.json({ 
          error: `Upload failed. File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please use a smaller image or contact support.`,
          fileSize: file.size,
          maxSize: RECOMMENDED_FILE_SIZE
        }, { status: 400 })
      }
      
      // Only fallback to base64 for small files as a last resort
      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString("base64")
      const mime = file.type || "image/png"
      const dataUrl = `data:${mime};base64,${base64}`
      
      // Log the fallback in DB
      await supabase.from('uploads').insert({ 
        url: dataUrl, 
        file_name: file.name || "fallback.png", 
        execution_id: executionId || null,
        file_size: file.size,
        content_type: file.type,
        is_fallback: true
      })
      
      return NextResponse.json({ 
        url: dataUrl, 
        warning: "Using data URL fallback due to storage issues. This is not recommended for production.",
        fileSize: file.size
      })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 })
  }
}
