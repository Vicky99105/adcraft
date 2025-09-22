"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadImage } from "@/components/upload-image"
import { ChevronLeft, ChevronRight, Home } from "lucide-react"
import type { Template } from "@/types"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
        const fileData = JSON.parse(storedFileData)
        if (fileData.base64Data) {
          // Recreate the file object from stored data
          const mockFile = new File([''], fileData.name, { type: fileData.type })
          Object.defineProperty(mockFile, 'size', { value: fileData.size })
          
          setFile(mockFile)
          setPreviewUrl(fileData.base64Data)
        }
      } catch (error) {
        console.error('Error parsing stored file data:', error)
      }
    }
  }, [])

  const handleFileChange = (newFile: File | null) => {
    setFile(newFile)
    
    // Immediately update sessionStorage with new file data
    if (newFile) {
      const reader = new FileReader()
      reader.onload = () => {
        const base64DataUrl = reader.result as string
        const fileData = {
          name: newFile.name,
          size: newFile.size,
          type: newFile.type,
          base64Data: base64DataUrl,
          uploaded: false
        }
        sessionStorage.setItem('fileData', JSON.stringify(fileData))
        setPreviewUrl(base64DataUrl)
      }
      reader.readAsDataURL(newFile)
    } else {
      // Clear file data
      sessionStorage.removeItem('fileData')
      setPreviewUrl(null)
    }
  }

  const handleNext = () => {
    if (!file) {
      alert('Please upload a product image before proceeding.')
      return
    }
    
    // Set navigation flag and proceed
    sessionStorage.setItem('navigating', 'true')
    window.location.href = '/public/prompts'
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
              {file && (
                <Button 
                  onClick={handleNext} 
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Modify Prompts
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
