import { Annotation, Comment } from '../components/PDFViewer';
import { db } from './firebase/firebase';
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';

export interface MarkupDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  lastModified: Date;
  annotations: Annotation[];
  collaborators: string[];
  version: number;
}

class MarkupStorage {
  private collection = 'markupDocuments';

  async saveDocument(document: MarkupDocument): Promise<void> {
    try {
      const docRef = doc(db, this.collection, document.id);
      await setDoc(docRef, {
        ...document,
        uploadedAt: document.uploadedAt,
        lastModified: new Date()
      });
    } catch (error) {
      console.error('Error saving markup document:', error);
      throw error;
    }
  }

  async getDocument(documentId: string): Promise<MarkupDocument | null> {
    try {
      const docRef = doc(db, this.collection, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          uploadedAt: data.uploadedAt.toDate(),
          lastModified: data.lastModified.toDate(),
          annotations: data.annotations.map((ann: any) => ({
            ...ann,
            createdAt: ann.createdAt.toDate(),
            modifiedAt: ann.modifiedAt.toDate(),
            comments: ann.comments?.map((comment: any) => ({
              ...comment,
              createdAt: comment.createdAt.toDate()
            })) || []
          }))
        } as MarkupDocument;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting markup document:', error);
      throw error;
    }
  }

  async getDocumentsByUser(userId: string): Promise<MarkupDocument[]> {
    try {
      const q = query(
        collection(db, this.collection),
        where('uploadedBy', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const documents: MarkupDocument[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        documents.push({
          ...data,
          uploadedAt: data.uploadedAt.toDate(),
          lastModified: data.lastModified.toDate(),
          annotations: data.annotations.map((ann: any) => ({
            ...ann,
            createdAt: ann.createdAt.toDate(),
            modifiedAt: ann.modifiedAt.toDate(),
            comments: ann.comments?.map((comment: any) => ({
              ...comment,
              createdAt: comment.createdAt.toDate()
            })) || []
          }))
        } as MarkupDocument);
      });
      
      return documents.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    } catch (error) {
      console.error('Error getting user documents:', error);
      throw error;
    }
  }

  async addAnnotation(documentId: string, annotation: Annotation): Promise<void> {
    try {
      const docRef = doc(db, this.collection, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const annotations = data.annotations || [];
        
        await updateDoc(docRef, {
          annotations: [...annotations, annotation],
          lastModified: new Date(),
          version: (data.version || 1) + 1
        });
      }
    } catch (error) {
      console.error('Error adding annotation:', error);
      throw error;
    }
  }

  async updateAnnotation(documentId: string, annotation: Annotation): Promise<void> {
    try {
      const docRef = doc(db, this.collection, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const annotations = data.annotations || [];
        
        const updatedAnnotations = annotations.map((ann: Annotation) =>
          ann.id === annotation.id ? { ...annotation, modifiedAt: new Date() } : ann
        );
        
        await updateDoc(docRef, {
          annotations: updatedAnnotations,
          lastModified: new Date(),
          version: (data.version || 1) + 1
        });
      }
    } catch (error) {
      console.error('Error updating annotation:', error);
      throw error;
    }
  }

  async deleteAnnotation(documentId: string, annotationId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collection, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const annotations = data.annotations || [];
        
        const filteredAnnotations = annotations.filter((ann: Annotation) => ann.id !== annotationId);
        
        await updateDoc(docRef, {
          annotations: filteredAnnotations,
          lastModified: new Date(),
          version: (data.version || 1) + 1
        });
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
      throw error;
    }
  }

