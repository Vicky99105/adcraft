"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import TemplateUploader from "@/components/template-uploader"
import useSWR from "swr"
import type { Template } from "@/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function AdminPage() {
  const { data, mutate } = useSWR<{ templates: Template[] }>("/api/templates/list", fetcher)
  const templates = data?.templates || []

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">AdCraft</h1>
                      <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-black"
            >
            Back to App
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold mb-2 text-white">Template Library (Admin)</h2>
            <p className="text-gray-300">Upload and manage ad templates via Supabase</p>
          </div>
          
          <TemplateUploader />
          
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-white">Current Templates</h3>
            <div className="grid gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Template: {template.file_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-700">
                        <img 
                          src={template.url} 
                          alt={template.file_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-gray-300 mb-2 block">Current Prompt</Label>
                        <Textarea
                          value={template.prompt}
                          readOnly
                          className="min-h-24 bg-gray-900 border-gray-700 text-white"
                        />
                        <p className="text-sm text-gray-400 mt-2">
                          ID: {template.id} | Created: {new Date(template.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
