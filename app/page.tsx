"use client";

import { useState, useRef } from 'react';
import { FileList } from './components/FileList';
import { FileInfo } from './components/FileInfo';
import { ChatPanel, type ChatPanelHandle } from './components/ChatPanel';
import { FileViewer } from './components/FileViewer';
import { FileItem, FolderType } from './components/FileList';
import { v4 as uuidv4 } from 'uuid';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { toast } from "sonner";

export default function Home() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const chatPanelRef = useRef<ChatPanelHandle>(null);

  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'step':
        return 'step';
      case '3mf':
        return '3mf';
      case 'dxf':
        return 'dxf';
      case 'stl':
        return 'stl';
      case 'pdf':
        return 'pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'image';
      default:
        return 'image';
    }
  };

  const handleUpload = (fileList: FileList) => {
    const newFiles: FileItem[] = Array.from(fileList).map(file => {
      const preview = URL.createObjectURL(file);
      return {
        id: uuidv4(),
        name: file.name,
        type: getFileType(file.name),
        path: `${currentPath}${currentPath === '/' ? '' : '/'}${file.name}`,
        preview,
        metadata: {
          size: file.size,
          lastModified: new Date(file.lastModified),
          created: new Date(),
          materials: [],
          processes: [],
          specifications: {},
          quality: {
            inspectionRequired: false,
            certificationRequired: false,
            standards: []
          }
        }
      };
    });

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleCreateFolder = (name: string, type: 'assembly' | 'part', parentId?: string) => {
    const parentFolder = parentId ? folders.find(f => f.id === parentId) : null;
    
    if (parentFolder?.type === 'part' && type === 'assembly') {
      toast.error("Cannot create an assembly inside a part");
      return;
    }
    
    const parentPath = parentFolder ? parentFolder.path : '/';
    
    const newFolder: FolderType = {
      id: uuidv4(),
      name,
      type,
      parentId: parentId || '/',
      path: `${parentPath}${parentPath === '/' ? '' : '/'}${name}`,
      lastModified: new Date()
    };

    setFolders(prev => [...prev, newFolder]);
  };

  const handleRename = (item: FileItem | FolderType, newName: string) => {
    if ('metadata' in item) { // FileItem
      setFiles(prev => prev.map(file => {
        if (file.id === item.id) {
          const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
          return {
            ...file,
            name: newName,
            path: `${parentPath}/${newName}`
          };
        }
        return file;
      }));
    } else { // FolderType
      const oldPath = item.path;
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
      const newPath = `${parentPath}/${newName}`;

      setFolders(prev => {
        const updatedFolders = prev.map(folder => {
          if (folder.id === item.id) {
            return { ...folder, name: newName, path: newPath };
          }
          if (folder.path.startsWith(oldPath + '/')) {
            return {
              ...folder,
              path: newPath + folder.path.substring(oldPath.length)
            };
          }
          return folder;
        });
        return updatedFolders;
      });

      setFiles(prev => prev.map(file => {
        if (file.path.startsWith(oldPath + '/')) {
          return {
            ...file,
            path: newPath + file.path.substring(oldPath.length)
          };
        }
        return file;
      }));
    }
  };

  const handleDelete = (item: FileItem | FolderType) => {
    if ('metadata' in item) { // FileItem
      setFiles(prev => prev.filter(file => file.id !== item.id));
      if (selectedFile?.id === item.id) {
        setSelectedFile(null);
      }
    } else { // FolderType
      const folderPath = item.path;
      setFolders(prev => prev.filter(folder => !folder.path.startsWith(folderPath)));
      setFiles(prev => prev.filter(file => !file.path.startsWith(folderPath)));
    }
  };

  const handleMoveItem = (itemId: string, isFolder: boolean, newParentId: string) => {
    const targetFolder = folders.find(f => f.id === newParentId);
    if (!targetFolder) return;

    if (isFolder) {
      const sourceFolder = folders.find(f => f.id === itemId);
      if (!sourceFolder) return;

      if (sourceFolder.type === 'assembly' && targetFolder.type === 'part') {
        toast.error("Cannot move an assembly into a part");
        return;
      }

      const oldPath = sourceFolder.path;
      const newPath = `${targetFolder.path}/${sourceFolder.name}`;

      setFolders(prev => prev.map(folder => {
        if (folder.id === itemId) {
          return { ...folder, parentId: newParentId, path: newPath };
        }
        if (folder.path.startsWith(oldPath + '/')) {
          return {
            ...folder,
            path: newPath + folder.path.substring(oldPath.length)
          };
        }
        return folder;
      }));

      setFiles(prev => prev.map(file => {
        if (file.path.startsWith(oldPath + '/')) {
          return {
            ...file,
            path: newPath + file.path.substring(oldPath.length)
          };
        }
        return file;
      }));
    } else {
      const file = files.find(f => f.id === itemId);
      if (!file) return;

      setFiles(prev => prev.map(f => {
        if (f.id === itemId) {
          return {
            ...f,
            path: `${targetFolder.path}/${f.name}`
          };
        }
        return f;
      }));
    }
  };

  return (
    <div className="h-screen bg-background">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={15} minSize={10}>
          <FileList
            files={files}
            folders={folders}
            currentPath={currentPath}
            onNavigate={setCurrentPath}
            onRename={handleRename}
            onDelete={handleDelete}
            onUpload={handleUpload}
            onCreateFolder={handleCreateFolder}
            onMoveItem={handleMoveItem}
            onSelectFile={setSelectedFile}
            selectedFile={selectedFile}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={60}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={65} minSize={30}>
              <div className="h-full p-4">
                <FileViewer 
                  file={selectedFile} 
                  chatPanel={{
                    addImageMessage: (image: string) => {
                      if (chatPanelRef.current) {
                        chatPanelRef.current.addImageMessage(image);
                      }
                    }
                  }}
                />
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={35} minSize={25}>
              <div className="h-full overflow-hidden">
                <FileInfo file={selectedFile} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={25}>
          <ChatPanel ref={chatPanelRef} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}