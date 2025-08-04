// SharePoint Client Library - Optimized for ThinkComplAI
export interface SharePointItem {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime: string;
  createdDateTime: string;
  webUrl: string;
  '@microsoft.graph.downloadUrl'?: string;
  folder?: {
    childCount: number;
  };
  file?: {
    mimeType: string;
  };
}

export interface SharePointDrive {
  id: string;
  name: string;
  description?: string;
  webUrl: string;
}

export interface SharePointSite {
  id: string;
  name: string;
  webUrl: string;
  displayName: string;
}

export interface SharePointUploadSession {
  uploadUrl: string;
  expirationDateTime: string;
  nextExpectedRanges: string[];
}

export interface SharePointError {
  error: {
    code: string;
    message: string;
    innerError?: any;
  };
}

// Enhanced cache for SharePoint responses with better invalidation
class SharePointCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 5 * 60 * 1000) { // 5 minutes default
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  // Improved cache invalidation with pattern matching
  invalidate(pattern: string) {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  // Invalidate all drive-related caches
  invalidateDrive(driveId: string) {
    this.invalidate(`items_${driveId}`);
    this.invalidate(`search_${driveId}`);
  }
  
  // Invalidate specific folder caches
  invalidateFolder(driveId: string, folderPath: string) {
    this.invalidate(`items_${driveId}_${folderPath}`);
  }
}

class SharePointClient {
  private baseUrl = '/api/sharepoint';
  private cache = new SharePointCache();
  private uploadSessions = new Map<string, SharePointUploadSession>();
  
  // Retry configuration
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  // Get access token with caching
  private async getAccessToken(): Promise<string> {
    const cacheKey = 'access_token';
    let token = this.cache.get(cacheKey);
    
    if (!token) {
      const response = await fetch(`${this.baseUrl}/auth/token`);
      if (!response.ok) {
        throw new Error('Failed to get SharePoint access token');
      }
      const data = await response.json();
      token = data.access_token;
      this.cache.set(cacheKey, token, 50 * 60 * 1000); // Cache for 50 minutes
    }
    
    return token;
  }

  // Enhanced retry wrapper for API calls with better error handling
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(`SharePoint operation failed (attempt ${attempt}):`, error);
        
        if (attempt === this.maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
    
    throw lastError!;
  }

  // Get all sites with caching
  async getSites(): Promise<SharePointSite[]> {
    const cacheKey = 'sites';
    let sites = this.cache.get(cacheKey);
    
    if (!sites) {
      sites = await this.withRetry(async () => {
        const response = await fetch(`${this.baseUrl}?action=getSites`);
        if (!response.ok) throw new Error('Failed to fetch sites');
        const data = await response.json();
        return data.value || [];
      });
      
      this.cache.set(cacheKey, sites, 10 * 60 * 1000); // Cache for 10 minutes
    }
    
    return sites;
  }

  // Get drives (document libraries) for a site with caching
  async getDrives(siteId: string): Promise<SharePointDrive[]> {
    const cacheKey = `drives_${siteId}`;
    let drives = this.cache.get(cacheKey);
    
    if (!drives) {
      drives = await this.withRetry(async () => {
        const response = await fetch(`${this.baseUrl}?action=getDrives&siteId=${siteId}`);
        if (!response.ok) throw new Error('Failed to fetch drives');
        const data = await response.json();
        return data.value || [];
      });
      
      this.cache.set(cacheKey, drives, 5 * 60 * 1000); // Cache for 5 minutes
    }
    
    return drives;
  }

  // Get items in a folder with intelligent caching
  async getItems(driveId: string, folderPath: string = ''): Promise<SharePointItem[]> {
    const cacheKey = `items_${driveId}_${folderPath}`;
    let items = this.cache.get(cacheKey);
    
    if (!items) {
      items = await this.withRetry(async () => {
        const response = await fetch(
          `${this.baseUrl}?action=getItems&driveId=${driveId}&folderPath=${encodeURIComponent(folderPath)}`
        );
        if (!response.ok) throw new Error('Failed to fetch items');
        const data = await response.json();
        return data.value || [];
      });
      
      // Cache for shorter time for dynamic content
      this.cache.set(cacheKey, items, 2 * 60 * 1000); // Cache for 2 minutes
    }
    
    return items;
  }

