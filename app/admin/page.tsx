"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Upload } from "lucide-react"
import TemplateUploader from "@/components/template-uploader"

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">AdCraft</h1>
            <Badge variant="secondary" className="bg-green-600 text-white">
              <Upload className="w-3 h-3 mr-1" />
              Template Upload
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => window.location.href = '/admin/secure'}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-black"
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin Panel
            </Button>
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-black"
            >
              Back to App
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold mb-2 text-white">Upload Templates</h2>
            <p className="text-gray-300">Add new ad templates to the library</p>
          </div>
          
          <TemplateUploader />
        </div>
      </main>
    </div>
  )
}
