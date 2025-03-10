"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  ChevronRight,
  File as FileIcon,
  MoreVertical,
  FileText,
  Image as ImageIcon,
  FileCode,
  Plus,
  Upload,
  Folder,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface FileItem {
  id: string;
  name: string;
  type: string;
  path: string;
  preview?: string;
}

export interface FolderType {
  id: string;
  name: string;
  type: "assembly" | "part";
  parentId?: string;
  path: string;
}

interface FileListProps {
  files: FileItem[];
  folders: FolderType[];
  currentPath: string;
  onNavigate: (path: string) => void;
  onRename: (item: FileItem | FolderType, newName: string) => void;
  onDelete: (item: FileItem | FolderType) => void;
  onUpload: (files: FileList) => void;
  onCreateFolder: (name: string, type: "assembly" | "part", parentId?: string) => void;
  onMoveItem: (itemId: string, isFolder: boolean, newParentId: string) => void;
  onSelectFile: (file: FileItem | null) => void;
  selectedFile: FileItem | null;
}

function isFolderItem(item: FileItem | FolderType): item is FolderType {
  return "type" in item && (item.type === "assembly" || item.type === "part");
}

const ALLOWED_FILE_TYPES = [
  '.step', '.stp',  // STEP files
  '.stl',           // STL files
  '.3mf',           // 3MF files
  '.pdf',           // PDF files
  '.png', '.jpg', '.jpeg', // Image files
  '.dxf'            // DXF files
];

