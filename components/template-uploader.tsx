"use client"

import { useState } from "react"
import { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FileWithPrompt {
  file: File
  prompt: string
}

export default function TemplateUploader() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [filePrompts, setFilePrompts] = useState<FileWithPrompt[]>([])
  const [isUploading, setUploading] = useState(false)
  const [showPromptEditor, setShowPromptEditor] = useState(false)

  const defaultPrompt = "Place the uploaded product onto this template image as a realistic ad composite. Keep aspect ratio and add soft shadow."

  // For convenience, refresh the list after upload
  const refresh = () => {
    mutate("/api/templates/list")
  }

  const handleFileSelection = (fileList: FileList | null) => {
    setFiles(fileList)
    if (fileList) {
      const newFilePrompts: FileWithPrompt[] = Array.from(fileList).map(file => ({
        file,
        prompt: defaultPrompt
      }))
      setFilePrompts(newFilePrompts)
      setShowPromptEditor(true)
    }
  }

  const updatePrompt = (index: number, prompt: string) => {
    setFilePrompts(prev => prev.map((fp, i) => 
      i === index ? { ...fp, prompt } : fp
    ))
  }

  async function onUpload() {
    if (!filePrompts || filePrompts.length === 0) return
    setUploading(true)
    try {
      const fd = new FormData()
      filePrompts.forEach((fp) => {
        fd.append("files", fp.file)
        fd.append("prompts", fp.prompt)
      })
      
      const res = await fetch("/api/templates/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Upload failed")
      
      // Reset state
      setFiles(null)
      setFilePrompts([])
      setShowPromptEditor(false)
      refresh()
    } catch (e) {
      console.error("[v0] template upload error:", e)
      alert((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setFiles(null)
    setFilePrompts([])
    setShowPromptEditor(false)
    ;(document.getElementById("template-file-input") as HTMLInputElement | null)?.value &&
      ((document.getElementById("template-file-input") as HTMLInputElement).value = "")
  }

  return (
    <div className="space-y-6">
      {/* File Selection */}
      <div className="rounded-lg border border-gray-700 p-4 bg-gray-900">
        <h3 className="font-medium mb-2 text-white">Upload Template Images</h3>
        <p className="text-sm text-gray-300 mb-3">
          Select template images to upload. You'll be able to customize prompts for each template.
        </p>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <input
              id="template-file-input"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileSelection(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex items-center justify-center px-4 py-2 bg-gray-900 border-2 border-gray-700 rounded-md text-white hover:bg-gray-800 transition-colors cursor-pointer">
              <span className="text-sm">Choose files</span>
              {files && <span className="ml-2 text-xs text-gray-400">({files.length} selected)</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Editor */}
      {showPromptEditor && filePrompts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Customize Prompts</h3>
          <p className="text-sm text-gray-300">
            Set specific instructions for each template before uploading.
          </p>
          
          <div className="grid gap-4">
            {filePrompts.map((filePrompt, index) => (
              <Card key={index} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Template {index + 1}: {filePrompt.file.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-700">
                      <img 
                        src={URL.createObjectURL(filePrompt.file)} 
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`prompt-${index}`} className="text-gray-300 mb-2 block">Instructions for this template</Label>
                      <Textarea
                        id={`prompt-${index}`}
                        value={filePrompt.prompt}
                        onChange={(e) => updatePrompt(index, e.target.value)}
                        placeholder="Describe how the ad should look for this template..."
                                                  className="min-h-24 bg-gray-900 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={onUpload}
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? "Uploading..." : "Upload Templates"}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={isUploading}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-black"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
