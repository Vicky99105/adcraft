"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadImage } from "@/components/upload-image"
import { ChevronLeft, ChevronRight, Home } from "lucide-react"
import type { Template } from "@/types"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileData, setFileData] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
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
  }, [])

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
    // Set navigation flag to preserve state
    sessionStorage.setItem('navigating', 'true')
    window.location.href = '/public/templates'
  }

  const handleHome = () => {
    // Restart: reset everything and go back to template selection
    sessionStorage.clear()
    window.location.href = '/public/templates'
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">AdCraft</h1>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleBack} 
                className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-black"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              {(file || (fileData?.uploaded && fileData?.url)) && (
                <Button 
                  onClick={handleNext}
                  disabled={isUploading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                >
                  {isUploading ? 'Uploading...' : 'Modify Prompts'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={handleHome}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-black"
            >
              <Home className="w-4 h-4 mr-2" />
              Restart
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold mb-2 text-white">Add Product Image</h2>
            <p className="text-gray-300">Upload the product image you want to feature in your ads</p>
          </div>
          
          <Card className="max-w-2xl mx-auto bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">Upload your product image</CardTitle>
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
