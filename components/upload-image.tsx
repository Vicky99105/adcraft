"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

// File size limits (should match server-side limits)
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const RECOMMENDED_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function UploadImage({
  file,
  onChange,
}: {
  file: File | null
  onChange: (file: File | null) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      setFileError(null)
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`)
      onChange(null)
      return
    }

    if (file.size > RECOMMENDED_FILE_SIZE) {
      setFileError(`Warning: File is large (${(file.size / (1024 * 1024)).toFixed(1)}MB). For best performance, use images under ${RECOMMENDED_FILE_SIZE / (1024 * 1024)}MB.`)
    } else {
      setFileError(null)
    }

    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file, onChange])

  const helper = useMemo(() => "PNG, JPG, or WebP up to 2MB. We'll upload it to Supabase Storage and pass a URL to your n8n workflow.", [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    onChange(f)
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="upload" className="text-gray-300">Your product image</Label>
        <div className="relative">
          <Input
            id="upload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex items-center justify-center px-4 py-2 bg-gray-900 border-2 border-gray-700 rounded-md text-white hover:bg-gray-800 transition-colors cursor-pointer">
            <span className="text-sm">Choose file</span>
            {file && <span className="ml-2 text-xs text-gray-400">({file.name})</span>}
          </div>
        </div>
        <p className="text-xs text-gray-400">{helper}</p>
        
        {file && (
          <p className="text-xs text-gray-300">
            File size: {(file.size / (1024 * 1024)).toFixed(1)}MB
          </p>
        )}
      </div>

      {fileError && (
        <Alert variant={fileError.includes('Warning') ? 'default' : 'destructive'} className="bg-gray-800 border-gray-600">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-gray-300">
            {fileError}
          </AlertDescription>
        </Alert>
      )}

      {preview && !fileError?.includes('too large') && (
        <div className="relative w-full max-w-md mx-auto">
          <div className="relative w-full h-64 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <Image
              src={preview || "/placeholder.svg"}
              alt="Uploaded preview"
              fill
              sizes="(max-width: 768px) 100vw, 448px"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
