"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { sharePointClient, SharePointItem, SharePointDrive, SharePointSite } from '../sharepoint';

interface SharePointContextType {
  // Sites and Drives
  sites: SharePointSite[];
  drives: SharePointDrive[];
  currentSite: SharePointSite | null;
  currentDrive: SharePointDrive | null;
  
  // Items
  items: SharePointItem[];
  currentPath: string[];
  
  // Loading states
  loading: boolean;
  uploading: boolean;
  
  // Actions
  loadSites: () => Promise<void>;
  loadDrives: (siteId: string) => Promise<void>;
  loadItems: (driveId: string, folderPath?: string) => Promise<void>;
  uploadFile: (file: File, folderPath?: string) => Promise<SharePointItem>;
  createFolder: (name: string, folderPath?: string) => Promise<SharePointItem>;
  moveItem: (itemId: string, targetPath: string) => Promise<SharePointItem>;
  deleteItem: (itemId: string) => Promise<void>;
  searchItems: (query: string) => Promise<SharePointItem[]>;
  
  // Navigation
  navigateToPath: (path: string[]) => void;
  navigateToParent: () => void;
  navigateToRoot: () => void;
  
  // Selection
  selectedItems: SharePointItem[];
  selectItem: (item: SharePointItem) => void;
  deselectItem: (item: SharePointItem) => void;
  clearSelection: () => void;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

const SharePointContext = createContext<SharePointContextType | undefined>(undefined);

interface SharePointProviderProps {
  children: ReactNode;
  defaultSiteId?: string;
  defaultDriveId?: string;
}

export function SharePointProvider({ children, defaultSiteId, defaultDriveId }: SharePointProviderProps) {
  const [sites, setSites] = useState<SharePointSite[]>([]);
  const [drives, setDrives] = useState<SharePointDrive[]>([]);
  const [currentSite, setCurrentSite] = useState<SharePointSite | null>(null);
  const [currentDrive, setCurrentDrive] = useState<SharePointDrive | null>(null);
  const [items, setItems] = useState<SharePointItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SharePointItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const loadSites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const sitesData = await sharePointClient.getSites();
      setSites(sitesData);
      
      // Set default site if provided
      if (defaultSiteId && sitesData.length > 0) {
        const defaultSite = sitesData.find(site => site.id === defaultSiteId);
        if (defaultSite) {
          setCurrentSite(defaultSite);
          await loadDrives(defaultSite.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sites');
    } finally {
      setLoading(false);
    }
  }, [defaultSiteId]);

  const loadDrives = useCallback(async (siteId: string) => {
    try {
      setLoading(true);
      setError(null);
      const drivesData = await sharePointClient.getDrives(siteId);
      setDrives(drivesData);
      
      // Set default drive if provided
      if (defaultDriveId && drivesData.length > 0) {
        const defaultDrive = drivesData.find(drive => drive.id === defaultDriveId);
        if (defaultDrive) {
          setCurrentDrive(defaultDrive);
          await loadItems(defaultDrive.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drives');
    } finally {
      setLoading(false);
    }
  }, [defaultDriveId]);

  const loadItems = useCallback(async (driveId: string, folderPath: string = '') => {
    try {
      setLoading(true);
      setError(null);
      const itemsData = await sharePointClient.getItems(driveId, folderPath);
      setItems(itemsData);
      setCurrentDrive(drives.find(d => d.id === driveId) || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [drives]);

  const uploadFile = useCallback(async (file: File, folderPath: string = ''): Promise<SharePointItem> => {
    if (!currentDrive) {
      throw new Error('No drive selected');
    }

    try {
      setUploading(true);
      setError(null);
      
      const arrayBuffer = await file.arrayBuffer();
      const result = await sharePointClient.uploadFile(
        currentDrive.id,
        folderPath,
        file.name,
        arrayBuffer
      );
      
      // Refresh items after upload
      await loadItems(currentDrive.id, folderPath);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [currentDrive, loadItems]);

  const createFolder = useCallback(async (name: string, folderPath: string = ''): Promise<SharePointItem> => {
    if (!currentDrive) {
      throw new Error('No drive selected');
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await sharePointClient.createFolder(
        currentDrive.id,
        folderPath,
        name
      );
      
      // Refresh items after creating folder
      await loadItems(currentDrive.id, folderPath);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create folder';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentDrive, loadItems]);

  const moveItem = useCallback(async (itemId: string, targetPath: string): Promise<SharePointItem> => {
    if (!currentDrive) {
      throw new Error('No drive selected');
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await sharePointClient.moveItem(
        currentDrive.id,
        itemId,
        targetPath
      );
      
      // Refresh items after move
      await loadItems(currentDrive.id, currentPath.join('/'));
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move item';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentDrive, currentPath, loadItems]);

  const deleteItem = useCallback(async (itemId: string): Promise<void> => {
    if (!currentDrive) {
      throw new Error('No drive selected');
    }

    try {
      setLoading(true);
      setError(null);
      
      await sharePointClient.deleteItem(currentDrive.id, itemId);
      
      // Refresh items after delete
      await loadItems(currentDrive.id, currentPath.join('/'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete item';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentDrive, currentPath, loadItems]);

  const searchItems = useCallback(async (query: string): Promise<SharePointItem[]> => {
    if (!currentDrive) {
      throw new Error('No drive selected');
    }

    try {
      setError(null);
      return await sharePointClient.searchItems(currentDrive.id, query);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search items';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentDrive]);

  const navigateToPath = useCallback((path: string[]) => {
    setCurrentPath(path);
    if (currentDrive) {
      loadItems(currentDrive.id, path.join('/'));
    }
  }, [currentDrive, loadItems]);

  const navigateToParent = useCallback(() => {
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1);
      navigateToPath(newPath);
    }
  }, [currentPath, navigateToPath]);

  const navigateToRoot = useCallback(() => {
    navigateToPath([]);
  }, [navigateToPath]);

  const selectItem = useCallback((item: SharePointItem) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev;
      return [...prev, item];
    });
  }, []);

  const deselectItem = useCallback((item: SharePointItem) => {
    setSelectedItems(prev => prev.filter(i => i.id !== item.id));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  const value: SharePointContextType = {
    sites,
    drives,
    currentSite,
    currentDrive,
    items,
    currentPath,
    loading,
    uploading,
    loadSites,
    loadDrives,
    loadItems,
    uploadFile,
    createFolder,
    moveItem,
    deleteItem,
    searchItems,
    navigateToPath,
    navigateToParent,
    navigateToRoot,
    selectedItems,
    selectItem,
    deselectItem,
    clearSelection,
    error,
    clearError,
  };

  return (
    <SharePointContext.Provider value={value}>
      {children}
    </SharePointContext.Provider>
  );
}

export function useSharePoint() {
  const context = useContext(SharePointContext);
  if (context === undefined) {
    throw new Error('useSharePoint must be used within a SharePointProvider');
  }
  return context;
} 