export function FileList({
  files,
  folders,
  currentPath,
  onNavigate,
  onRename,
  onDelete,
  onUpload,
  onCreateFolder,
  onMoveItem,
  onSelectFile,
  selectedFile,
}: FileListProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [newFolderType, setNewFolderType] = useState<"assembly" | "part">("assembly");
  const [newFolderParentId, setNewFolderParentId] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetFolder?: FolderType) => {
    e.preventDefault();
    e.stopPropagation();

    if (!targetFolder) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const validFiles = droppedFiles.filter(file => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        return ALLOWED_FILE_TYPES.includes(extension);
      });

      if (validFiles.length !== droppedFiles.length) {
        setErrorMessage(
          "Some files were not uploaded. Only STEP, STL, 3MF, PDF, PNG, JPG, and DXF files are allowed."
        );
        setShowErrorDialog(true);
      }

      if (validFiles.length > 0) {
        onUpload(validFiles as unknown as FileList);
      }
    } else {
      // Handling item move (folder/file)
      const draggedItemId = e.dataTransfer.getData("text/plain");
      const isFolder = e.dataTransfer.getData("isFolder") === "true";

      if (draggedItemId && targetFolder) {
        if (isFolder) {
          const sourceFolder = folders.find(f => f.id === draggedItemId);
          if (sourceFolder?.type === "assembly" && targetFolder.type === "part") {
            setErrorMessage("Cannot move an assembly into a part folder");
            setShowErrorDialog(true);
            return;
          }
        }
        onMoveItem(draggedItemId, isFolder, targetFolder.id);
      }
    }
  }, [onUpload, onMoveItem, folders]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(file => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        return ALLOWED_FILE_TYPES.includes(extension);
      });

      if (validFiles.length !== selectedFiles.length) {
        setErrorMessage(
          "Some files were not uploaded. Only STEP, STL, 3MF, PDF, PNG, JPG, and DXF files are allowed."
        );
        setShowErrorDialog(true);
      }

      if (validFiles.length > 0) {
        onUpload(validFiles as unknown as FileList);
      }
      // Reset the input so user can upload again if they want
      e.target.value = "";
    }
  };

  const handleDragStart = useCallback((e: React.DragEvent, item: FileItem | FolderType) => {
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.setData("isFolder", isFolderItem(item).toString());
  }, []);

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "image":
        return <ImageIcon className="h-4 w-4 text-muted-foreground" />;
      case "step":
      case "3mf":
      case "dxf":
      case "stl":
        return <FileCode className="h-4 w-4 text-muted-foreground" />;
      default:
        return <FileIcon className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const parentFolder = newFolderParentId ? folders.find(f => f.id === newFolderParentId) : null;
      if (parentFolder?.type === "part" && newFolderType === "assembly") {
        setErrorMessage("Cannot create an assembly inside a part folder");
        setShowErrorDialog(true);
        return;
      }

      onCreateFolder(newFolderName, newFolderType, newFolderParentId);
      setNewFolderName("");
      setShowNewFolderDialog(false);
    }
  };

  const renderItem = (item: FileItem | FolderType, level: number = 0) => {
    const isFolder = isFolderItem(item);
    const isExpanded = isFolder && expandedFolders.has(item.id);
    const isSelected = !isFolder && selectedFile?.id === item.id;

    return (
      <div key={item.id}>
        <div
          className={`flex items-center py-1 px-2 text-sm select-none group hover:bg-accent/50 ${
            isSelected ? "bg-accent text-accent-foreground" : ""
          }`}
          style={{ paddingLeft: `${level * 12 + 4}px` }}
          onClick={() => (isFolder ? toggleFolder(item.id) : onSelectFile(item))}
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, isFolder ? (item as FolderType) : undefined)}
        >
          {isFolder && (
            <ChevronRight
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          )}
          {isFolder ? (
            <div className="flex items-center gap-2">
              <span className="ml-1 text-xs font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                {(item as FolderType).type === "assembly" ? "ASM" : "PRT"}
              </span>
              <span className="truncate">{item.name}</span>
            </div>
          ) : (
            <>
              {getFileIcon((item as FileItem).type)}
              <span className="ml-1.5 truncate">{item.name}</span>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isFolder && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setNewFolderType("assembly");
                      setNewFolderParentId(item.id);
                      setShowNewFolderDialog(true);
                    }}
                  >
                    Add Assembly
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setNewFolderType("part");
                      setNewFolderParentId(item.id);
                      setShowNewFolderDialog(true);
                    }}
                  >
                    Add Part
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onClick={() => {
                  const newName = prompt("Enter new name:", item.name);
                  if (newName) onRename(item, newName);
                }}
              >
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(item)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isFolder && isExpanded && (
          <div>
            {folders
              .filter(f => f.parentId === item.id)
              .map(folder => renderItem(folder, level + 1))}
            {files
              .filter(f => {
                const parentPath = f.path.substring(0, f.path.lastIndexOf('/')) || '/';
                return parentPath === (item as FolderType).path;
              })
              .map(file => renderItem(file, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top bar with logo (bigger) */}
      <div className="p-4 flex items-center justify-between">
        <img src="/logo.svg" alt="Logo" className="h-24 w-24" />
      </div>

      {/* Buttons + Tooltip in the same line */}
      <div className="p-2 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setNewFolderType("assembly");
            setNewFolderParentId(undefined);
            setShowNewFolderDialog(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Assembly
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setNewFolderType("part");
            setNewFolderParentId(undefined);
            setShowNewFolderDialog(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Part
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-1" />
          Upload
        </Button>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHelpDialog(true)}
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create assemblies, parts, and upload files</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-2">
          {folders
            .filter(f => !f.parentId || f.parentId === "/")
            .map(folder => renderItem(folder))}
          {files
            .filter(f => {
              const parentPath = f.path.substring(0, f.path.lastIndexOf('/')) || '/';
              return parentPath === '/';
            })
            .map(file => renderItem(file))}
        </div>
      </div>

      {/* Dialog for creating new folder (assembly or part) */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create New {newFolderType === "assembly" ? "Assembly" : "Part"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Input
                id="name"
                placeholder={`${newFolderType === "assembly" ? "Assembly" : "Part"} name`}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewFolderDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invalid Operation</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowErrorDialog(false)}>
              OK
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Help dialog (triggered by the HelpCircle icon) */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>File Management Help</DialogTitle>
            <DialogDescription>
              Learn how to use the file management tools
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Assembly (ASM)</h4>
                <p className="text-sm text-muted-foreground">
                  Create a new assembly folder. Assemblies can contain other assemblies and parts.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Part (PRT)</h4>
                <p className="text-sm text-muted-foreground">
                  Create a new part folder. Parts are the basic building blocks and cannot contain assemblies.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Upload</h4>
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">Upload files to your current location.</p>
                  <div>
                    <span className="block mb-2">Supported formats:</span>
                    <ul className="list-disc list-inside">
                      <li>STEP files (.step, .stp)</li>
                      <li>STL files (.stl)</li>
                      <li>3MF files (.3mf)</li>
                      <li>PDF files (.pdf)</li>
                      <li>Images (.png, .jpg, .jpeg)</li>
                      <li>DXF files (.dxf)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHelpDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".step,.stp,.stl,.3mf,.pdf,.png,.jpg,.jpeg,.dxf"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
