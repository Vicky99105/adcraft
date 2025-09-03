"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TemplatePicker } from "@/components/template-picker"
import { UploadImage } from "@/components/upload-image"
import { ResultGrid } from "@/components/result-grid"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import useSWR from "swr"
import type { TriggerResponse, Template } from "@/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Step = 'templates' | 'upload' | 'prompts' | 'results'

interface TemplateWithPrompt {
  url: string
  prompt: string
}

export default function HomePage() {
  const { data, mutate } = useSWR<{ templates: Template[] }>("/api/templates/list", fetcher)
  const templates = data?.templates || []

  const [currentStep, setCurrentStep] = useState<Step>('templates')
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [templatePrompts, setTemplatePrompts] = useState<TemplateWithPrompt[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [resp, setResp] = useState<TriggerResponse | null>(null)
  // Use environment variable for webhook URL
  const webhookUrl = process.env.N8N_WEBHOOK_URL

  const defaultPrompt = "Place the uploaded product onto each template image as a realistic ad composite. Keep aspect ratio and add soft shadow."

  // Initialize prompts when templates are selected
  const initializePrompts = (templates: Template[]) => {
    setTemplatePrompts(templates.map(template => ({ url: template.url, prompt: template.prompt })))
  }

  const handleTemplateSelection = (templates: Template[]) => {
    setSelectedTemplates(templates)
    initializePrompts(templates)
  }

  const handleNext = () => {
    if (currentStep === 'templates' && selectedTemplates.length > 0) {
      setCurrentStep('upload')
    } else if (currentStep === 'upload' && file) {
      setCurrentStep('prompts')
    }
  }

  const handleBack = () => {
    if (currentStep === 'upload') {
      setCurrentStep('templates')
    } else if (currentStep === 'prompts') {
      setCurrentStep('upload')
    } else if (currentStep === 'results') {
      setCurrentStep('prompts')
    }
  }

  const handleGenerate = async () => {
    if (!file || templatePrompts.length === 0) return
    
    setSubmitting(true)
    setCurrentStep('results')
    setResp(null)

    try {
      // 0) Create an execution first
      const execRes = await fetch('/api/executions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          templates: selectedTemplates.map(t => t.url),
          prompts: selectedTemplates.map(t => t.prompt)
        }),
      })
      const execJson = await execRes.json()
      if (!execRes.ok || !execJson?.execution_id) {
        throw new Error(execJson?.error || 'Failed to create execution')
      }
      const executionId: string = execJson.execution_id

      // 1) Upload product image
      const form = new FormData()
      form.append("file", file)
      const uploadRes = await fetch(`/api/upload?execution_id=${encodeURIComponent(executionId)}`, { method: "POST", body: form })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok) {
        // Handle upload errors with more detail
        const errorMessage = uploadJson?.error || "Upload failed"
        if (uploadJson?.fileSize && uploadJson?.maxSize) {
          throw new Error(`${errorMessage} (File: ${(uploadJson.fileSize / (1024 * 1024)).toFixed(1)}MB, Max: ${uploadJson.maxSize / (1024 * 1024)}MB)`)
        }
        throw new Error(errorMessage)
      }
      
      // Show warning if using fallback
      if (uploadJson?.warning) {
        console.warn("Upload warning:", uploadJson.warning)
      }
      
      const userImageUrl: string = uploadJson.url

      // 2) Trigger n8n webhook with templates and prompts array
      const triggerRes = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templates: templatePrompts, // Array of {url, prompt}
          userImageUrl,
          webhookUrl: webhookUrl,
          execution_id: executionId,
        }),
      })
      const triggerJson = await triggerRes.json()

      // 3) Upload results to Supabase
      if (triggerRes.ok && triggerJson) {
        try {
          const resultsUploadRes = await fetch("/api/results/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              results: triggerJson,
              metadata: {
                templates: selectedTemplates,
                userImageUrl,
                templatePrompts,
                timestamp: new Date().toISOString(),
                execution_id: executionId,
              },
            }),
          })

          if (resultsUploadRes.ok) {
            const uploadData = await resultsUploadRes.json()
            console.log(`Uploaded ${uploadData.count} results to Supabase`)
          }
        } catch (uploadErr) {
          console.error("Failed to upload results to Supabase:", uploadErr)
        }
      }

      setResp({
        ok: triggerRes.ok,
        data: triggerJson,
        error: triggerRes.ok ? undefined : triggerJson?.error || "Workflow error",
      })
    } catch (err: any) {
      setResp({ ok: false, error: err?.message || "Something went wrong" })
    } finally {
      setSubmitting(false)
    }
  }

  const updateTemplatePrompt = (url: string, prompt: string) => {
    setTemplatePrompts(prev => 
      prev.map(tp => tp.url === url ? { ...tp, prompt } : tp)
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">AdCraft</h1>
          <div className="flex items-center gap-4">
            {currentStep === 'templates' && selectedTemplates.length > 0 && (
              <Button 
                onClick={handleNext} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                Generate Ads
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            {currentStep === 'upload' && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800">
                  Back
                </Button>
                {file && (
                  <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
                    Modify Prompts
                  </Button>
                )}
              </div>
            )}
            {currentStep === 'prompts' && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800">
                  Back
                </Button>
                <Button 
                  onClick={handleGenerate} 
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? "Generating..." : "Generate Ads"}
                </Button>
              </div>
            )}
            {currentStep === 'results' && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800">
                  Back
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCurrentStep('templates')
                    setSelectedTemplates([])
                    setFile(null)
                    setTemplatePrompts([])
                    setResp(null)
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Home
                </Button>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Step 1: Template Selection */}
        {currentStep === 'templates' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-semibold mb-2 text-white">Select Templates</h2>
              <p className="text-gray-300">Choose the ad templates you want to use</p>
            </div>
            
            <TemplatePicker 
              templates={templates} 
              selected={selectedTemplates} 
              onChange={handleTemplateSelection} 
            />
            
            {selectedTemplates.length > 0 && (
              <div className="text-center">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {selectedTemplates.length} template{selectedTemplates.length !== 1 ? 's' : ''} selected
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Product Upload */}
        {currentStep === 'upload' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-semibold mb-2 text-white">Add Product Image</h2>
              <p className="text-gray-300">Upload the product image you want to feature in your ads</p>
            </div>
            
            <Card className="max-w-2xl mx-auto bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Upload your product image</CardTitle>
              </CardHeader>
              <CardContent>
                <UploadImage file={file} onChange={setFile} />
              </CardContent>
            </Card>
            

          </div>
        )}

        {/* Step 3: Prompts */}
        {currentStep === 'prompts' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-semibold mb-2 text-white">Customize Prompts</h2>
              <p className="text-gray-300">Set specific instructions for each template</p>
            </div>
            
            <div className="grid gap-6 max-w-4xl mx-auto">
              {templatePrompts.map((template, index) => (
                <Card key={template.url} className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Template {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-600">
                        <img 
                          src={template.url} 
                          alt={`Template ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={`prompt-${index}`} className="text-gray-300 mb-2 block">Instructions for this template</Label>
                        <Textarea
                          id={`prompt-${index}`}
                          value={template.prompt}
                          onChange={(e) => updateTemplatePrompt(template.url, e.target.value)}
                          placeholder="Describe how the ad should look for this template..."
                          className="min-h-24 bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            

          </div>
        )}

        {/* Step 4: Results */}
        {currentStep === 'results' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-semibold mb-2 text-white">Generated Ads</h2>
              <p className="text-gray-300">Your AI-generated advertisements</p>
            </div>
            
            {resp && (
              <>
                {!resp.ok ? (
                  <Alert variant="destructive" className="bg-red-900 border-red-700 text-red-100">
                    <AlertTitle>Generation Error</AlertTitle>
                    <AlertDescription className="break-words">{resp.error || "Unknown error"}</AlertDescription>
                  </Alert>
                ) : (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResultGrid payload={resp.data} />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
            

          </div>
        )}
      </main>
    </div>
  )
}