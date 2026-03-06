'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { getProjectBySlug } from '@/lib/portal-utils'
import { getClientConfig } from '@/lib/client-portal-config'

interface UploadedFile {
  name: string
  category: string
  size: number
  created_at: string
  path: string
  url: string | null
}

const CATEGORIES = [
  { value: 'logos', label: 'Logos & Brand Files', icon: '🎨', desc: 'Logo files, brand guide, fonts' },
  { value: 'photos', label: 'Product Photography', icon: '📸', desc: 'Product shots, lifestyle images' },
  { value: 'packaging', label: 'Packaging & Labels', icon: '📦', desc: 'Box designs, label files, mockups' },
  { value: 'content', label: 'Social & Marketing', icon: '📱', desc: 'Social media assets, marketing copy' },
  { value: 'documents', label: 'Documents', icon: '📄', desc: 'Business docs, specs, notes' },
  { value: 'general', label: 'Other', icon: '📎', desc: 'Anything else' },
]

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function AssetsPage() {
  const params = useParams()
  const clientSlug = params.clientSlug as string
  const config = getClientConfig(clientSlug)

  const [projectId, setProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('logos')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load project
  useEffect(() => {
    async function load() {
      try {
        const data = await getProjectBySlug(clientSlug)
        if (data) {
          setProjectId(data.project.id)
          await loadFiles(data.project.id)
        }
      } catch (err) {
        console.error('Failed to load project:', err)
        setError('Failed to load project data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clientSlug])

  async function loadFiles(pid: string) {
    try {
      const res = await fetch(`/api/assets?projectId=${pid}`)
      const data = await res.json()
      if (data.files) {
        setFiles(data.files)
      }
    } catch {
      console.error('Failed to load files')
    }
  }

  const handleUpload = useCallback(async (fileList: FileList) => {
    if (!projectId || fileList.length === 0) return

    setUploading(true)
    setError(null)
    setSuccess(null)

    const results: string[] = []

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      setUploadProgress(`Uploading ${file.name} (${i + 1}/${fileList.length})...`)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('category', selectedCategory)

      try {
        const res = await fetch('/api/assets', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (data.success) {
          results.push(file.name)
        } else {
          setError(`Failed to upload ${file.name}: ${data.error}`)
        }
      } catch {
        setError(`Failed to upload ${file.name}`)
      }
    }

    setUploading(false)
    setUploadProgress(null)

    if (results.length > 0) {
      setSuccess(`Uploaded ${results.length} file${results.length > 1 ? 's' : ''} successfully`)
      await loadFiles(projectId)
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [projectId, selectedCategory])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }, [handleUpload])

  const handleDelete = async (path: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return
    try {
      await fetch('/api/assets', {
        method: 'DELETE',
        body: JSON.stringify({ path }),
      })
      if (projectId) await loadFiles(projectId)
    } catch {
      setError('Failed to delete file')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: config.primaryColor,
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#888', fontSize: 14 }}>Loading...</p>
      </div>
    )
  }

  const groupedFiles = CATEGORIES.map(cat => ({
    ...cat,
    files: files.filter(f => f.category === cat.value),
  })).filter(cat => cat.files.length > 0)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#FAFAFA' }}>
          Upload Assets
        </h1>
        <p style={{ margin: '8px 0 0', color: '#888', fontSize: 14 }}>
          Send us your logos, photos, and brand files — everything we need for your project.
        </p>
      </div>

      {/* What We Need Banner */}
      <div
        style={{
          padding: 24,
          background: `linear-gradient(135deg, ${config.primaryColor}15, ${config.accentColor}10)`,
          border: `1px solid ${config.primaryColor}33`,
          borderRadius: 16,
          marginBottom: 32,
        }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: '#FAFAFA' }}>
          What we need from you:
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
          {config.assetRequests.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '8px 12px',
                background: item.priority ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderRadius: 8,
                border: item.priority ? `1px solid ${config.primaryColor}22` : '1px solid transparent',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon === 'palette' ? '\u{1F3A8}' : item.icon === 'camera' ? '\u{1F4F8}' : item.icon === 'file' ? '\u{1F4C4}' : item.icon === 'image' ? '\u{1F5BC}\uFE0F' : item.icon === 'box' ? '\u{1F4E6}' : item.icon === 'pen' ? '\u{270D}\uFE0F' : '\u{1F4CB}'}</span>
              <span style={{ fontSize: 13, color: item.priority ? '#CCC' : '#888', lineHeight: 1.4 }}>
                {item.title}: {item.description}
                {item.priority && (
                  <span style={{ color: config.primaryColor, fontSize: 11, marginLeft: 6 }}>PRIORITY</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8, letterSpacing: '0.1em' }}>
          FILE CATEGORY
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              style={{
                padding: '10px 16px',
                background: selectedCategory === cat.value ? `${config.primaryColor}25` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedCategory === cat.value ? config.primaryColor + '66' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 10,
                color: selectedCategory === cat.value ? config.primaryColor : '#888',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s ease',
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: 48,
          border: `2px dashed ${dragOver ? config.primaryColor : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 16,
          background: dragOver ? `${config.primaryColor}10` : 'rgba(255,255,255,0.02)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          marginBottom: 24,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.zip,.svg,.ai,.psd,.eps"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />

        {uploading ? (
          <div>
            <div
              style={{
                width: 40,
                height: 40,
                border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: config.primaryColor,
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ color: config.primaryColor, fontSize: 14, margin: 0 }}>
              {uploadProgress}
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              {dragOver ? '📥' : '📤'}
            </div>
            <p style={{ color: '#FAFAFA', fontSize: 16, fontWeight: 500, margin: '0 0 4px' }}>
              {dragOver ? 'Drop files here' : 'Drag & drop files or click to browse'}
            </p>
            <p style={{ color: '#666', fontSize: 12, margin: 0 }}>
              PNG, JPG, SVG, PDF, ZIP — up to 50MB per file
            </p>
          </>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid rgba(255, 0, 0, 0.3)',
          borderRadius: 8,
          color: '#FF6B6B',
          fontSize: 13,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px 16px',
          background: `${config.primaryColor}15`,
          border: `1px solid ${config.primaryColor}33`,
          borderRadius: 8,
          color: config.primaryColor,
          fontSize: 13,
          marginBottom: 16,
        }}>
          {success}
        </div>
      )}

      {/* Uploaded Files */}
      {groupedFiles.length > 0 ? (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#FAFAFA', margin: '32px 0 16px' }}>
            Uploaded Files
          </h2>
          {groupedFiles.map(group => (
            <div key={group.value} style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 13, fontWeight: 500, color: '#888', margin: '0 0 12px', letterSpacing: '0.05em' }}>
                {group.icon} {group.label} ({group.files.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {group.files.map((file, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 16,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                    }}
                  >
                    {/* Preview for images */}
                    {file.url && file.name.match(/\.(png|jpg|jpeg|gif|webp|svg)/i) ? (
                      <div
                        style={{
                          width: '100%',
                          height: 120,
                          borderRadius: 8,
                          marginBottom: 10,
                          background: `url(${file.url}) center/cover no-repeat`,
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: 60,
                          borderRadius: 8,
                          marginBottom: 10,
                          background: 'rgba(255,255,255,0.02)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24,
                        }}
                      >
                        📄
                      </div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#CCC', wordBreak: 'break-word' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                      {formatBytes(file.size)}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      {file.url && (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 11,
                            color: config.primaryColor,
                            textDecoration: 'none',
                          }}
                        >
                          View ↗
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(file.path, file.name)}
                        style={{
                          fontSize: 11,
                          color: '#666',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <p style={{ color: '#666', fontSize: 14, margin: 0 }}>
            No files uploaded yet. Drop your first file above to get started.
          </p>
        </div>
      )}
    </div>
  )
}