  async addComment(documentId: string, annotationId: string, comment: Comment): Promise<void> {
    try {
      const docRef = doc(db, this.collection, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const annotations = data.annotations || [];
        
        const updatedAnnotations = annotations.map((ann: Annotation) => {
          if (ann.id === annotationId) {
            return {
              ...ann,
              comments: [...(ann.comments || []), comment],
              modifiedAt: new Date()
            };
          }
          return ann;
        });
        
        await updateDoc(docRef, {
          annotations: updatedAnnotations,
          lastModified: new Date(),
          version: (data.version || 1) + 1
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collection, documentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  async addCollaborator(documentId: string, collaboratorEmail: string): Promise<void> {
    try {
      const docRef = doc(db, this.collection, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const collaborators = data.collaborators || [];
        
        if (!collaborators.includes(collaboratorEmail)) {
          await updateDoc(docRef, {
            collaborators: [...collaborators, collaboratorEmail],
            lastModified: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error adding collaborator:', error);
      throw error;
    }
  }

  async removeCollaborator(documentId: string, collaboratorEmail: string): Promise<void> {
    try {
      const docRef = doc(db, this.collection, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const collaborators = data.collaborators || [];
        
        const filteredCollaborators = collaborators.filter((email: string) => email !== collaboratorEmail);
        
        await updateDoc(docRef, {
          collaborators: filteredCollaborators,
          lastModified: new Date()
        });
      }
    } catch (error) {
      console.error('Error removing collaborator:', error);
      throw error;
    }
  }

  // Export annotations to various formats
  exportAnnotations(annotations: Annotation[], format: 'json' | 'csv' | 'xfdf'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(annotations, null, 2);
      
      case 'csv':
        const headers = ['Type', 'Page', 'Author', 'Text', 'Created At', 'Comments'];
        const rows = annotations.map(ann => [
          ann.type,
          ann.pageNumber.toString(),
          ann.author,
          ann.text || '',
          ann.createdAt.toISOString(),
          (ann.comments || []).map(c => c.text).join('; ')
        ]);
        
        return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      
      case 'xfdf':
        // Basic XFDF format for Bluebeam compatibility
        const xfdfAnnotations = annotations.map(ann => {
          switch (ann.type) {
            case 'text':
              return `<text page="${ann.pageNumber}" rect="${ann.x},${ann.y},${ann.x + ann.width},${ann.y + ann.height}" contents="${ann.text}" color="${ann.strokeColor}" />`;
            case 'rectangle':
              return `<square page="${ann.pageNumber}" rect="${ann.x},${ann.y},${ann.x + ann.width},${ann.y + ann.height}" color="${ann.strokeColor}" />`;
            case 'circle':
              return `<circle page="${ann.pageNumber}" rect="${ann.x},${ann.y},${ann.x + ann.width},${ann.y + ann.height}" color="${ann.strokeColor}" />`;
            default:
              return `<markup page="${ann.pageNumber}" rect="${ann.x},${ann.y},${ann.x + ann.width},${ann.y + ann.height}" color="${ann.strokeColor}" />`;
          }
        }).join('\n    ');
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">
  <annots>
    ${xfdfAnnotations}
  </annots>
</xfdf>`;
      
      default:
        return JSON.stringify(annotations, null, 2);
    }
  }

  // Import annotations from XFDF or JSON
  importAnnotations(data: string, format: 'json' | 'xfdf'): Annotation[] {
    try {
      switch (format) {
        case 'json':
          const jsonData = JSON.parse(data);
          return Array.isArray(jsonData) ? jsonData : [];
        
        case 'xfdf':
          // Parse XFDF - basic implementation
          // In a real application, you'd use a proper XML parser
          const annotations: Annotation[] = [];
          const textMatches = data.match(/<text[^>]*>/g) || [];
          const squareMatches = data.match(/<square[^>]*>/g) || [];
          const circleMatches = data.match(/<circle[^>]*>/g) || [];
          
          // This is a simplified parser - you'd want a more robust XML parser
          [...textMatches, ...squareMatches, ...circleMatches].forEach((match, index) => {
            const pageMatch = match.match(/page="(\d+)"/);
            const rectMatch = match.match(/rect="([^"]+)"/);
            const colorMatch = match.match(/color="([^"]+)"/);
            const contentsMatch = match.match(/contents="([^"]+)"/);
            
            if (pageMatch && rectMatch) {
              const [x, y, x2, y2] = rectMatch[1].split(',').map(Number);
              const annotation: Annotation = {
                id: `imported-${index}`,
                type: match.includes('<text') ? 'text' : match.includes('<square') ? 'rectangle' : 'circle',
                pageNumber: parseInt(pageMatch[1]),
                x,
                y,
                width: x2 - x,
                height: y2 - y,
                color: 'transparent',
                strokeColor: colorMatch ? colorMatch[1] : '#ff0000',
                strokeWidth: 2,
                text: contentsMatch ? contentsMatch[1] : '',
                opacity: 1,
                author: 'Imported',
                createdAt: new Date(),
                modifiedAt: new Date(),
                comments: []
              };
              annotations.push(annotation);
            }
          });
          
          return annotations;
        
        default:
          return [];
      }
    } catch (error) {
      console.error('Error importing annotations:', error);
      return [];
    }
  }
}

export const markupStorage = new MarkupStorage();