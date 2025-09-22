"use client"

import { useState } from "react"
import { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface FileWithPrompt {
  file: File
  prompt: string
  category?: string
  brand?: string
  n_countries?: number
  reach?: number
}

export default function TemplateUploader() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [filePrompts, setFilePrompts] = useState<FileWithPrompt[]>([])
  const [isUploading, setUploading] = useState(false)
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [source, setSource] = useState<"meta" | "youtube">("meta")

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
        prompt: defaultPrompt,
        category: "",
        brand: "",
        n_countries: undefined,
        reach: undefined
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

  const updateCategory = (index: number, category: string) => {
    setFilePrompts(prev => prev.map((fp, i) =>
      i === index ? { ...fp, category } : fp
    ))
  }

  const updateBrand = (index: number, brand: string) => {
    setFilePrompts(prev => prev.map((fp, i) =>
      i === index ? { ...fp, brand } : fp
    ))
  }

  const updateCountries = (index: number, n_countries: number) => {
    setFilePrompts(prev => prev.map((fp, i) =>
      i === index ? { ...fp, n_countries } : fp
    ))
  }

  const updateReach = (index: number, reach: number) => {
    setFilePrompts(prev => prev.map((fp, i) =>
      i === index ? { ...fp, reach } : fp
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
        fd.append("categories", fp.category || "")
        fd.append("brands", fp.brand || "")
        fd.append("n_countries", fp.n_countries?.toString() || "")
        fd.append("reaches", fp.reach?.toString() || "")
      })
      fd.append("source", source)

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
        <div className="mb-4">
          <Label className="text-gray-300 mb-2 block">Template Source</Label>
          <Select value={source} onValueChange={(v) => setSource(v as any)}>
            <SelectTrigger className="w-64 bg-gray-900 border-gray-700 text-white">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800 text-white">
              <SelectItem value="meta">Meta Ads Studio</SelectItem>
              <SelectItem value="youtube">YouTube Thumbnail Lab</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                  <p className="text-sm text-gray-400 mt-1">Fill in the details below to help organize and track this template's performance.</p>
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
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label htmlFor={`prompt-${index}`} className="text-gray-300 mb-2 block">Instructions for this template</Label>
                        <Textarea
                          id={`prompt-${index}`}
                          value={filePrompt.prompt}
                          onChange={(e) => updatePrompt(index, e.target.value)}
                          placeholder="Describe how the ad should look for this template..."
                          className="min-h-24 bg-gray-900 border-gray-700 text-white"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`category-${index}`} className="text-gray-300 mb-2 block">Category (for filtering)</Label>
                          <Input
                            id={`category-${index}`}
                            value={filePrompt.category || ""}
                            onChange={(e) => updateCategory(index, e.target.value)}
                            placeholder="e.g. Sale, Lifestyle, Tech, Beauty"
                            className="bg-gray-900 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`brand-${index}`} className="text-gray-300 mb-2 block">Brand (optional)</Label>
                          <Input
                            id={`brand-${index}`}
                            value={filePrompt.brand || ""}
                            onChange={(e) => updateBrand(index, e.target.value)}
                            placeholder="e.g. Nike, Apple, Coca-Cola"
                            className="bg-gray-900 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`countries-${index}`} className="text-gray-300 mb-2 block">Countries (optional)</Label>
                          <Input
                            id={`countries-${index}`}
                            type="number"
                            value={filePrompt.n_countries || ""}
                            onChange={(e) => updateCountries(index, parseInt(e.target.value) || 0)}
                            placeholder="Number of countries"
                            className="bg-gray-900 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`reach-${index}`} className="text-gray-300 mb-2 block">Reach (optional)</Label>
                          <Input
                            id={`reach-${index}`}
                            type="number"
                            value={filePrompt.reach || ""}
                            onChange={(e) => updateReach(index, parseInt(e.target.value) || 0)}
                            placeholder="Estimated reach"
                            className="bg-gray-900 border-gray-700 text-white"
                          />
                        </div>
                      </div>
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
