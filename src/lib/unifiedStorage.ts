// Unified Storage System for ThinkComplAI
// Supports both Firebase and SharePoint with SharePoint as primary

import { sharePointClient, SharePointItem, SharePointDrive, SharePointSite } from './sharepoint';

export interface UnifiedFileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  uploadedAt: Date;
  url?: string;
  isFolder: boolean;
  parentId?: string;
  children?: UnifiedFileItem[];
  metadata?: Record<string, any>;
  source: 'sharepoint' | 'firebase';
}

export interface UnifiedStorageConfig {
  primaryStorage: 'sharepoint' | 'firebase';
  enableSync: boolean;
  cacheEnabled: boolean;
  maxCacheAge: number; // milliseconds
}

class UnifiedStorage {
  private config: UnifiedStorageConfig;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private syncQueue: Array<() => Promise<void>> = [];

  constructor(config: Partial<UnifiedStorageConfig> = {}) {
    this.config = {
      primaryStorage: 'sharepoint',
      enableSync: true,
      cacheEnabled: true,
      maxCacheAge: 5 * 60 * 1000, // 5 minutes
      ...config
    };
  }

  // Cache management
  private getCacheKey(operation: string, params: any): string {
    return `${operation}_${JSON.stringify(params)}`;
  }

  private getCached<T>(key: string): T | null {
    if (!this.config.cacheEnabled) return null;
    
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.config.maxCacheAge) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    if (!this.config.cacheEnabled) return;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      const keys = Array.from(this.cache.keys());
      for (const key of keys) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Unified file operations
  async getFiles(folderPath: string = ''): Promise<UnifiedFileItem[]> {
    const cacheKey = this.getCacheKey('getFiles', { folderPath });
    const cached = this.getCached<UnifiedFileItem[]>(cacheKey);
    
    if (cached) return cached;

    try {
      if (this.config.primaryStorage === 'sharepoint') {
        const items = await this.getSharePointFiles(folderPath);
        this.setCache(cacheKey, items);
        return items;
      } else {
        const items = await this.getFirebaseFiles(folderPath);
        this.setCache(cacheKey, items);
        return items;
      }
    } catch (error) {
      console.error('Error getting files:', error);
      throw error;
    }
  }

