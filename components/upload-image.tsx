"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function UploadImage({
  file,
  onChange,
}: {
  file: File | null
  onChange: (file: File | null) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const helper = useMemo(() => "PNG or JPG up to ~10MB. We'll upload it and pass a URL to your n8n workflow.", [])

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="upload" className="text-gray-300">Your product image</Label>
        <Input
          id="upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0] || null
            onChange(f)
          }}
          className="bg-gray-700 border-gray-600 text-white"
        />
        <p className="text-xs text-gray-400">{helper}</p>
      </div>

      {preview && (
        <div className="relative w-full max-w-sm aspect-square overflow-hidden rounded-lg border border-gray-600">
          <Image
            src={preview || "/placeholder.svg"}
            alt="Uploaded preview"
            fill
            sizes="300px"
            className="object-cover"
          />
        </div>
      )}
    </div>
  )
}
