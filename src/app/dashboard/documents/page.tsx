"use client";

import { useState, useCallback, useEffect, useRef, Fragment } from "react";
import { motion } from "framer-motion";
import { HiDocument, HiUpload, HiTrash, HiDownload, HiEye, HiPlus, HiX, HiOutlineDocumentText, HiFolder, HiChevronRight, HiHome, HiShare, HiRefresh, HiClock, HiUser, HiClipboard, HiClipboardCopy, HiPencil } from "react-icons/hi";
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
  files: any[];
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
            {/* Chevron separator - only show if not the first segment */}
            {index > 0 && (
              <div className="flex items-center mx-2">
                <HiChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            )}
            
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

function buildFolderTree(files: any[]): FolderNode {
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
  const [displayFiles, setDisplayFiles] = useState<any[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [showFolderDropWarning, setShowFolderDropWarning] = useState(false);
  const folderWarningTimeout = useRef<NodeJS.Timeout | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  // Rename modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState<any>(null);
  const [newItemName, setNewItemName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

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
  
  // Track drag state for visual feedback
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // State for SharePoint site and drive
  const [sharePointSite, setSharePointSite] = useState<any>(null);
  const [sharePointDrive, setSharePointDrive] = useState<any>(null);

  // Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);

  // Ref to track if a request is in progress
  const loadingRef = useRef(false);

  // Load user's default SharePoint site
  const loadDefaultSharePointSite = async () => {
    try {
      console.log('Loading default SharePoint site...');
      const response = await fetch('/api/sharepoint/documents?action=getDefaultSite');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Default SharePoint site:', data);
        setSharePointSite(data);
        
        // Automatically load the default drive for this site
        if (data.id) {
          await loadDefaultDrive(data.id);
        }
      } else {
        console.error('Failed to load default SharePoint site');
        setSharePointSite(null);
      }
    } catch (error) {
      console.error('Error loading default SharePoint site:', error);
      setSharePointSite(null);
    }
  };

  // Load the default drive for the site
  const loadDefaultDrive = async (siteId: string) => {
    try {
      console.log('Loading default drive for site:', siteId);
      const response = await fetch(`/api/sharepoint/documents?action=getDefaultDrive&siteId=${siteId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('SharePoint drives:', data);
        
        // Get the first drive (usually "Documents" or "Shared Documents")
        const defaultDrive = data.value?.[0];
        if (defaultDrive) {
          console.log('Selected default drive:', defaultDrive);
          setSharePointDrive(defaultDrive);
        } else {
          console.error('No drives found');
          setSharePointDrive(null);
        }
      } else {
        console.error('Failed to load SharePoint drives');
        setSharePointDrive(null);
      }
    } catch (error) {
      console.error('Error loading SharePoint drives:', error);
      setSharePointDrive(null);
    }
  };

  // Load files from SharePoint using OAuth2 user tokens
  const loadFilesFromSharePoint = async () => {
    if (!sharePointDrive) {
      console.log('No drive selected');
      setDisplayFiles([]);
      return;
    }

    // Prevent multiple simultaneous calls
    if (loadingRef.current) {
      console.log('Already loading files, skipping duplicate call');
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      console.log('Fetching files from SharePoint using OAuth2...');
      console.log('Current path:', currentPath.join('/'));
      console.log('Selected drive:', sharePointDrive);
      
      // Load files from SharePoint using the new OAuth2 API
      const apiUrl = `/api/sharepoint/documents?action=getItems&driveId=${sharePointDrive.id}&folderPath=${currentPath.join('/')}&siteId=${sharePointSite?.id || ''}`;
      console.log('DEBUG: Calling OAuth2 API:', apiUrl);
      console.log('DEBUG: Drive ID type:', sharePointDrive.id.startsWith('virtual-') ? 'Virtual Drive' : 'Regular Drive');
      console.log('DEBUG: Drive ID:', sharePointDrive.id);
      const response = await fetch(apiUrl);
      console.log('Load files response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('SharePoint OAuth2 response:', data);
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
            lastModifiedBy: item.lastModifiedBy || {
              user: {
                displayName: 'You',
                email: 'user@example.com'
              }
            },
            createdDateTime: item.createdDateTime,
            createdBy: item.createdBy || {
              user: {
                displayName: 'You',
                email: 'user@example.com'
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
        
        // If not authenticated, show empty state
        if (response.status === 401) {
          console.log('User not authenticated with SharePoint');
          setDisplayFiles([]);
        } else {
          setDisplayFiles([]);
        }
      }
    } catch (error) {
      console.error('Error loading files from SharePoint:', error);
      setDisplayFiles([]);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      console.log('Load files completed');
    }
  };

  // Load default SharePoint site on component mount
  useEffect(() => {
    loadDefaultSharePointSite();
    
    // Check if user just completed authentication
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      showNotification('success', 'Successfully connected to SharePoint!');
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Load files when drive is selected or path changes
  useEffect(() => {
    if (sharePointDrive) {
      loadFilesFromSharePoint();
    }
  }, [sharePointDrive, currentPath]);
  
  // Add a manual refresh function that can be called when needed
  const refreshCurrentFolder = useCallback(async () => {
    if (sharePointDrive) {
      console.log('Manually refreshing current folder...');
      await loadFilesFromSharePoint();
    }
  }, [sharePointDrive]);

  // Simple move function using OAuth2
  const moveItem = async (itemName: string, targetPath: string[]) => {
    if (!sharePointDrive) {
      console.error('No drive selected');
      return;
    }

    try {
      console.log('Moving', itemName, 'to', targetPath.join('/'));
      
      // Construct the source path (where the item currently is)
      const sourcePath = [...currentPath, itemName].join('/');
      console.log('Source path:', sourcePath);
      console.log('Target path:', targetPath.join('/'));
      
      const response = await fetch('/api/sharepoint/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'moveItem',
          driveId: sharePointDrive.id,
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
      console.log('=== MOVE OPERATION STARTED (Copy-and-Delete) ===');
      console.log('Moving item with ID:', itemId, 'name:', itemName, 'to', targetPath.join('/'));
      
      // Show initial notification
      showNotification('info', `Moving "${itemName}" to ${targetPath.join('/')}...`);
      
      // Check if we have the required SharePoint context
      if (!sharePointDrive?.id) {
        console.error('No SharePoint drive available');
        showNotification('error', 'SharePoint drive not available. Please refresh the page and try again.');
        return;
      }
      
      if (!sharePointSite?.id) {
        console.error('No SharePoint site available');
        showNotification('error', 'SharePoint site not available. Please refresh the page and try again.');
        return;
      }
      
      // Check if this item was recently moved
      if (recentlyMovedItems.has(itemId)) {
        console.log('Item was recently moved, skipping duplicate move');
        showNotification('warning', 'Item was recently moved, skipping duplicate operation.');
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
      
      // OPTIMISTIC UPDATE: Remove the item from the current display immediately
      setDisplayFiles(prev => prev.filter(item => item.id !== itemId));
      
      const requestBody = {
        action: 'moveItem',
        itemId: itemId,
        itemName: itemName,
        folderPath: targetPath.join('/'),
        driveId: sharePointDrive?.id,
        siteId: sharePointSite?.id
      };
      
      console.log('=== MOVE REQUEST DETAILS ===');
      console.log('Move request body:', requestBody);
      console.log('Target path:', targetPath);
      console.log('SharePoint drive ID:', sharePointDrive?.id);
      console.log('SharePoint site ID:', sharePointSite?.id);
      console.log('Is virtual drive:', sharePointDrive?.id?.startsWith('virtual-'));
      console.log('Drive type:', sharePointDrive?.id?.startsWith('virtual-') ? 'Document Library' : 'Regular SharePoint Drive');
      console.log('Using copy-and-delete approach for better reliability');
      
      const response = await fetch('/api/sharepoint/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Move response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('=== MOVE SUCCESS ===');
        console.log('Item moved successfully:', result);
        
        // Check if there's a warning about the original item not being deleted
        if (result.warning) {
          console.warn('Move completed with warning:', result.warning);
          showNotification('warning', `Item moved successfully to ${targetPath.join('/')}! Note: ${result.warning}`);
        } else {
          // Show success feedback
          console.log('Item moved successfully to:', targetPath.join('/'));
          showNotification('success', `"${itemName}" moved successfully to ${targetPath.join('/')}!`);
        }
        
        // For document libraries, the move operation might take a moment to propagate
        // So we'll refresh after a short delay
        setTimeout(async () => {
          console.log('Refreshing file list after move operation...');
          await loadFilesFromSharePoint();
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('=== MOVE FAILED ===');
        console.error('Failed to move item:', response.status, errorText);
        
        // Try to parse the error for better debugging
        let errorMessage = 'Failed to move item';
        let errorDetails = '';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
          errorDetails = errorJson.details || '';
        } catch (e) {
          errorMessage = errorText;
        }
        
        console.error('Move operation failed:', {
          status: response.status,
          error: errorMessage,
          details: errorDetails,
          itemId,
          itemName,
          targetPath: targetPath.join('/'),
          driveId: sharePointDrive?.id,
          siteId: sharePointSite?.id
        });
        
        // Revert the optimistic update on error
        console.log('Reverting optimistic update due to error...');
        await loadFilesFromSharePoint();
        
        // Show error to user with more details
        const fullErrorMessage = errorDetails 
          ? `Failed to move "${itemName}": ${errorMessage}\n\nDetails: ${errorDetails}`
          : `Failed to move "${itemName}": ${errorMessage}`;
        
        showNotification('error', fullErrorMessage);
      }
    } catch (error) {
      console.error('=== MOVE ERROR ===');
      console.error('Error moving item:', error);
      
      // Revert the optimistic update on error
      console.log('Reverting optimistic update due to error...');
      await loadFilesFromSharePoint();
      
      // Show error to user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification('error', `Error moving item: ${errorMessage}`);
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
    console.log('=== NAVIGATING INTO FOLDER ===');
    console.log('Current path before navigation:', currentPath);
    console.log('Folder name to navigate into:', folderName);
    const newPath = [...currentPath, folderName];
    console.log('New path after navigation:', newPath);
    setCurrentPath(newPath);
  };

  // Create new folder in SharePoint using OAuth2
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    setIsCreatingFolder(true);
    try {
      console.log('Creating folder in SharePoint using OAuth2:', newFolderName);
      console.log('Current path:', currentPath);
      console.log('Current drive ID:', sharePointDrive?.id);
      
      // Create folder in SharePoint using OAuth2
      const response = await fetch('/api/sharepoint/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createFolder',
          folderPath: currentPath.join('/'),
          fileName: newFolderName,
          driveId: sharePointDrive?.id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }
      
      const result = await response.json();
      console.log('Folder created successfully:', result);
      
      // Add a small delay to ensure the folder is fully created before refreshing
      console.log('Waiting 1 second before refreshing file list...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // OPTIMISTIC UPDATE: Add the new folder to the display files immediately
      const newFolder = {
        name: newFolderName,
        size: 0,
        type: 'folder',
        webkitRelativePath: newFolderName,
        id: result.id || `temp-${Date.now()}`,
        webUrl: result.webUrl || '',
        downloadUrl: '',
        isFolder: true,
        folder: {},
        lastModifiedDateTime: new Date().toISOString(),
        lastModifiedBy: {
          user: {
            displayName: 'You',
            email: 'user@example.com'
          }
        },
        createdDateTime: new Date().toISOString(),
        createdBy: {
          user: {
            displayName: 'You',
            email: 'user@example.com'
          }
        },
        fileSystemInfo: {
          createdDateTime: new Date().toISOString(),
          lastModifiedDateTime: new Date().toISOString()
        }
      };
      
      // Add the new folder to the display files
      setDisplayFiles(prev => {
        // Check if folder already exists to avoid duplicates
        const exists = prev.some(f => f.name === newFolderName);
        if (exists) {
          return prev;
        }
        return [...prev, newFolder];
      });
      
      console.log('Added new folder to display files:', newFolderName);
      
      // Only refresh the file list if the optimistic update fails
      // This prevents loading items from fallback locations
      setTimeout(async () => {
        try {
          // Verify the folder was actually created by making a targeted API call
          const verifyResponse = await fetch(`/api/sharepoint/documents?action=getItems&driveId=${sharePointDrive.id}&folderPath=${currentPath.join('/')}&siteId=${sharePointSite?.id || ''}`);
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            const folderExists = verifyData.value?.some((item: any) => item.name === newFolderName);
            if (!folderExists) {
              console.log('Folder not found in verification, refreshing file list...');
              await loadFilesFromSharePoint();
            }
          }
        } catch (error) {
          console.log('Error verifying folder creation:', error);
        }
      }, 2000);
      
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
      const response = await fetch(`/api/sharepoint/documents?itemId=${file.id}&driveId=${sharePointDrive?.id}&siteId=${sharePointSite?.id}`, {
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
      const response = await fetch(`/api/sharepoint/documents?itemId=${folder.id}&driveId=${sharePointDrive?.id}&siteId=${sharePointSite?.id}`, {
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
                setDragOverTarget([...currentPath, folder.name].join('/'));
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('drop-zone-active');
                setDragOverTarget(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverTarget(null);
                const itemName = e.dataTransfer.getData('text/plain');
                const itemData = e.dataTransfer.getData('application/json');
                console.log('=== FOLDER DROP ===');
                console.log('Dropped item:', itemName, 'into folder:', folder.name);
                console.log('Current path:', currentPath);
                console.log('Item data:', itemData);
                
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
                    console.log('SharePoint drive:', sharePointDrive);
                    console.log('SharePoint site:', sharePointSite);
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
              onClick={() => handleFileOpen(file)}
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
              style={{ userSelect: 'none', cursor: 'pointer' }}
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

  const handleCloseRenameModal = () => {
    setShowRenameModal(false);
    setRenameItem(null);
    setNewItemName('');
    setIsRenaming(false);
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
    if (!contextMenu) return;
    
    // Set up the rename modal
    setRenameItem(contextMenu.item);
    setNewItemName(contextMenu.item.name);
    setShowRenameModal(true);
    setContextMenu(null);
  };

  const handleRenameItem = async () => {
    if (!renameItem || !newItemName.trim()) {
      handleCloseRenameModal();
      return;
    }
    
    // Check if the new name is the same as the current name
    if (newItemName.trim() === renameItem.name) {
      handleCloseRenameModal();
      return;
    }
    
    // Check if the new name contains invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(newItemName)) {
      alert('The name contains invalid characters. Please use only letters, numbers, spaces, and common punctuation.');
      return;
    }
    
    setIsRenaming(true);
    try {
      console.log('Renaming item:', renameItem.name, 'to:', newItemName);
      
      // Rename item in SharePoint using OAuth2
      const response = await fetch('/api/sharepoint/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'renameItem',
          itemId: renameItem.id,
          newName: newItemName,
          driveId: sharePointDrive?.id,
          siteId: sharePointSite?.id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename item');
      }
      
      const result = await response.json();
      console.log('Item renamed successfully:', result);
      
      // Update the display files optimistically
      setDisplayFiles(prev => prev.map(item => 
        item.id === renameItem.id 
          ? { ...item, name: newItemName }
          : item
      ));
      
      // Reset form and close modal
      handleCloseRenameModal();
    } catch (error) {
      console.error('Error renaming item:', error);
      alert(`Failed to rename item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRenaming(false);
    }
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
      if (clipboard.action === 'copy') {
        // Copy the item using OAuth2
        const response = await fetch('/api/sharepoint/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'copyItem',
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
  function groupFilesByFolder(files: any[]) {
    const folders: { [folder: string]: any[] } = {};
    const looseFiles: any[] = [];
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

  // State for notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    show: boolean;
  } | null>(null);

  // Function to show notifications
  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setNotification({ type, message, show: true });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Function to hide notifications
  const hideNotification = () => {
    setNotification(null);
  };

  // File opening and handling functions
  const handleFileOpen = async (file: any) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const fileType = getFileType(extension);
    
    try {
      // Get the file download URL from SharePoint
      const downloadUrl = await getFileDownloadUrl(file.id);
      
      if (!downloadUrl) {
        showNotification('error', 'Unable to get file download URL');
        return;
      }

      switch (fileType) {
        case 'image':
          handleImageOpen(file, downloadUrl);
          break;
        case 'document':
          handleDocumentOpen(file, downloadUrl);
          break;
        case 'spreadsheet':
          handleSpreadsheetOpen(file, downloadUrl);
          break;
        case 'presentation':
          handlePresentationOpen(file, downloadUrl);
          break;
        case 'pdf':
          handlePdfOpen(file, downloadUrl);
          break;
        case 'video':
          handleVideoOpen(file, downloadUrl);
          break;
        case 'audio':
          handleAudioOpen(file, downloadUrl);
          break;
        default:
          handleGenericFileOpen(file, downloadUrl);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      showNotification('error', 'Failed to open file');
    }
  };

  // Get file download URL from SharePoint
  const getFileDownloadUrl = async (fileId: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/sharepoint/documents?action=getDownloadUrl&fileId=${fileId}&driveId=${sharePointDrive?.id}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.downloadUrl || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting download URL:', error);
      return null;
    }
  };

  // File type detection
  const getFileType = (extension: string): string => {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp', 'svg'];
    const documentTypes = ['doc', 'docx', 'txt', 'rtf', 'odt'];
    const spreadsheetTypes = ['xls', 'xlsx', 'csv', 'ods'];
    const presentationTypes = ['ppt', 'pptx', 'odp'];
    const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    const audioTypes = ['mp3', 'wav', 'ogg', 'aac', 'flac'];
    
    if (imageTypes.includes(extension)) return 'image';
    if (documentTypes.includes(extension)) return 'document';
    if (spreadsheetTypes.includes(extension)) return 'spreadsheet';
    if (presentationTypes.includes(extension)) return 'presentation';
    if (extension === 'pdf') return 'pdf';
    if (videoTypes.includes(extension)) return 'video';
    if (audioTypes.includes(extension)) return 'audio';
    return 'generic';
  };

  // Handle image files
  const handleImageOpen = (file: any, downloadUrl: string) => {
    // Open image in a modal preview
    setPreviewFile({ ...file, url: downloadUrl, type: 'image' });
    setShowPreviewModal(true);
  };

  // Handle document files
  const handleDocumentOpen = (file: any, downloadUrl: string) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (extension === 'txt' || extension === 'rtf') {
      // Open text files in preview modal
      setPreviewFile({ ...file, url: downloadUrl, type: 'text' });
      setShowPreviewModal(true);
    } else {
      // Open Office documents in new tab or download
      window.open(downloadUrl, '_blank');
    }
  };

  // Handle spreadsheet files
  const handleSpreadsheetOpen = (file: any, downloadUrl: string) => {
    // Open in new tab for Excel files
    window.open(downloadUrl, '_blank');
  };

  // Handle presentation files
  const handlePresentationOpen = (file: any, downloadUrl: string) => {
    // Open in new tab for PowerPoint files
    window.open(downloadUrl, '_blank');
  };

  // Handle PDF files
  const handlePdfOpen = (file: any, downloadUrl: string) => {
    // Open PDF in preview modal or new tab
    setPreviewFile({ ...file, url: downloadUrl, type: 'pdf' });
    setShowPreviewModal(true);
  };

  // Handle video files
  const handleVideoOpen = (file: any, downloadUrl: string) => {
    // Open video in preview modal
    setPreviewFile({ ...file, url: downloadUrl, type: 'video' });
    setShowPreviewModal(true);
  };

  // Handle audio files
  const handleAudioOpen = (file: any, downloadUrl: string) => {
    // Open audio in preview modal
    setPreviewFile({ ...file, url: downloadUrl, type: 'audio' });
    setShowPreviewModal(true);
  };

  // Handle generic files
  const handleGenericFileOpen = (file: any, downloadUrl: string) => {
    // Download the file
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download file function
  const handleFileDownload = async (file: any) => {
    try {
      if (!sharePointDrive?.id) {
        showNotification('error', 'SharePoint drive not available');
        return;
      }
      
      // Use the new backend download endpoint to avoid CORS issues
      const downloadUrl = `/api/sharepoint/documents?action=downloadFile&fileId=${encodeURIComponent(file.id)}&driveId=${encodeURIComponent(sharePointDrive.id)}&fileName=${encodeURIComponent(file.name)}`;
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name;
      link.style.display = 'none';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification('success', `Downloaded ${file.name}`);
    } catch (error) {
      console.error('Error downloading file:', error);
      showNotification('error', 'Failed to download file');
    }
  };

  return (
    <div className="h-screen bg-blue-400">
      {/* Notification Component */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full p-4 rounded-lg shadow-lg border ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {notification.type === 'success' && (
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {notification.type === 'warning' && (
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              {notification.type === 'info' && (
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button
              onClick={hideNotification}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex h-full">
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
            <div className="flex items-center justify-between mb-4">
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
                  Refresh
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
                      console.log('Starting SharePoint authentication...');
                      const response = await fetch('/api/sharepoint/auth?action=login');
                      const data = await response.json();
                      
                      if (data.authUrl) {
                        console.log('Redirecting to SharePoint authentication:', data.authUrl);
                        showNotification('info', 'Redirecting to Microsoft authentication...');
                        window.location.href = data.authUrl;
                      } else {
                        console.error('No auth URL received:', data);
                        showNotification('error', 'Failed to start authentication. Please try again.');
                      }
                    } catch (error) {
                      console.error('Error starting auth:', error);
                      showNotification('error', 'Failed to start authentication. Please try again.');
                    }
                  }}
                  className="bg-white text-blue-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-lg flex items-center gap-1.5"
                >
                  <HiShare className="w-4 h-4" />
                  {sharePointSite ? 'Reconnect' : 'Sign In'}
                </button>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg shadow-lg mt-4 p-4"
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
              <div>
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
                        console.log('Dropped item:', itemName, 'onto Files (root)');
                        
                        if (itemName && itemData) {
                          try {
                            const item = JSON.parse(itemData);
                            console.log('Moving item to root');
                            console.log('Item data:', item);
                            moveItemWithId(item.id, item.name, []);
                          } catch (error) {
                            console.error('Error parsing item data:', error);
                          }
                        }
                        
                        e.currentTarget.classList.remove('bg-blue-100', 'text-blue-700', 'border', 'border-blue-300');
                      }}
                      className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-lg font-semibold transition-all duration-200 text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <HiHome className="w-5 h-5" />
                      <span>Files</span>
                    </button>
                    {currentPath.length > 0 && (
                      <>
                        <HiChevronRight className="w-4 h-4 text-gray-400" />
                        <SharePointBreadcrumb
                          path={currentPath}
                          onNavigate={navigateToLevel}
                          onDragOver={(e, targetPath) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            e.currentTarget.classList.add('bg-blue-100', 'text-blue-700', 'border', 'border-blue-300');
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.classList.remove('bg-blue-100', 'text-blue-700', 'border', 'border-blue-300');
                          }}
                          onDrop={(e, targetPath) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const itemName = e.dataTransfer.getData('text/plain');
                            const itemData = e.dataTransfer.getData('application/json');
                            console.log('Dropped item:', itemName, 'onto path:', targetPath.join('/'));
                            
                            if (itemName && itemData) {
                              try {
                                const item = JSON.parse(itemData);
                                console.log('Moving item to path:', targetPath);
                                console.log('Item data:', item);
                                moveItemWithId(item.id, item.name, targetPath);
                              } catch (error) {
                                console.error('Error parsing item data:', error);
                              }
                            }
                            
                            e.currentTarget.classList.remove('bg-blue-100', 'text-blue-700', 'border', 'border-blue-300');
                          }}
                          dragOverTarget={dragOverTarget}
                        />
                      </>
                    )}
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading files...</p>
                    </div>
                  </div>
                ) : displayFiles.length > 0 ? (
                  <div
                    onDragOver={(e) => {
                      console.log('Inner container drag over');
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverTarget(currentPath.join('/'));
                    }}
                    onDrop={(e) => {
                      console.log('Inner container drop');
                      setDragOverTarget(null);
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
                    <CurrentFolderView node={{ name: '', files: [], subfolders: {} }} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <HiDocument className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No files uploaded yet</p>
                      <p className="text-sm text-gray-400">Upload your first files using the button above</p>
                    </div>
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
                      To upload a folder with its structure, please use the &quot;Browse files or folders&quot; button below.
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

          {/* Rename Modal */}
          {showRenameModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Rename {renameItem?.isFolder ? 'Folder' : 'File'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter a new name for &quot;{renameItem?.name}&quot;
                  </p>
                  
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Enter new name..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRenameItem();
                      } else if (e.key === 'Escape') {
                        handleCloseRenameModal();
                      }
                    }}
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCloseRenameModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={isRenaming}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRenameItem}
                    disabled={isRenaming || !newItemName.trim() || newItemName === renameItem?.name}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRenaming ? "Renaming..." : "Rename"}
                  </button>
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
                <HiPencil className="w-4 h-4" />
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

          {/* Preview Modal */}
          {showPreviewModal && previewFile && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <motion.div
                className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800">{previewFile.name}</h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleFileDownload(previewFile)}
                      className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
                    >
                      <HiDownload className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <HiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
                  {previewFile.type === 'image' && (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={previewFile.url} 
                        alt={previewFile.name}
                        className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik02MCAxMDBDNjAgODkuNTQ0NyA2OC4wMDAxIDgxIDc4IDgxQzg3Ljk5OTkgODEgOTYgODkuNTQ0NyA5NiAxMDBDOTYgMTEwLjQ1NSA4Ny45OTk5IDExOSA3OCAxMTlDNjguMDAwMSAxMTkgNjAgMTEwLjQ1NSA2MCAxMDBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0xNDAgMTAwQzE0MCA4OS41NDQ3IDE0OC4wMDEgODEgMTU4IDgxQzE2Ny45OTkgODEgMTc2IDg5LjU0NDcgMTc2IDEwMEMxNzYgMTEwLjQ1NSAxNjcuOTk5IDExOSAxNTggMTE5QzE0OC4wMDEgMTE5IDE0MCAxMTAuNDU1IDE0MCAxMDBaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo=';
                        }}
                      />
                    </div>
                  )}
                  
                  {previewFile.type === 'pdf' && (
                    <div className="w-full h-[70vh]">
                      <iframe
                        src={`${previewFile.url}#toolbar=0`}
                        className="w-full h-full border-0 rounded-lg"
                        title={previewFile.name}
                      />
                    </div>
                  )}
                  
                  {previewFile.type === 'video' && (
                    <div className="flex justify-center">
                      <video 
                        controls 
                        className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
                        src={previewFile.url}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                  
                  {previewFile.type === 'audio' && (
                    <div className="flex justify-center">
                      <audio 
                        controls 
                        className="w-full max-w-md"
                        src={previewFile.url}
                      >
                        Your browser does not support the audio tag.
                      </audio>
                    </div>
                  )}
                  
                  {previewFile.type === 'text' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                        {/* Text content will be loaded here */}
                        Loading text content...
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* Drag and drop visual feedback styles */}
          <style jsx>{`
            .drop-zone-active {
              background-color: rgba(59, 130, 246, 0.1) !important;
              border-color: rgb(59, 130, 246) !important;
              border-width: 2px !important;
            }
            
            .dragging {
              opacity: 0.5;
              transform: scale(0.95);
            }
          `}</style>
        </motion.div>
      </div>
    </div>
  );
} 