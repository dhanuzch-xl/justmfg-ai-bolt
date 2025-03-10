type FileType = 'step' | '3mf' | 'dxf' | 'stl' | 'pdf' | 'image';

type Material = {
  id: string;
  name: string;
  type: 'metal' | 'plastic' | 'composite';
  properties: {
    density?: number;
    tensileStrength?: number;
    yieldStrength?: number;
    elongation?: number;
    hardness?: number;
  };
};

type ManufacturingProcess = {
  id: string;
  name: string;
  type: 'machining' | 'additive' | '3d-printing' | 'injection-molding' | 'sheet-metal';
  capabilities: {
    minWallThickness?: number;
    maxSize?: {
      x: number;
      y: number;
      z: number;
    };
    tolerance?: number;
    surfaceFinish?: number;
  };
};

type FileMetadata = {
  size: number;
  lastModified: Date;
  created: Date;
  materials: Material[];
  processes: ManufacturingProcess[];
  specifications: {
    dimensions?: {
      x: number;
      y: number;
      z: number;
    };
    weight?: number;
    volume?: number;
    tolerance?: number;
    surfaceFinish?: number;
    notes?: string[];
  };
  quality: {
    inspectionRequired: boolean;
    certificationRequired: boolean;
    standards?: string[];
  };
  pricing?: {
    materialCost: number;
    processingCost: number;
    setupCost: number;
    quantity: number;
    leadTime: number;
  };
};

export interface FileItem {
  id: string;
  name: string;
  type: FileType;
  path: string;
  preview?: string;
  metadata: FileMetadata;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  type: 'assembly' | 'part';
  lastModified: Date;
}