  // Upload file with chunked upload for large files
  async uploadFile(driveId: string, folderPath: string, fileName: string, fileContent: ArrayBuffer): Promise<SharePointItem> {
    const fileSize = fileContent.byteLength;
    const chunkSize = 4 * 1024 * 1024; // 4MB chunks (SharePoint recommended)
    
    if (fileSize <= chunkSize) {
      // Small file - direct upload
      return await this.withRetry(async () => {
        const response = await fetch(`${this.baseUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'uploadFile',
            driveId,
            folderPath,
            fileName,
            fileContent: Array.from(new Uint8Array(fileContent)),
          }),
        });
        
        if (!response.ok) throw new Error('Failed to upload file');
        const result = response.json();
        
        // Invalidate cache for the folder where file was uploaded
        this.cache.invalidateFolder(driveId, folderPath);
        
        return result;
      });
    } else {
      // Large file - chunked upload
      return await this.uploadLargeFile(driveId, folderPath, fileName, fileContent, chunkSize);
    }
  }

  // Chunked upload for large files
  private async uploadLargeFile(
    driveId: string, 
    folderPath: string, 
    fileName: string, 
    fileContent: ArrayBuffer, 
    chunkSize: number
  ): Promise<SharePointItem> {
    const totalChunks = Math.ceil(fileContent.byteLength / chunkSize);
    
    // Create upload session
    const session = await this.createUploadSession(driveId, folderPath, fileName);
    this.uploadSessions.set(fileName, session);
    
    try {
      // Upload chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, fileContent.byteLength);
        const chunk = fileContent.slice(start, end);
        
        await this.uploadChunk(session.uploadUrl, chunk, chunkIndex, totalChunks);
      }
      
      // Complete upload
      const result = await this.completeUpload(session.uploadUrl);
      
      // Invalidate cache for the folder where file was uploaded
      this.cache.invalidateFolder(driveId, folderPath);
      
      return result;
    } finally {
      this.uploadSessions.delete(fileName);
    }
  }

  // Create upload session for large files
  private async createUploadSession(driveId: string, folderPath: string, fileName: string): Promise<SharePointUploadSession> {
    const response = await fetch(`${this.baseUrl}/upload/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        driveId,
        folderPath,
        fileName,
      }),
    });
    
    if (!response.ok) throw new Error('Failed to create upload session');
    return response.json();
  }

  // Upload a single chunk
  private async uploadChunk(uploadUrl: string, chunk: ArrayBuffer, chunkIndex: number, totalChunks: number): Promise<void> {
    const start = chunkIndex * chunk.byteLength;
    const end = start + chunk.byteLength - 1;
    
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': chunk.byteLength.toString(),
        'Content-Range': `bytes ${start}-${end}/${totalChunks * chunk.byteLength}`,
      },
      body: chunk,
    });
    
    if (!response.ok) throw new Error(`Failed to upload chunk ${chunkIndex}`);
  }

  // Complete upload session
  private async completeUpload(uploadUrl: string): Promise<SharePointItem> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': '0',
      },
    });
    
    if (!response.ok) throw new Error('Failed to complete upload');
    return response.json();
  }

  // Create a new folder
  async createFolder(driveId: string, folderPath: string, folderName: string): Promise<SharePointItem> {
    const result = await this.withRetry(async () => {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createFolder',
          driveId,
          folderPath,
          fileName: folderName,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create folder');
      return response.json();
    });
    
    // Invalidate cache for the parent folder
    this.cache.invalidateFolder(driveId, folderPath);
    
    return result;
  }

  // Enhanced move item with better error handling and cache invalidation
  async moveItem(driveId: string, itemId: string, targetFolderPath: string): Promise<SharePointItem> {
    console.log(`Moving item ${itemId} to ${targetFolderPath}`);
    
    const result = await this.withRetry(async () => {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'moveItem',
          driveId,
          itemId,
          folderPath: targetFolderPath,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to move item: ${errorData.error || response.statusText}`);
      }
      
      return response.json();
    });
    
    // Invalidate all drive caches since items could be moved anywhere
    this.cache.invalidateDrive(driveId);
    
    console.log('Move operation completed successfully');
    return result;
  }

  // Delete an item
  async deleteItem(driveId: string, itemId: string): Promise<void> {
    await this.withRetry(async () => {
      const response = await fetch(`${this.baseUrl}?driveId=${driveId}&itemId=${itemId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete item');
    });
    
    // Invalidate all drive caches since items could be deleted from anywhere
    this.cache.invalidateDrive(driveId);
  }

  // Search items
  async searchItems(driveId: string, query: string): Promise<SharePointItem[]> {
    const cacheKey = `search_${driveId}_${query}`;
    let results = this.cache.get(cacheKey);
    
    if (!results) {
      results = await this.withRetry(async () => {
        const response = await fetch(`${this.baseUrl}/search?driveId=${driveId}&q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to search items');
        const data = await response.json();
        return data.value || [];
      });
      
      this.cache.set(cacheKey, results, 1 * 60 * 1000); // Cache for 1 minute
    }
    
    return results;
  }

  // Get file download URL
  getDownloadUrl(item: SharePointItem): string | null {
    return item['@microsoft.graph.downloadUrl'] || null;
  }

  // Check if item is a folder
  isFolder(item: SharePointItem): boolean {
    return 'folder' in item;
  }

  // Check if item is a file
  isFile(item: SharePointItem): boolean {
    return 'file' in item;
  }

  // Get file type
  getFileType(item: SharePointItem): string {
    if (this.isFolder(item)) {
      return 'Folder';
    }
    if (this.isFile(item)) {
      const extension = item.name.split('.').pop()?.toUpperCase();
      return extension || 'File';
    }
    return 'Unknown';
  }

  // Get file size
  getFileSize(item: SharePointItem): string {
    if (this.isFolder(item)) {
      return `${item.folder?.childCount || 0} items`;
    }
    if (this.isFile(item) && item.size) {
      return this.formatFileSize(item.size);
    }
    return 'Unknown';
  }

  // Format file size
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get upload progress for large files
  getUploadProgress(fileName: string): number {
    const session = this.uploadSessions.get(fileName);
    if (!session) return 0;
    
    // This would need to be implemented with actual progress tracking
    // For now, return a placeholder
    return 0;
  }
}

export const sharePointClient = new SharePointClient(); 