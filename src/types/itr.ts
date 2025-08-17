export interface ITRTemplate {
  id: string;
  name: string;
  description: string;
  category: 'electrical' | 'mechanical' | 'civil' | 'instrumentation' | 'general';
  discipline: string;
  version: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  sections: ITRSection[];
  metadata?: {
    standards?: string[];
    equipmentTypes?: string[];
    testTypes?: string[];
  };
}

export interface ITRSection {
  id: string;
  title: string;
  type: 'header' | 'test' | 'measurement' | 'checklist' | 'signature' | 'photo' | 'notes';
  required: boolean;
  order: number;
  fields?: ITRField[];
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    required?: boolean;
  };
}

export interface ITRField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'time' | 'select' | 'multiselect' | 'boolean' | 'file' | 'signature';
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface ITRInstance {
  id: string;
  templateId: string;
  name: string;
  status: 'draft' | 'in-progress' | 'completed' | 'signed-off';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  location?: string;
  equipment?: string;
  data: Record<string, any>;
}