  async uploadFile(file: File, folderPath: string = ''): Promise<UnifiedFileItem> {
    try {
      if (this.config.primaryStorage === 'sharepoint') {
        const result = await this.uploadToSharePoint(file, folderPath);
        
        // Sync to Firebase if enabled
        if (this.config.enableSync) {
          this.queueSync(() => this.syncToFirebase(result));
        }
        
        this.clearCache('getFiles');
        return result;
      } else {
        const result = await this.uploadToFirebase(file, folderPath);
        
        // Sync to SharePoint if enabled
        if (this.config.enableSync) {
          this.queueSync(() => this.syncToSharePoint(result));
        }
        
        this.clearCache('getFiles');
        return result;
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async moveFile(fileId: string, sourcePath: string, targetPath: string): Promise<UnifiedFileItem> {
    try {
      if (this.config.primaryStorage === 'sharepoint') {
        const result = await this.moveInSharePoint(fileId, targetPath);
        
        if (this.config.enableSync) {
          this.queueSync(() => this.syncMoveToFirebase(fileId, sourcePath, targetPath));
        }
        
        this.clearCache('getFiles');
        return result;
      } else {
        const result = await this.moveInFirebase(fileId, sourcePath, targetPath);
        
        if (this.config.enableSync) {
          this.queueSync(() => this.syncMoveToSharePoint(fileId, sourcePath, targetPath));
        }
        
        this.clearCache('getFiles');
        return result;
      }
    } catch (error) {
      console.error('Error moving file:', error);
      throw error;
    }
  }

  async deleteFile(fileId: string, path: string): Promise<void> {
    try {
      if (this.config.primaryStorage === 'sharepoint') {
        await this.deleteFromSharePoint(fileId);
        
        if (this.config.enableSync) {
          this.queueSync(() => this.syncDeleteToFirebase(fileId, path));
        }
      } else {
        await this.deleteFromFirebase(fileId, path);
        
        if (this.config.enableSync) {
          this.queueSync(() => this.syncDeleteToSharePoint(fileId, path));
        }
      }
      
      this.clearCache('getFiles');
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async createFolder(name: string, folderPath: string = ''): Promise<UnifiedFileItem> {
    try {
      if (this.config.primaryStorage === 'sharepoint') {
        const result = await this.createFolderInSharePoint(name, folderPath);
        
        if (this.config.enableSync) {
          this.queueSync(() => this.syncFolderToFirebase(result));
        }
        
        this.clearCache('getFiles');
        return result;
      } else {
        const result = await this.createFolderInFirebase(name, folderPath);
        
        if (this.config.enableSync) {
          this.queueSync(() => this.syncFolderToSharePoint(result));
        }
        
        this.clearCache('getFiles');
        return result;
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  // SharePoint operations
  private async getSharePointFiles(folderPath: string): Promise<UnifiedFileItem[]> {
    // This would need the current drive ID - in a real implementation, you'd get this from context
    const driveId = process.env.SHAREPOINT_DEFAULT_DRIVE_ID;
    if (!driveId) {
      throw new Error('SharePoint drive ID not configured');
    }

    const items = await sharePointClient.getItems(driveId, folderPath);
    
    return items.map(item => ({
      id: item.id,
      name: item.name,
      path: folderPath ? `${folderPath}/${item.name}` : item.name,
      size: item.size || 0,
      type: sharePointClient.getFileType(item),
      uploadedAt: new Date(item.createdDateTime),
      url: sharePointClient.getDownloadUrl(item) || undefined,
      isFolder: sharePointClient.isFolder(item),
      source: 'sharepoint' as const,
      metadata: {
        lastModified: item.lastModifiedDateTime,
        webUrl: item.webUrl,
        ...(sharePointClient.isFolder(item) && { childCount: item.folder?.childCount })
      }
    }));
  }

  private async uploadToSharePoint(file: File, folderPath: string): Promise<UnifiedFileItem> {
    const driveId = process.env.SHAREPOINT_DEFAULT_DRIVE_ID;
    if (!driveId) {
      throw new Error('SharePoint drive ID not configured');
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await sharePointClient.uploadFile(driveId, folderPath, file.name, arrayBuffer);
    
    return {
      id: result.id,
      name: result.name,
      path: folderPath ? `${folderPath}/${result.name}` : result.name,
      size: result.size || file.size,
      type: sharePointClient.getFileType(result),
      uploadedAt: new Date(result.createdDateTime),
      url: sharePointClient.getDownloadUrl(result) || undefined,
      isFolder: false,
      source: 'sharepoint' as const,
      metadata: {
        lastModified: result.lastModifiedDateTime,
        webUrl: result.webUrl
      }
    };
  }

  private async moveInSharePoint(fileId: string, targetPath: string): Promise<UnifiedFileItem> {
    const driveId = process.env.SHAREPOINT_DEFAULT_DRIVE_ID;
    if (!driveId) {
      throw new Error('SharePoint drive ID not configured');
    }

    const result = await sharePointClient.moveItem(driveId, fileId, targetPath);
    
    return {
      id: result.id,
      name: result.name,
      path: targetPath ? `${targetPath}/${result.name}` : result.name,
      size: result.size || 0,
      type: sharePointClient.getFileType(result),
      uploadedAt: new Date(result.createdDateTime),
      url: sharePointClient.getDownloadUrl(result) || undefined,
      isFolder: sharePointClient.isFolder(result),
      source: 'sharepoint' as const,
      metadata: {
        lastModified: result.lastModifiedDateTime,
        webUrl: result.webUrl
      }
    };
  }

  private async deleteFromSharePoint(fileId: string): Promise<void> {
    const driveId = process.env.SHAREPOINT_DEFAULT_DRIVE_ID;
    if (!driveId) {
      throw new Error('SharePoint drive ID not configured');
    }

    await sharePointClient.deleteItem(driveId, fileId);
  }

  private async createFolderInSharePoint(name: string, folderPath: string): Promise<UnifiedFileItem> {
    const driveId = process.env.SHAREPOINT_DEFAULT_DRIVE_ID;
    if (!driveId) {
      throw new Error('SharePoint drive ID not configured');
    }

    const result = await sharePointClient.createFolder(driveId, folderPath, name);
    
    return {
      id: result.id,
      name: result.name,
      path: folderPath ? `${folderPath}/${result.name}` : result.name,
      size: 0,
      type: 'Folder',
      uploadedAt: new Date(result.createdDateTime),
      url: result.webUrl,
      isFolder: true,
      source: 'sharepoint' as const,
      metadata: {
        lastModified: result.lastModifiedDateTime,
        webUrl: result.webUrl,
        childCount: result.folder?.childCount || 0
      }
    };
  }

  // Firebase operations (for sync/fallback)
  private async getFirebaseFiles(folderPath: string): Promise<UnifiedFileItem[]> {
    const response = await fetch('/api/files');
    if (!response.ok) {
      throw new Error('Failed to fetch Firebase files');
    }
    
    const data = await response.json();
    return data.files.map((file: any) => ({
      id: file.id,
      name: file.name,
      path: file.path || file.name,
      size: file.size || 0,
      type: file.type || 'application/octet-stream',
      uploadedAt: new Date(file.uploadedAt || Date.now()),
      url: file.url,
      isFolder: file.type === 'folder',
      source: 'firebase' as const,
      metadata: file.metadata || {}
    }));
  }

  private async uploadToFirebase(file: File, folderPath: string): Promise<UnifiedFileItem> {
    const response = await fetch('/api/files/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        sourcePath: null,
        targetPath: folderPath ? `${folderPath}/${file.name}` : file.name,
        fileData: {
          size: file.size,
          type: file.type,
          url: ''
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to upload to Firebase');
    }

    const result = await response.json();
    
    return {
      id: result.newFileId,
      name: file.name,
      path: folderPath ? `${folderPath}/${file.name}` : file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      url: '',
      isFolder: false,
      source: 'firebase' as const,
      metadata: {}
    };
  }

  private async moveInFirebase(fileId: string, sourcePath: string, targetPath: string): Promise<UnifiedFileItem> {
    // This would need to be implemented based on your Firebase structure
    throw new Error('Firebase move operation not implemented');
  }

  private async deleteFromFirebase(fileId: string, path: string): Promise<void> {
    const response = await fetch('/api/files/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: fileId, path })
    });

    if (!response.ok) {
      throw new Error('Failed to delete from Firebase');
    }
  }

  private async createFolderInFirebase(name: string, folderPath: string): Promise<UnifiedFileItem> {
    // This would need to be implemented based on your Firebase structure
    throw new Error('Firebase folder creation not implemented');
  }

  // Sync operations
  private queueSync(syncOperation: () => Promise<void>): void {
    this.syncQueue.push(syncOperation);
    
    // Process sync queue in background
    if (this.syncQueue.length === 1) {
      this.processSyncQueue();
    }
  }

  private async processSyncQueue(): Promise<void> {
    while (this.syncQueue.length > 0) {
      const operation = this.syncQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('Sync operation failed:', error);
        }
      }
    }
  }

  // Sync implementations (simplified)
  private async syncToFirebase(item: UnifiedFileItem): Promise<void> {
    // Implement Firebase sync
    console.log('Syncing to Firebase:', item.name);
  }

  private async syncToSharePoint(item: UnifiedFileItem): Promise<void> {
    // Implement SharePoint sync
    console.log('Syncing to SharePoint:', item.name);
  }

  private async syncMoveToFirebase(fileId: string, sourcePath: string, targetPath: string): Promise<void> {
    console.log('Syncing move to Firebase:', fileId);
  }

  private async syncMoveToSharePoint(fileId: string, sourcePath: string, targetPath: string): Promise<void> {
    console.log('Syncing move to SharePoint:', fileId);
  }

  private async syncDeleteToFirebase(fileId: string, path: string): Promise<void> {
    console.log('Syncing delete to Firebase:', fileId);
  }

  private async syncDeleteToSharePoint(fileId: string, path: string): Promise<void> {
    console.log('Syncing delete to SharePoint:', fileId);
  }

  private async syncFolderToFirebase(item: UnifiedFileItem): Promise<void> {
    console.log('Syncing folder to Firebase:', item.name);
  }

  private async syncFolderToSharePoint(item: UnifiedFileItem): Promise<void> {
    console.log('Syncing folder to SharePoint:', item.name);
  }

  // Configuration methods
  updateConfig(newConfig: Partial<UnifiedStorageConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  clearAllCache(): void {
    this.cache.clear();
  }

  getConfig(): UnifiedStorageConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const unifiedStorage = new UnifiedStorage({
  primaryStorage: 'sharepoint',
  enableSync: false, // Disable sync for now to avoid conflicts
  cacheEnabled: true,
  maxCacheAge: 2 * 60 * 1000 // 2 minutes
}); 