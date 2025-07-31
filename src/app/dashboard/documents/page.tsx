"use client";

import { useState, useCallback, useEffect, useRef, Fragment } from "react";
import { motion } from "framer-motion";
import { HiDocument, HiUpload, HiTrash, HiDownload, HiEye, HiPlus, HiX, HiOutlineDocumentText, HiFolder, HiChevronRight, HiHome, HiShare, HiRefresh, HiClock, HiUser, HiClipboard, HiClipboardCopy } from "react-icons/hi";
import { FaFilePdf, FaFileWord, FaFileExcel, FaFileCsv, FaFileAlt, FaFileImage } from "react-icons/fa";
import { MdDraw } from "react-icons/md";
import Button from "@/components/Button";
import { useDropzone } from "react-dropzone";

interface Document {
  id: string;
  name: string;
  title: string;
  size: string;
  type: string;
  uploadedAt: Date;
  url?: string;
}

type FolderNode = {
  name: string;
  files: File[];
  subfolders: { [name: string]: FolderNode };
};

// SharePoint-style Breadcrumb component (inline with Files title)
function SharePointBreadcrumb({ path, onNavigate, onDragOver, onDragLeave, onDrop, dragOverTarget }: { 
  path: string[]; 
  onNavigate: (index: number) => void;
  onDragOver: (e: React.DragEvent, targetPath: string[]) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetPath: string[]) => void;
  dragOverTarget: string | null;
}) {
  return (
    <div className="flex items-center space-x-2">
      {/* Path segments (starting from first subfolder) */}
      {path.map((segment, index) => {
        const targetPath = path.slice(0, index + 1);
        const isDragOver = dragOverTarget === targetPath.join('/');
        const isLast = index === path.length - 1;
        
        return (
          <Fragment key={index}>
            {/* Chevron separator */}
            <div className="flex items-center mx-2">
              <HiChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            
            {/* Path segment */}
            <button
              onClick={() => onNavigate(index)}
              onDragOver={(e) => onDragOver(e, targetPath)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, targetPath)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                isDragOver ? 'bg-blue-100 text-blue-700 border border-blue-300' : 
                isLast ? 'text-gray-900 bg-gray-50 border border-gray-200' :
                'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={`Go to ${segment}`}
            >
              <HiFolder className="w-4 h-4 text-blue-600" />
              <span className="truncate max-w-32">{segment}</span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

function buildFolderTree(files: File[]): FolderNode {
  const root: FolderNode = { name: '', files: [], subfolders: {} };
  files.forEach(file => {
    // @ts-ignore
    const relPath: string = file.webkitRelativePath || file.name;
    const parts = relPath.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current.files.push(file);
      } else {
        if (!current.subfolders[part]) {
          current.subfolders[part] = { name: part, files: [], subfolders: {} };
        }
        current = current.subfolders[part];
      }
    }
  });
  return root;
}

// Helper function to navigate to a specific path in the folder tree
function navigateToPath(root: FolderNode, path: string[]): FolderNode {
  let current = root;
  for (const segment of path) {
    if (current.subfolders[segment]) {
      current = current.subfolders[segment];
    } else {
      break;
    }
  }
  return current;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsTree, setDocumentsTree] = useState<FolderNode | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Initialize with some default files so folders don't disappear on refresh
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [displayFiles, setDisplayFiles] = useState<File[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [showFolderDropWarning, setShowFolderDropWarning] = useState(false);
  const folderWarningTimeout = useRef<NodeJS.Timeout | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Folder tree expand/collapse state
  const [expandedFolders, setExpandedFolders] = useState<{ [key: string]: boolean }>({});
  // Current navigation path
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  // File type filter
  const [activeFilter, setActiveFilter] = useState<'all' | 'documents' | 'drawings' | 'images'>('all');
  // Simple drag and drop state
  const [loading, setLoading] = useState(true);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    item: any;
    type: 'file' | 'folder';
  } | null>(null);

  // Clipboard state for copy/paste
  const [clipboard, setClipboard] = useState<{
    item: any;
    type: 'file' | 'folder';
    action: 'copy' | 'cut';
  } | null>(null);

  // Track cut items for visual feedback
  const [cutItems, setCutItems] = useState<Set<string>>(new Set());

  // Load files from SharePoint
  const loadFilesFromSharePoint = async () => {
    try {
      setLoading(true);
      console.log('Fetching files from SharePoint...');
      console.log('Current path:', currentPath.join('/'));
      
      // Check if SharePoint is configured
      const configResponse = await fetch('/api/sharepoint/check-config');
      const configData = await configResponse.json();
      
      if (!configData.success || (configData.status !== 'fully_configured' && configData.status !== 'basic_configured')) {
        console.log('SharePoint not configured, showing empty state');
        setDisplayFiles([]);
        return;
      }
      
      // Get the default drive ID from config
      const driveId = configData.config.driveId;
      if (!driveId) {
        console.log('No drive ID configured, showing empty state');
        setDisplayFiles([]);
        return;
      }
      
      // Load files from SharePoint
      const apiUrl = `/api/sharepoint?action=getItems&driveId=${driveId}&folderPath=${currentPath.join('/')}`;
      console.log('DEBUG: Calling API:', apiUrl);
      const response = await fetch(apiUrl);
      console.log('Load files response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('SharePoint response:', data);
        console.log('DEBUG: Response data type:', typeof data);
        console.log('DEBUG: Response has value property:', data.hasOwnProperty('value'));
        console.log('DEBUG: Value is array:', Array.isArray(data.value));
        console.log('DEBUG: Value length:', data.value ? data.value.length : 'undefined');
        
        const sharePointItems = data.value?.map((item: any) => {
          // Create a File-like object from SharePoint item
          const fileObj = {
            name: item.name,
            size: item.size || 1024,
            type: item.file?.mimeType || 'application/octet-stream',
            webkitRelativePath: item.name,
            id: item.id,
            webUrl: item.webUrl,
            downloadUrl: item['@microsoft.graph.downloadUrl'],
            isFolder: item.folder !== undefined,
            folder: item.folder,
            lastModifiedDateTime: item.lastModifiedDateTime || item.fileSystemInfo?.lastModifiedDateTime,
            lastModifiedBy: {
              user: {
                displayName: 'Chris Hart',
                email: 'chris@thinkcompl.ai'
              }
            },
            createdDateTime: item.createdDateTime,
            createdBy: {
              user: {
                displayName: 'Chris Hart',
                email: 'chris@thinkcompl.ai'
              }
            },
            fileSystemInfo: item.fileSystemInfo
          };
          return fileObj;
        }) || [];
        
        console.log('Setting display files:', sharePointItems.length, 'items');
        setDisplayFiles(sharePointItems);
      } else {
        const errorText = await response.text();
        console.error('Failed to load files from SharePoint:', response.status, errorText);
        setDisplayFiles([]);
      }
    } catch (error) {
      console.error('Error loading files from SharePoint:', error);
      setDisplayFiles([]);
    } finally {
      setLoading(false);
      console.log('Load files completed');
    }
  };

  // Simple move function
  const moveItem = async (itemName: string, targetPath: string[]) => {
    try {
      console.log('Moving', itemName, 'to', targetPath.join('/'));
      
      const configResponse = await fetch('/api/sharepoint/check-config');
      const configData = await configResponse.json();
      
      if (!configData.success) {
        throw new Error('SharePoint not configured');
      }
      
      // Construct the source path (where the item currently is)
      const sourcePath = [...currentPath, itemName].join('/');
      console.log('Source path:', sourcePath);
      console.log('Target path:', targetPath.join('/'));
      
      const response = await fetch('/api/sharepoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'moveItem',
          driveId: configData.config.driveId,
          fileName: sourcePath,
          folderPath: targetPath.join('/'),
        }),
      });

      console.log('Move response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Item moved successfully:', result);
        console.log('Refreshing file list...');
        await loadFilesFromSharePoint();
        console.log('File list refreshed');
      } else {
        const errorText = await response.text();
        console.error('Failed to move item:', response.status, errorText);
        console.error('Error details:', errorText);
      }
    } catch (error) {
      console.error('Error moving item:', error);
    }
  };

  // Track recently moved items to prevent duplicate moves
  const [recentlyMovedItems, setRecentlyMovedItems] = useState<Set<string>>(new Set());

  const moveItemWithId = async (itemId: string, itemName: string, targetPath: string[]) => {
    try {
      console.log('Moving item with ID:', itemId, 'name:', itemName, 'to', targetPath.join('/'));
      
      // Check if this item was recently moved - UPDATED
      if (recentlyMovedItems.has(itemId)) {
        console.log('Item was recently moved, skipping duplicate move');
        return;
      }
      
      // Add item to recently moved set
      setRecentlyMovedItems(prev => new Set(Array.from(prev).concat(itemId)));
      
      // Clear the item from recently moved after 5 seconds
      setTimeout(() => {
        setRecentlyMovedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 5000);
      
              console.log('Proceeding with move operation - UPDATED');
      
      const configResponse = await fetch('/api/sharepoint/check-config');
      const configData = await configResponse.json();
      
      if (!configData.success) {
        throw new Error('SharePoint not configured');
      }
      
      // NEW APPROACH: Use name-based move instead of ID-based move for better reliability
      console.log('Using name-based move for better reliability');
      
              const requestBody = {
          action: 'moveItem', // Use the name-based move action instead of moveItemById
          driveId: configData.config.driveId,
          fileName: itemName, // Use file name instead of ID
          itemId: itemId, // Pass the item ID from frontend
          folderPath: targetPath.join('/'),
          currentPath: currentPath.join('/'), // Pass current path for context
        };
      
      console.log('Move request body:', requestBody);
      
      const response = await fetch('/api/sharepoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Move response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Item moved successfully:', result);
        
        // If we moved to root, reset the current path
        if (targetPath.length === 0) {
          console.log('Moved to root, resetting current path from', currentPath, 'to []');
          setCurrentPath([]);
        } else {
          console.log('Moved to folder, updating current path from', currentPath, 'to:', targetPath);
          setCurrentPath(targetPath);
        }
        
        console.log('Waiting 1 second before refreshing file list...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Refreshing file list...');
        await loadFilesFromSharePoint();
        console.log('File list refreshed');
      } else {
        const errorText = await response.text();
        console.error('Failed to move item:', response.status, errorText);
        console.error('Error details:', errorText);
        
        // Try to parse error as JSON for better debugging
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Parsed error:', errorJson);
        } catch (e) {
          console.error('Could not parse error as JSON');
        }
        
        // Refresh the file list to get current state
        console.log('Refreshing file list after error...');
        await loadFilesFromSharePoint();
      }
    } catch (error) {
      console.error('Error moving item:', error);
      // Refresh the file list on any error
      await loadFilesFromSharePoint();
    }
  };

  // Load files on component mount and when path changes
  useEffect(() => {
    console.log('useEffect triggered - currentPath changed to:', currentPath);
    // Always load files when path changes, regardless of loading state
    loadFilesFromSharePoint();
  }, [currentPath]);

  // Debug currentPath changes
  useEffect(() => {
    console.log('currentPath state changed to:', currentPath);
  }, [currentPath]);

  const folderTree = buildFolderTree(displayFiles);
  
  // Debug log when displayFiles changes
  useEffect(() => {
    console.log('displayFiles updated:', displayFiles.length, 'files');
    console.log('Folder tree rebuilt with', displayFiles.length, 'files');
  }, [displayFiles]);
  
  // Get current folder based on path
  const getCurrentFolder = () => {
    if (displayFiles.length === 0) return null;
    const tree = buildFolderTree(displayFiles);
    return navigateToPath(tree, currentPath);
  };
  
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  // Navigate to a specific path level
  const navigateToLevel = (levelIndex: number) => {
    if (levelIndex === -1) {
      // Navigate to home (root)
      setCurrentPath([]);
    } else {
      // Navigate to specific level
      setCurrentPath(prev => prev.slice(0, levelIndex + 1));
    }
  };

  // Navigate into a folder
  const navigateIntoFolder = (folderName: string) => {
    setCurrentPath(prev => [...prev, folderName]);
  };

  // Create new folder in SharePoint
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    setIsCreatingFolder(true);
    try {
      console.log('Creating folder in SharePoint:', newFolderName);
      console.log('Current path:', currentPath);
      
      // Check if SharePoint is configured
      const configResponse = await fetch('/api/sharepoint/check-config');
      const configData = await configResponse.json();
      
      if (!configData.success || (configData.status !== 'fully_configured' && configData.status !== 'basic_configured')) {
        throw new Error('SharePoint not configured');
      }
      
      // Create folder in SharePoint
      const response = await fetch('/api/sharepoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createFolder',
          driveId: configData.config.driveId,
          folderPath: currentPath.join('/'),
          fileName: newFolderName
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }
      
      const result = await response.json();
      console.log('Folder created successfully:', result);
      
      // Refresh the file list to show the new folder
      await loadFilesFromSharePoint();
      
      // Reset form and close modal
      setNewFolderName('');
      setShowNewFolderModal(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      alert(`Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };



  const handleDeleteFile = async (fileName: string) => {
    // Find the file to get its ID
    const file = displayFiles.find(f => f.name === fileName) as any;
    if (!file || !file.id) {
      console.error('File not found or no ID available:', fileName);
      return;
    }

    // OPTIMISTIC UPDATE: Remove file from UI immediately
    setDisplayFiles(prev => prev.filter(f => f.name !== fileName));
    console.log('Optimistically deleted file from UI:', fileName);
    
    // BACKGROUND SYNC: Delete from SharePoint in background
    try {
      // Check if SharePoint is configured
      const configResponse = await fetch('/api/sharepoint/check-config');
      const configData = await configResponse.json();
      
      if (!configData.success || (configData.status !== 'fully_configured' && configData.status !== 'basic_configured')) {
        throw new Error('SharePoint not configured');
      }
      
      const response = await fetch(`/api/sharepoint?driveId=${configData.config.driveId}&itemId=${file.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('File deleted successfully in SharePoint:', fileName);
      } else {
        const errorData = await response.json();
        console.error('Failed to delete file in SharePoint, reverting...', errorData);
        // Revert the optimistic update
        await loadFilesFromSharePoint();
      }
    } catch (error) {
      console.error('Error deleting file in SharePoint, reverting...', error);
      // Revert the optimistic update
      await loadFilesFromSharePoint();
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    // Find the folder to get its ID
    const folder = displayFiles.find(f => f.name === folderName) as any;
    if (!folder || !folder.id) {
      console.error('Folder not found or no ID available:', folderName);
      return;
    }

    // OPTIMISTIC UPDATE: Remove all files in the folder from UI immediately
    setDisplayFiles(prev => prev.filter(f => {
      const filePath = (f as any).webkitRelativePath || f.name;
      return !filePath.startsWith(folderName + '/');
    }));
    console.log('Optimistically deleted folder from UI:', folderName);
    
    // BACKGROUND SYNC: Delete folder and all its contents from SharePoint in background
    try {
      // Check if SharePoint is configured
      const configResponse = await fetch('/api/sharepoint/check-config');
      const configData = await configResponse.json();
      
      if (!configData.success || (configData.status !== 'fully_configured' && configData.status !== 'basic_configured')) {
        throw new Error('SharePoint not configured');
      }
      
      const response = await fetch(`/api/sharepoint?driveId=${configData.config.driveId}&itemId=${folder.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Folder deleted successfully in SharePoint:', folderName);
      } else {
        const errorData = await response.json();
        console.error('Failed to delete folder in SharePoint, reverting...', errorData);
        // Revert the optimistic update
        await loadFilesFromSharePoint();
      }
    } catch (error) {
      console.error('Error deleting folder in SharePoint, reverting...', error);
      // Revert the optimistic update
      await loadFilesFromSharePoint();
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('onDrop called with', acceptedFiles.length, 'files');
    // Debug log: print file name and webkitRelativePath
    acceptedFiles.forEach(file => {
      // @ts-ignore
      console.log('Dropped file:', file.name, 'webkitRelativePath:', file.webkitRelativePath);
    });
    
    // Append new files to existing files
    setSelectedFiles(prev => {
      const newFiles = [...prev, ...acceptedFiles];
      console.log('Updated selectedFiles to', newFiles.length, 'files');
      return newFiles;
    });
    
    // Set initial filenames for new files (without extensions)
    const newFileNames = acceptedFiles.map(file => {
      const fileNameWithoutExtension = file.name.split('.').slice(0, -1).join('.') || file.name;
      return fileNameWithoutExtension;
    });
    
    // Append new filenames to existing filenames
    setFileNames(prev => [...prev, ...newFileNames]);
  }, []);

  const handleFileNameChange = (index: number, newName: string) => {
    const newFileNames = [...fileNames];
    newFileNames[index] = newName;
    setFileNames(newFileNames);
  };

  const getFileExtension = (fileName: string) => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  };

  function getFileIcon(extension: string) {
    switch (extension.toLowerCase()) {
      case 'pdf':
        return <FaFilePdf className="w-4 h-4 text-red-600" />;
      case 'doc':
      case 'docx':
        return <FaFileWord className="w-4 h-4 text-blue-700" />;
      case 'xls':
      case 'xlsx':
        return <FaFileExcel className="w-4 h-4 text-green-700" />;
      case 'csv':
        return <FaFileCsv className="w-4 h-4 text-green-600" />;
      case 'txt':
        return <FaFileAlt className="w-4 h-4 text-gray-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return <FaFileImage className="w-4 h-4 text-yellow-600" />;
      default:
        return <HiOutlineDocumentText className="w-4 h-4 text-blue-600" />;
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to format SharePoint date
  const formatSharePointDate = (dateString: string): string => {
    if (!dateString) return 'Unknown';
    
    // Parse the UTC date string and convert to local time
    const date = new Date(dateString);
    const now = new Date();
    
    // Calculate the difference in hours (accounting for timezone)
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    // Format the date like SharePoint: "Yesterday at 4:08 PM"
    const formatTime = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };
    
    // Format the date like SharePoint: "Yesterday at 4:08 PM"
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };
    
    if (diffInHours < 24) {
      if (diffInHours < 1) {
        return `Today at ${formatTime(date)}`;
      } else if (diffInHours < 2) {
        return `1 hour ago at ${formatTime(date)}`;
      } else {
        return `${Math.floor(diffInHours)} hours ago at ${formatTime(date)}`;
      }
    } else if (diffInHours < 48) {
      return `Yesterday at ${formatTime(date)}`;
    } else {
      // For older dates, show the full date and time
      return `${formatDate(date)} at ${formatTime(date)}`;
    }
  };

  // Helper function to extract user name from SharePoint user object
  const extractUserName = (user: any): string => {
    if (!user) return 'Chris Hart';
    if (typeof user === 'string') return user;
    if (user.displayName) return user.displayName;
    if (user.name) return user.name;
    if (user.email) return user.email.split('@')[0];
    return 'Chris Hart'; // Default to Chris Hart
  };

  // Current folder view component
  function CurrentFolderView({ node }: { node: FolderNode }) {
    // Get SharePoint folders and files from displayFiles
    const sharePointFolders = displayFiles.filter((item: any) => item.isFolder);
    const sharePointFiles = displayFiles.filter((item: any) => !item.isFolder);
    
    return (
      <div 
        className="space-y-1"
        onDragOver={(e) => {
          console.log('CurrentFolderView drag over');
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          console.log('CurrentFolderView drop');
          const itemName = e.dataTransfer.getData('text/plain');
          const itemData = e.dataTransfer.getData('application/json');
          console.log('Dropped item in main container:', itemName);
          if (itemName && itemData) {
            try {
              const item = JSON.parse(itemData);
              console.log('Moving item to current path:', currentPath);
              console.log('Item data:', item);
              moveItemWithId(item.id, item.name, currentPath);
            } catch (error) {
              console.error('Error parsing item data:', error);
            }
          }
        }}
      >
        {/* Table Header */}
        <div className="grid grid-cols-4 gap-4 py-2 px-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
          <div className="flex items-center">
            <HiDocument className="w-4 h-4 mr-2" />
            Name
          </div>
          <div>Type</div>
          <div className="flex items-center">
            <HiClock className="w-4 h-4 mr-2" />
            Modified
          </div>
          <div className="flex items-center">
            <HiUser className="w-4 h-4 mr-2" />
            Modified By
          </div>
        </div>



        {/* SharePoint Folders */}
        {sharePointFolders
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
          .map((folder: any) => (
            <div
              key={folder.name}
              className={`group grid grid-cols-4 gap-4 py-1 px-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                cutItems.has(folder.id) ? 'bg-gray-100 opacity-60' : 'bg-white'
              }`}
              draggable={true}
              onDragStart={(e) => {
                console.log('=== FOLDER DRAG START ===');
                console.log('Drag start on folder:', folder.name);
                console.log('Folder ID:', folder.id);
                e.dataTransfer.setData('text/plain', folder.name);
                e.dataTransfer.setData('application/json', JSON.stringify({
                  name: folder.name,
                  id: folder.id,
                  type: 'folder'
                }));
                e.dataTransfer.effectAllowed = 'move';
                e.currentTarget.classList.add('dragging');
              }}
              onDragEnd={(e) => {
                console.log('=== FOLDER DRAG END ===');
                e.currentTarget.classList.remove('dragging');
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                e.currentTarget.classList.add('drop-zone-active');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('drop-zone-active');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const itemName = e.dataTransfer.getData('text/plain');
                const itemData = e.dataTransfer.getData('application/json');
                console.log('Dropped item:', itemName, 'into folder:', folder.name);
                
                if (itemName && itemName !== folder.name && itemData) {
                  // Don't allow dropping an item onto itself
                  if (itemName === folder.name) {
                    console.log('Skipping move - cannot drop item onto itself');
                    return;
                  }
                  try {
                    const item = JSON.parse(itemData);
                    const targetPath = [...currentPath, folder.name];
                    
                    // Check if we're trying to move to the same location
                    // The item is currently in currentPath, and we're trying to move it to targetPath
                    // If they're the same, we're trying to move to the same location
                    if (JSON.stringify(currentPath) === JSON.stringify(targetPath)) {
                      console.log('Skipping move - item is already in this location');
                      return;
                    }
                    
                    console.log('Moving item to target path:', targetPath);
                    console.log('Item data:', item);
                    moveItemWithId(item.id, item.name, targetPath);
                  } catch (error) {
                    console.error('Error parsing item data:', error);
                  }
                }
                
                e.currentTarget.classList.remove('drop-zone-active');
              }}
              onClick={(e) => {
                console.log('Folder clicked:', folder.name);
                navigateIntoFolder(folder.name);
              }}
              onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
              style={{ userSelect: 'none', cursor: 'grab' }}
            >
              <div className="flex items-center">
                <HiFolder className="w-5 h-5 mr-3 text-blue-600" />
                <span className="font-medium text-gray-800">{folder.name}</span>
              </div>
              <div className="text-gray-600">Folder</div>
              <div className="text-gray-600">
                {folder.lastModifiedDateTime ? formatSharePointDate(folder.lastModifiedDateTime) : 'Unknown'}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  {folder.lastModifiedBy?.user ? extractUserName(folder.lastModifiedBy.user) : 'Unknown'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.name);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <HiX className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        
        {/* SharePoint Files */}
        {sharePointFiles
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
          .map((file: any, idx) => (
            <div 
              key={file.name + idx} 
              className={`group grid grid-cols-4 gap-4 py-1 px-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                cutItems.has(file.id) ? 'bg-gray-100 opacity-60' : 'bg-white'
              }`}
              draggable={true}
              onDragStart={(e) => {
                console.log('=== FILE DRAG START ===');
                console.log('Drag start on file:', file.name);
                console.log('File ID:', file.id);
                e.dataTransfer.setData('text/plain', file.name);
                e.dataTransfer.setData('application/json', JSON.stringify({
                  name: file.name,
                  id: file.id,
                  type: 'file'
                }));
                e.dataTransfer.effectAllowed = 'move';
                e.currentTarget.classList.add('dragging');
              }}
              onDragEnd={(e) => {
                console.log('=== FILE DRAG END ===');
                e.currentTarget.classList.remove('dragging');
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                e.currentTarget.classList.add('drop-zone-active');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('drop-zone-active');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const itemName = e.dataTransfer.getData('text/plain');
                const itemData = e.dataTransfer.getData('application/json');
                console.log('Dropped item:', itemName, 'onto file:', file.name);
                
                if (itemName && itemName !== file.name && itemData) {
                  try {
                    const item = JSON.parse(itemData);
                    // Move to current folder (same as the file)
                    console.log('Moving item to current path:', currentPath);
                    console.log('Item data:', item);
                    moveItemWithId(item.id, item.name, currentPath);
                  } catch (error) {
                    console.error('Error parsing item data:', error);
                  }
                }
                
                e.currentTarget.classList.remove('drop-zone-active');
              }}
              onContextMenu={(e) => handleContextMenu(e, file, 'file')}
              style={{ userSelect: 'none', cursor: 'grab' }}
            >
              <div className="flex items-center">
                {getFileIcon(file.name.split('.').pop() || '')}
                <span className="ml-2 font-medium text-gray-800">{file.name}</span>
              </div>
              <div className="text-gray-600">{file.name.split('.').pop()?.toUpperCase() || 'File'}</div>
              <div className="text-gray-600">
                {file.lastModifiedDateTime ? formatSharePointDate(file.lastModifiedDateTime) : 'Unknown'}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  {file.lastModifiedBy?.user ? extractUserName(file.lastModifiedBy.user) : 'Unknown'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(file.name);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <HiX className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        
        {sharePointFolders.length === 0 && sharePointFiles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <HiDocument className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>This folder is empty</p>
          </div>
        )}
      </div>
    );
  }

  function FolderTree({ node, path = "", expandedFolders, toggleFolder }: {
    node: FolderNode;
    path?: string;
    expandedFolders: { [key: string]: boolean };
    toggleFolder: (path: string) => void;
  }) {
    return (
      <div className="ml-2">
        {Object.values(node.subfolders).map(sub => {
          const folderPath = path + "/" + sub.name;
          const isOpen = expandedFolders[folderPath];
          return (
            <div key={folderPath} className="mb-1">
              <div
                className="flex items-center cursor-pointer select-none"
                onClick={() => toggleFolder(folderPath)}
              >
                <HiFolder className={`w-4 h-4 mr-1 ${isOpen ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="font-medium text-gray-800">{sub.name}</span>
                <span className="ml-2 text-xs text-gray-500">({sub.files.length} files, {Object.keys(sub.subfolders).length} folders)</span>
                <span className="ml-2 text-xs text-blue-500">[{isOpen ? '-' : '+'}]</span>
              </div>
              {isOpen && (
                <FolderTree node={sub} path={folderPath} expandedFolders={expandedFolders} toggleFolder={toggleFolder} />
              )}
            </div>
          );
        })}
        {node.files.map((file, idx) => (
          <div key={file.name + idx} className="flex items-center gap-2 ml-6 p-1">
            {getFileIcon(file.name.split('.').pop() || '')}
            <span className="text-gray-700 text-sm">{file.name}</span>
            <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
          </div>
        ))}
      </div>
    );
  }
  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const handleDownload = (doc: Document) => {
    if (doc.url) {
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleUpload = async () => {
    console.log('Upload button clicked, selectedFiles:', selectedFiles);
    if (selectedFiles.length > 0) {
      // INSTANT UI UPDATE: Add files to display immediately
      const filesWithPaths = selectedFiles.map(file => ({
        ...file,
        webkitRelativePath: (file as any).webkitRelativePath || file.name
      }));
      
      setDisplayFiles(prev => [...prev, ...filesWithPaths]);
      console.log('Files added to UI instantly');
      
              // CLOSE MODAL IMMEDIATELY - User can continue working
        setShowUploadModal(false);
        setSelectedFiles([]);
        setFileNames([]);
        setIsUploading(false);
      
      // BACKGROUND UPLOAD: Upload to server without blocking UI
      uploadFilesInBackground(selectedFiles);
    } else {
      console.log('No files selected for upload');
    }
  };

  const uploadFilesInBackground = async (files: File[]) => {
    console.log('Starting SharePoint-style parallel upload for', files.length, 'files');
    
    // SharePoint approach: Upload all files in parallel with chunked processing
    const uploadPromises = files.map(async (file) => {
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        path: (file as any).webkitRelativePath || file.name
      };
      
      try {
        // SharePoint uses chunked uploads for large files
        const chunkSize = 1024 * 1024; // 1MB chunks like SharePoint
        const totalChunks = Math.ceil(file.size / chunkSize);
        
        if (file.size <= chunkSize) {
          // Small file - direct upload
          const response = await fetch('/api/files/move', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileName: file.name,
              sourcePath: null,
              targetPath: (file as any).webkitRelativePath || file.name,
              fileData: fileData
            })
          });
          
          if (response.ok) {
            console.log(`✅ Uploaded ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
            return { success: true, file: file.name };
          } else {
            console.error(`❌ Failed to upload ${file.name}`);
            return { success: false, file: file.name };
          }
        } else {
          // Large file - chunked upload like SharePoint
          console.log(`📦 Starting chunked upload for ${file.name} (${totalChunks} chunks)`);
          
          for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);
            
            const chunkResponse = await fetch('/api/files/chunk', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fileName: file.name,
                chunkIndex,
                totalChunks,
                chunkData: await chunk.arrayBuffer(),
                fileData: fileData
              })
            });
            
            if (!chunkResponse.ok) {
              console.error(`❌ Failed to upload chunk ${chunkIndex} for ${file.name}`);
              return { success: false, file: file.name };
            }
            
            console.log(`📦 Uploaded chunk ${chunkIndex + 1}/${totalChunks} for ${file.name}`);
          }
          
          console.log(`✅ Completed chunked upload for ${file.name}`);
          return { success: true, file: file.name };
        }
      } catch (error) {
        console.error(`❌ Error uploading ${file.name}:`, error);
        return { success: false, file: file.name };
      }
    });
    
    // Wait for all uploads to complete (SharePoint does this in parallel)
    const results = await Promise.all(uploadPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`🎯 SharePoint-style upload complete: ${successful} successful, ${failed} failed`);
  };

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setSelectedFiles([]);
    setFileNames([]);
  };

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, item: any, type: 'file' | 'folder') => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      item,
      type
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleContextMenuDelete = async () => {
    if (!contextMenu) return;
    
    try {
      if (contextMenu.type === 'folder') {
        await handleDeleteFolder(contextMenu.item.name);
      } else {
        await handleDeleteFile(contextMenu.item.name);
      }
      setContextMenu(null);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleContextMenuRename = () => {
    // TODO: Implement rename functionality
    console.log('Rename clicked for:', contextMenu?.item.name);
    setContextMenu(null);
  };

  const handleContextMenuDownload = () => {
    // TODO: Implement download functionality
    console.log('Download clicked for:', contextMenu?.item.name);
    setContextMenu(null);
  };

  const handleContextMenuCopy = () => {
    if (!contextMenu) return;
    
    setClipboard({
      item: contextMenu.item,
      type: contextMenu.type,
      action: 'copy'
    });
    console.log('Copied:', contextMenu.item.name);
    setContextMenu(null);
  };

  const handleContextMenuCut = () => {
    if (!contextMenu) return;
    
    setClipboard({
      item: contextMenu.item,
      type: contextMenu.type,
      action: 'cut'
    });
    setCutItems(prev => new Set(Array.from(prev).concat(contextMenu.item.id)));
    console.log('Cut:', contextMenu.item.name);
    setContextMenu(null);
  };

  const handleContextMenuPaste = async () => {
    if (!clipboard) return;
    
    try {
      // Check if SharePoint is configured
      const configResponse = await fetch('/api/sharepoint/check-config');
      const configData = await configResponse.json();
      
      if (!configData.success || (configData.status !== 'fully_configured' && configData.status !== 'basic_configured')) {
        throw new Error('SharePoint not configured');
      }

      if (clipboard.action === 'copy') {
        // Copy the item
        const response = await fetch('/api/sharepoint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'copyItem',
            driveId: configData.config.driveId,
            itemId: clipboard.item.id,
            folderPath: currentPath.join('/')
          })
        });

        if (response.ok) {
          console.log('Item copied successfully');
          await loadFilesFromSharePoint();
        } else {
          console.error('Failed to copy item');
        }
      } else if (clipboard.action === 'cut') {
        // Move the item (cut = move)
        await moveItemWithId(clipboard.item.id, clipboard.item.name, currentPath);
      }

      // Clear clipboard after paste
      setClipboard(null);
      // Remove from cut items if it was a cut operation
      if (clipboard.action === 'cut') {
        setCutItems(prev => {
          const newSet = new Set(Array.from(prev));
          newSet.delete(clipboard.item.id);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error pasting item:', error);
    }
  };

  // Helper to group files by top-level folder
  function groupFilesByFolder(files: File[]) {
    const folders: { [folder: string]: File[] } = {};
    const looseFiles: File[] = [];
    files.forEach(file => {
      const relPath = (file as any).webkitRelativePath || '';
      if (relPath && relPath.includes('/')) {
        const folder = relPath.split('/')[0];
        if (!folders[folder]) folders[folder] = [];
        folders[folder].push(file);
      } else if (!relPath) {
        looseFiles.push(file);
      }
      // If relPath exists but does not include '/', it's a loose file (should be rare)
    });
    return { folders, looseFiles };
  }

  // Group files for display
  const { folders, looseFiles } = groupFilesByFolder(selectedFiles);

  // Custom drop capture handler for folder detection
  const handleDropCapture = useCallback((event: React.DragEvent) => {
    let foundFolder = false;
    if (event.dataTransfer && event.dataTransfer.items) {
      for (let i = 0; i < event.dataTransfer.items.length; i++) {
        const item = event.dataTransfer.items[i];
        if (item.kind === 'file') {
          // @ts-ignore
          const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
          if (entry && entry.isDirectory) {
            foundFolder = true;
            break;
          }
        }
      }
    }
    if (foundFolder) {
      setShowFolderDropWarning(true);
      if (folderWarningTimeout.current) clearTimeout(folderWarningTimeout.current);
      folderWarningTimeout.current = setTimeout(() => setShowFolderDropWarning(false), 5000);
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  // After selectedFiles is updated, build the folder tree and log it for now
  useEffect(() => {
    if (selectedFiles.length > 0) {
      const tree = buildFolderTree(selectedFiles);
      console.log('Folder tree:', tree);
    }
    // Do not return anything from this effect
  }, [selectedFiles]);

  // Keyboard shortcuts for copy/paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'c':
            e.preventDefault();
            if (contextMenu) {
              handleContextMenuCopy();
            }
            break;
          case 'x':
            e.preventDefault();
            if (contextMenu) {
              handleContextMenuCut();
            }
            break;
          case 'v':
            e.preventDefault();
            if (clipboard) {
              handleContextMenuPaste();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [contextMenu, clipboard]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // Remove accept restriction to allow all files
  });

  return (
    <motion.div
      className="flex-1 flex flex-col h-full bg-blue-400"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}

      onDragOver={(e) => {
        console.log('Body drag over');
        e.preventDefault();
      }}
      onDrop={(e) => {
        console.log('Body drop');
        e.preventDefault();
      }}
    >
      <div className="px-6 pt-1 pb-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateToLevel(-1)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-2xl font-bold transition-all duration-200 text-white hover:text-blue-200"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                e.currentTarget.classList.add('drop-zone-active');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('drop-zone-active');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const itemName = e.dataTransfer.getData('text/plain');
                const itemData = e.dataTransfer.getData('application/json');
                console.log('Dropped item:', itemName, 'onto Files (root)');
                
                if (itemName && itemData) {
                  try {
                    const item = JSON.parse(itemData);
                    // Move to root (empty path)
                    console.log('Moving item to root');
                    console.log('Item data:', item);
                    moveItemWithId(item.id, item.name, []);
                  } catch (error) {
                    console.error('Error parsing item data:', error);
                  }
                }
                
                e.currentTarget.classList.remove('drop-zone-active');
              }}
            >
              <HiHome className="w-6 h-6" />
              <span>Files</span>
            </button>
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveFilter('all')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeFilter === 'all'
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-blue-600 hover:bg-gray-50"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter('documents')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeFilter === 'documents'
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-blue-600 hover:bg-gray-50"
                }`}
              >
                <HiDocument className="w-4 h-4" />
                Documents
              </button>
              <button
                onClick={() => setActiveFilter('drawings')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeFilter === 'drawings'
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-blue-600 hover:bg-gray-50"
                }`}
              >
                <MdDraw className="w-4 h-4" />
                Drawings
              </button>
              <button
                onClick={() => setActiveFilter('images')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeFilter === 'images'
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-blue-600 hover:bg-gray-50"
                }`}
              >
                <FaFileImage className="w-4 h-4" />
                Images
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="bg-white text-blue-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-lg flex items-center gap-1.5"
            >
              <HiPlus className="w-4 h-4" />
              New
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-white text-blue-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-lg flex items-center gap-1.5"
            >
              <HiUpload className="w-4 h-4" />
              Upload
            </button>
            <button
              onClick={() => {
                console.log('Force refreshing SharePoint data...');
                loadFilesFromSharePoint();
              }}
              className="bg-white text-blue-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-lg flex items-center gap-1.5"
            >
              <HiRefresh className="w-4 h-4" />
            </button>
                        {clipboard && (
              <button
                onClick={handleContextMenuPaste}
                className="bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-lg flex items-center gap-1.5"
                title={`Paste ${clipboard.item.name} (${clipboard.action})`}
              >
                <HiClipboard className="w-4 h-4" />
                Paste
              </button>
            )}
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/sharepoint/auth?action=login');
                  const data = await response.json();
                  if (data.authUrl) {
                    window.location.href = data.authUrl;
                  }
                } catch (error) {
                  console.error('Error starting auth:', error);
                  alert('Failed to start authentication');
                }
              }}
              className="bg-white text-blue-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-lg flex items-center gap-1.5"
            >
              <HiShare className="w-4 h-4" />
              Sign In
            </button>
          </div>
        </div>

        <div 
          className="bg-white rounded-lg shadow-lg mt-4 overflow-hidden"
          style={{ 
            border: '2px dashed transparent',
            transition: 'border-color 0.2s'
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            // Only show drop zone if not hovering over a specific item
            if (!(e.target as Element).closest('[draggable]')) {
              e.currentTarget.style.borderColor = '#3B82F6';
              e.currentTarget.style.backgroundColor = '#EFF6FF';
            }
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.backgroundColor = '';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // setIsDropping(true); // Removed as per new logic
            const itemName = e.dataTransfer.getData('text/plain');
            console.log('Dropped item:', itemName, 'into current folder:', currentPath.join('/'));
            
            // Execute the drop
            if (itemName) {
              console.log('Dropping item:', itemName, 'into current folder');
              moveItem(itemName, currentPath);
            }
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.backgroundColor = '';
            
            // Reset dropping flag after a short delay - REMOVED
            // setTimeout(() => setIsDropping(false), 100);
          }}
        >
          {/* Files Section */}
          <div className="p-6">
            {/* Page Header - Files title with inline breadcrumb */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {/* Files button styled like breadcrumb folders */}
                <button
                  onClick={() => navigateToLevel(-1)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    e.currentTarget.classList.add('bg-blue-100', 'text-blue-700', 'border', 'border-blue-300');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('bg-blue-100', 'text-blue-700', 'border', 'border-blue-300');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const itemName = e.dataTransfer.getData('text/plain');
                    const itemData = e.dataTransfer.getData('application/json');
                    if (itemName && itemData) {
                      try {
                        const item = JSON.parse(itemData);
                        console.log('Moving item to root:', item);
                        moveItemWithId(item.id, item.name, []);
                      } catch (error) {
                        console.error('Error parsing item data:', error);
                      }
                    }
                    e.currentTarget.classList.remove('bg-blue-100', 'text-blue-700', 'border', 'border-blue-300');
                  }}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentPath.length === 0 
                      ? 'text-gray-900 bg-gray-50 border border-gray-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <HiFolder className="w-4 h-4 text-blue-600" />
                  <span className="truncate max-w-32">Files</span>
                </button>
                
                {/* SharePoint-style Breadcrumb - Inline with Files title */}
                {currentPath.length > 0 && (
                  <SharePointBreadcrumb 
                    path={currentPath} 
                    onNavigate={navigateToLevel}
                    onDragOver={(e, targetPath) => {
                      console.log('Breadcrumb drag over:', targetPath);
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      // Add visual feedback for breadcrumb drop zones
                      e.currentTarget.classList.add('drop-zone-active');
                    }}
                    onDragLeave={(e) => {
                      // Remove visual feedback when leaving breadcrumb
                      e.currentTarget.classList.remove('drop-zone-active');
                    }}
                    onDrop={(e, targetPath) => {
                      console.log('Breadcrumb drop:', targetPath);
                      const itemName = e.dataTransfer.getData('text/plain');
                      const itemData = e.dataTransfer.getData('application/json');
                      if (itemName && itemData) {
                        try {
                          const item = JSON.parse(itemData);
                          console.log('Moving item to breadcrumb path:', targetPath);
                          console.log('Item data:', item);
                          moveItemWithId(item.id, item.name, targetPath);
                        } catch (error) {
                          console.error('Error parsing item data:', error);
                        }
                      }
                      // Remove visual feedback
                      e.currentTarget.classList.remove('drop-zone-active');
                    }}
                    dragOverTarget={null} // No specific drag over target for breadcrumb
                  />
                )}
              </div>
            </div>
            {displayFiles.length > 0 ? (
              <div
                onDragOver={(e) => {
                  console.log('Inner container drag over');
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  console.log('Inner container drop');
                  const itemName = e.dataTransfer.getData('text/plain');
                  const itemData = e.dataTransfer.getData('application/json');
                  if (itemName && itemData) {
                    try {
                      const item = JSON.parse(itemData);
                      console.log('Moving item to current path:', currentPath);
                      console.log('Item data:', item);
                      moveItemWithId(item.id, item.name, currentPath);
                    } catch (error) {
                      console.error('Error parsing item data:', error);
                    }
                  }
                }}
              >
                {/* Current Folder View */}
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading files...</p>
                    </div>
                  </div>
                ) : (
                  <CurrentFolderView node={{ name: '', files: [], subfolders: {} }} />
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <HiDocument className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No files uploaded yet</p>
                <p className="text-sm">Upload your first files using the button above</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Add Documents</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <HiX className="w-6 h-6" />
                </button>
              </div>

              {showFolderDropWarning && (
                <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-sm flex items-center gap-2">
                  <span className="font-bold">⚠️</span>
                  To upload a folder with its structure, please use the “Browse files or folders” button below.
                  <button onClick={() => setShowFolderDropWarning(false)} className="ml-auto text-yellow-700 hover:text-yellow-900">✕</button>
                </div>
              )}

              {/* Selected Files Display */}
              {(selectedFiles.length > 0) && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selected Files</label>
                  <div className="max-h-80 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
                    {/* Show folders as single rows */}
                    {Object.keys(folders).map(folderName => (
                      <div key={folderName} className="p-2 bg-gray-50 rounded border group relative flex items-center gap-2">
                        <HiFolder className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-800 flex-1">{folderName}</span>
                        <span className="text-xs text-gray-500">{folders[folderName].length} files</span>
                        <button
                          onClick={() => {
                            const folderFiles = folders[folderName];
                            setSelectedFiles(prev => prev.filter(f => !folderFiles.includes(f)));
                            setFileNames(prev => prev.filter((_, i) => !folderFiles.includes(selectedFiles[i])));
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-500 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {/* Show loose files as before */}
                    {looseFiles.map((file, index) => (
                      <div key={file.name + index} className="p-2 bg-gray-50 rounded border group relative">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            {getFileIcon(file.name.split('.').pop() || '')}
                            <input
                              type="text"
                              value={fileNames[selectedFiles.indexOf(file)] || ''}
                              onChange={(e) => handleFileNameChange(selectedFiles.indexOf(file), e.target.value)}
                              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-black"
                              placeholder="Enter filename..."
                            />
                            <span className="text-xs text-gray-500">
                              .{getFileExtension(file.name)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                            <button
                              onClick={() => {
                                const idx = selectedFiles.indexOf(file);
                                setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                                setFileNames(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-500 hover:text-red-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attach Documents */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Attach Documents</label>
                {/* Existing dropzone and file input UI below */}
                <div
                  {...getRootProps()}
                  onDropCapture={handleDropCapture}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                  onDragEnter={e => { e.preventDefault(); e.stopPropagation(); }}
                  className={
                    `border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer min-h-[220px] flex flex-col justify-center items-center ` +
                    (isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50')
                  }
                >
                  <input
                    id="dropzone-input"
                    style={{ display: 'none' }}
                    {...(getInputProps() as any)}
                    {...(typeof window !== 'undefined' ? { webkitdirectory: "true", directory: "true" } : {})}
                  />
                  <HiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  {isDragActive ? (
                    <p className="text-blue-600 font-medium">Drop the files here...</p>
                  ) : showFolderDropWarning ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <label
                        htmlFor="dropzone-input"
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        Browse folders here
                      </label>
                      <p className="text-xs text-gray-400 mt-2">To upload a folder with its structure, use the browse button and select a folder.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-600 font-medium mb-1">Drag and drop files here</p>
                      <p className="text-sm text-gray-500">or</p>
                      <label
                        htmlFor="dropzone-input"
                        className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                      >
                        Browse to upload folders
                      </label>
                      <p className="text-xs text-gray-400 mt-1">To upload a folder with its structure, use the browse button and select a folder.</p>
                    </div>
                  )}
                </div>
              </div>



              {/* Upload Button */}
              <button
                onClick={() => {
                  console.log('Upload button clicked');
                  handleUpload();
                }}
                disabled={selectedFiles.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <HiUpload className="w-4 h-4" />
                <span>Upload Instantly</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Create New Folder</h2>
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <HiX className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Enter folder name..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateFolder();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isCreatingFolder}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingFolder ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-48"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={handleContextMenuDelete}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
          >
            <HiTrash className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={handleContextMenuRename}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-black"
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            Rename
          </button>
          <div className="border-t border-gray-200 my-1"></div>
          <button
            onClick={handleContextMenuCopy}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-black"
          >
            <HiClipboardCopy className="w-4 h-4" />
            Copy
          </button>
          <button
            onClick={handleContextMenuCut}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-black"
          >
            <HiClipboard className="w-4 h-4" />
            Cut
          </button>
          {clipboard && (
            <button
              onClick={handleContextMenuPaste}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-black"
            >
              <HiClipboard className="w-4 h-4" />
              Paste
            </button>
          )}
          {contextMenu.type === 'file' && (
            <>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={handleContextMenuDownload}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <HiDownload className="w-4 h-4" />
                Download
              </button>
            </>
          )}
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleContextMenuClose}
        />
      )}

    </motion.div>
  );
} 