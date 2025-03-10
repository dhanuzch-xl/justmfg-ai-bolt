export interface FileWithPreview extends File {
  preview: string;
}

export interface ViewerProps {
  file: {
    id: string;
    name: string;
    type: string;
    preview: string;
    file: FileWithPreview;
    metadata: {
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
  };
  className?: string;
}

interface Material {
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
}

interface ManufacturingProcess {
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
}