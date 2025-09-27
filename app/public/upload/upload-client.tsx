"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadImage } from "@/components/upload-image"
import { ChevronLeft, ChevronRight, Home } from "lucide-react"
import type { Template } from "@/types"

type WorkflowSource = "meta" | "youtube"

type UploadClientProps = {
  initialSource: WorkflowSource
}

export function UploadClient({ initialSource }: UploadClientProps) {
  const [file, setFile] = useState<File | null>(null)
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileData, setFileData] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedSource, setSelectedSource] = useState<WorkflowSource>(initialSource)
  const hasHydrated = useRef(false)

  const persistSelectedSource = useCallback((source: WorkflowSource) => {
    try {
      sessionStorage.setItem('selectedSource', source)
      document.cookie = `selectedSource=${source}; path=/; max-age=604800; SameSite=Lax`
    } catch (error) {
      console.warn('Failed to persist selected source:', error)
    }
  }, [])

  useEffect(() => {
    if (hasHydrated.current) return
    hasHydrated.current = true

    // Load templates from sessionStorage
    const storedTemplates = sessionStorage.getItem('selectedTemplates')
    if (storedTemplates) {
      try {
        setSelectedTemplates(JSON.parse(storedTemplates))
      } catch (error) {
        console.error('Error parsing stored templates:', error)
        window.location.href = '/public/templates'
        return
      }
    } else {
      window.location.href = '/public/templates'
    }

    // Load existing file data from sessionStorage
    const storedFileData = sessionStorage.getItem('fileData')
    if (storedFileData) {
      try {
        const parsed = JSON.parse(storedFileData)
        setFileData(parsed)

        if (parsed?.url) {
          setPreviewUrl(parsed.url)
          setFile(null)
        }
      } catch (error) {
        console.error('Error parsing stored file data:', error)
      }
    }

    const storedSource = sessionStorage.getItem('selectedSource')
    if (storedSource === 'meta' || storedSource === 'youtube') {
      setSelectedSource(storedSource)
      persistSelectedSource(storedSource)
    } else {
      setSelectedSource(initialSource)
      persistSelectedSource(initialSource)
    }
  }, [initialSource, persistSelectedSource])

  const workflowCopy = useMemo(() => ({
    meta: {
      heading: "Add Product Image",
      subheading: "Upload the product image you want to feature in your ads",
      cardTitle: "Upload your product image",
      nextCta: "Modify Prompts",
    },
    youtube: {
      heading: "Add User Content",
      subheading: "Upload the content you want to transform into thumbnails",
      cardTitle: "Upload your user content",
      nextCta: "Modify Prompts",
    },
  }), [])

  const currentCopy = workflowCopy[selectedSource]
  const sourceLabel = selectedSource === "youtube" ? "Thumbnail Studio" : "Ads Studio"

  const persistFileData = useCallback((data: any | null) => {
    if (!data) {
      sessionStorage.removeItem('fileData')
      setFileData(null)
      return
    }

    setFileData(data)
    sessionStorage.setItem('fileData', JSON.stringify(data))
  }, [])

  const handleFileChange = (newFile: File | null) => {
    setFile(newFile)
    setPreviewUrl(null)

    if (newFile) {
      const nextData = {
        name: newFile.name,
        size: newFile.size,
        type: newFile.type,
        uploaded: false,
        url: null,
      }
      persistFileData(nextData)
    } else {
      persistFileData(null)
    }
  }

  const handleNext = async () => {
    if (isUploading) return

    const hasUploadedUrl = fileData?.uploaded && fileData?.url

    if (!file && !hasUploadedUrl) {
      alert('Please upload a product image before proceeding.')
      return
    }

    // If we already have an uploaded URL, skip reuploading
    if (hasUploadedUrl) {
      sessionStorage.setItem('navigating', 'true')
      window.location.href = '/public/prompts'
      return
    }

    if (!file) {
      alert('Something went wrong with the file upload. Please select the image again.')
      return
    }

    try {
      setIsUploading(true)

      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', sessionId)

      const uploadRes = await fetch('/api/file/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadJson = await uploadRes.json()

      if (!uploadRes.ok || !uploadJson?.url) {
        throw new Error(uploadJson?.error || 'Upload failed')
      }

      const uploadedData = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: uploadJson.url,
        fileName: uploadJson.fileName,
        filePath: uploadJson.filePath,
        sessionId: sessionId,
        uploaded: true,
        uploadId: uploadJson.uploadId || null,
      }

      persistFileData(uploadedData)
      setPreviewUrl(uploadJson.url)
      setFile(null)

      sessionStorage.setItem('navigating', 'true')
      window.location.href = '/public/prompts'
    } catch (error) {
      console.error('Failed to upload file before navigating:', error)
      alert('Failed to upload your image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleBack = () => {
    sessionStorage.setItem('navigating', 'true')
    window.location.href = '/public/templates'
  }

  const handleHome = () => {
    const sourceToPersist = selectedSource
    persistSelectedSource(sourceToPersist)
    sessionStorage.clear()
    persistSelectedSource(sourceToPersist)
    window.location.href = '/public/templates'
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-gray-900 border-b border-gray-800 fixed top-0 inset-x-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-end">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl md:text-4xl font-bold leading-none text-white">AdCraft</h1>
            <span className="text-xs font-semibold leading-none text-blue-200/90">{sourceLabel}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button 
                onClick={handleBack} 
                disabled={isUploading}
                className="disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              {(file || (fileData?.uploaded && fileData?.url)) && (
                <Button 
                  onClick={handleNext}
                  disabled={isUploading}
                  className={!isUploading ? "next-step-hint" : undefined}
                >
                  {isUploading ? 'Uploading...' : currentCopy.nextCta}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
            <Button 
              onClick={handleHome}
            >
              <Home className="w-4 h-4 mr-2" />
              Restart
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 pt-28 pb-24">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold mb-2 text-white">{currentCopy.heading}</h2>
            <p className="text-gray-300">{currentCopy.subheading}</p>
          </div>
          
          <Card className="max-w-2xl mx-auto bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">{currentCopy.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <UploadImage file={file} onChange={handleFileChange} previewUrl={previewUrl} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
