"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Eye, EyeOff, Settings, Lock, Edit3, Save, X } from "lucide-react"
import useSWR from "swr"
import type { Template } from "@/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123"

export default function SecureAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  
  const { data, mutate } = useSWR<{ templates: Template[] }>(
    isAuthenticated ? "/api/templates/list?include_hidden=true" : null, 
    fetcher
  )
  const templates = data?.templates || []
  
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
  const [promptValue, setPromptValue] = useState("")
  const [isSavingPrompt, setIsSavingPrompt] = useState(false)

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setPasswordError("")
    } else {
      setPasswordError("Invalid password")
    }
  }

  const handleTemplateSelect = (templateId: string, checked: boolean) => {
    if (checked) {
      setSelectedTemplates(prev => [...prev, templateId])
    } else {
      setSelectedTemplates(prev => prev.filter(id => id !== templateId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTemplates(templates.map(t => t.id))
    } else {
      setSelectedTemplates([])
    }
  }

  const handleBulkDelete = async () => {
    if (selectedTemplates.length === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedTemplates.length} template(s)? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/templates/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateIds: selectedTemplates })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Delete failed')
      }

      setSelectedTemplates([])
      mutate() // Refresh the list
      alert(`Successfully deleted ${result.deletedCount} template(s)`)
    } catch (error: any) {
      alert(`Delete failed: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleVisibility = async (templateId: string, currentVisibility: boolean) => {
    setIsUpdating(templateId)
    try {
      const response = await fetch('/api/templates/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          templateId, 
          isVisible: !currentVisibility 
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Update failed')
      }

      mutate() // Refresh the list
    } catch (error: any) {
      alert(`Update failed: ${error.message}`)
    } finally {
      setIsUpdating(null)
    }
  }

  const handleEditPrompt = (templateId: string, currentPrompt: string) => {
    setEditingPrompt(templateId)
    setPromptValue(currentPrompt)
  }

  const handleCancelEdit = () => {
    setEditingPrompt(null)
    setPromptValue("")
  }

  const handleSavePrompt = async (templateId: string) => {
    if (!promptValue.trim()) {
      alert("Prompt cannot be empty")
      return
    }

    setIsSavingPrompt(true)
    try {
      const response = await fetch('/api/templates/prompt', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          templateId, 
          prompt: promptValue.trim()
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Update failed')
      }

      setEditingPrompt(null)
      setPromptValue("")
      mutate() // Refresh the list
    } catch (error: any) {
      alert(`Update failed: ${error.message}`)
    } finally {
      setIsSavingPrompt(false)
    }
  }

  const visibleCount = templates.filter(t => t.is_visible !== false).length
  const hiddenCount = templates.length - visibleCount

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-600 rounded-full">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-white">Admin Access</CardTitle>
            <p className="text-gray-300">Enter password to access admin functions</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Enter admin password"
                />
                {passwordError && (
                  <p className="text-red-400 text-sm mt-1">{passwordError}</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Access Admin Panel
              </Button>
            </form>
            <div className="mt-6 text-center">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/admin'}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-black"
              >
                Back to Template Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">AdCraft</h1>
            <Badge variant="secondary" className="bg-red-600 text-white">
              <Settings className="w-3 h-3 mr-1" />
              Secure Admin Panel
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => window.location.href = '/admin'}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-black"
            >
              Template Upload
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
            <h2 className="text-3xl font-semibold mb-2 text-white">Template Management</h2>
            <p className="text-gray-300">Manage template visibility and delete templates</p>
            <div className="flex justify-center gap-4 mt-4">
              <Badge variant="outline" className="border-green-600 text-green-400">
                {visibleCount} Visible
              </Badge>
              <Badge variant="outline" className="border-orange-600 text-orange-400">
                {hiddenCount} Hidden
              </Badge>
            </div>
          </div>
          
          {/* Bulk Actions */}
          {templates.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center justify-between">
                  <span>Bulk Actions</span>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedTemplates.length === templates.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm text-gray-300">
                      Select All ({selectedTemplates.length}/{templates.length})
                    </label>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    onClick={handleBulkDelete}
                    disabled={selectedTemplates.length === 0 || isDeleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? "Deleting..." : `Delete Selected (${selectedTemplates.length})`}
                  </Button>
                </div>
                {selectedTemplates.length > 0 && (
                  <Alert className="mt-4 bg-orange-900 border-orange-700">
                    <AlertDescription className="text-orange-200">
                      Warning: Deleting templates will remove them from both the database and storage bucket. This action cannot be undone.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Templates Grid */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-white">All Templates</h3>
            {templates.length === 0 ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="text-center py-8">
                  <p className="text-gray-400">No templates found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className={`bg-gray-900 border-gray-800 ${template.is_visible === false ? 'opacity-60' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedTemplates.includes(template.id)}
                            onCheckedChange={(checked) => handleTemplateSelect(template.id, checked as boolean)}
                          />
                          <CardTitle className="text-sm text-white truncate">
                            {template.file_name}
                          </CardTitle>
                        </div>
                        {template.is_visible === false && (
                          <Badge variant="outline" className="border-orange-600 text-orange-400 text-xs">
                            Hidden
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-700">
                        <img 
                          src={template.url} 
                          alt={template.file_name}
                          className="w-full h-full object-contain bg-gray-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400">
                          ID: {template.id.substring(0, 8)}...
                        </p>
                        <p className="text-xs text-gray-400">
                          Created: {new Date(template.created_at).toLocaleDateString()}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-300 font-medium">Prompt:</p>
                            {editingPrompt !== template.id && (
                              <Button
                                onClick={() => handleEditPrompt(template.id, template.prompt)}
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-gray-400 hover:text-white hover:bg-gray-800"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          {editingPrompt === template.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={promptValue}
                                onChange={(e) => setPromptValue(e.target.value)}
                                className="min-h-16 text-xs bg-gray-800 border-gray-700 text-white"
                                placeholder="Enter prompt..."
                              />
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => handleSavePrompt(template.id)}
                                  disabled={isSavingPrompt}
                                  size="sm"
                                  className="h-6 px-2 bg-blue-600 hover:bg-blue-700"
                                >
                                  <Save className="w-3 h-3 mr-1" />
                                  {isSavingPrompt ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                  onClick={handleCancelEdit}
                                  disabled={isSavingPrompt}
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 border-gray-600 text-gray-300 hover:bg-gray-800"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-300 line-clamp-2">
                              {template.prompt}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleToggleVisibility(template.id, template.is_visible !== false)}
                          disabled={isUpdating === template.id || editingPrompt === template.id}
                          size="sm"
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          {template.is_visible === false ? (
                            <>
                              <Eye className="w-3 h-3 mr-1" />
                              {isUpdating === template.id ? "Updating..." : "Show"}
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 mr-1" />
                              {isUpdating === template.id ? "Updating..." : "Hide"}
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
