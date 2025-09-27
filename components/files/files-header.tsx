"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FolderOpen, Upload, Search, Filter, Grid, List } from "lucide-react"
import { FileUpload } from "./file-upload"
import { useFileManagerContext } from "@/components/providers/file-manager-provider"

export function FilesHeader() {
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const { stats, uploadFile, formatFileSize, refreshFiles, searchQuery, setSearchQuery } = useFileManagerContext()

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">File Manager</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Browse, manage, and organize your transformation files</p>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <Badge variant="outline" className="pulse-glow text-xs">
            <FolderOpen className="w-3 h-3 mr-1" />
            {formatFileSize(stats.storageUsed)} Used
          </Badge>

          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-4">
              <DialogHeader>
                <DialogTitle>Upload Files</DialogTitle>
              </DialogHeader>
              <FileUpload uploadFile={uploadFile} />
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-1 border rounded-lg p-1 self-start sm:self-center">
          <Button variant="ghost" size="sm">
            <Grid className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
