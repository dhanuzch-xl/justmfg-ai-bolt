import * as THREE from 'three'
import occtimportjs from 'occt-import-js'

const wasmUrl = 'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.wasm'

interface AssemblyNode {
    name: string;
    type: 'assembly' | 'part';
    children?: AssemblyNode[];
}

export async function LoadStep(fileUrl: string) {
    const targetObject = new THREE.Object3D()
    let partNames: string[] = [];

    try {
        // Initialize occt-import-js with proper WASM loading
        const occt = await occtimportjs({
            locateFile: (filename: string) => {
                if (filename.endsWith('.wasm')) {
                    return wasmUrl
                }
                return filename
            }
        })

        // Download and process the STEP file
        const response = await fetch(fileUrl)
        const buffer = await response.arrayBuffer()
        const fileBuffer = new Uint8Array(buffer)

        // Read the STEP file with names and colors (similar to Python's read_step_file_with_names_colors)
        const result = await occt.ReadStepFile(fileBuffer, {
            returnMetadata: true,
            preserveNames: true,
            preserveStructure: true,
            extractProductNames: true
        })
        
        console.log("STEP file loaded with result:", result);
        
        // Extract the root assembly name (if available)
        let rootName = "";
        if (result.rootName) {
            rootName = result.rootName;
        } else if (result.name) {
            rootName = result.name;
        } else if (fileUrl.includes("/")) {
            // Extract filename from URL as fallback
            rootName = fileUrl.split("/").pop()?.split(".")[0] || "Assembly";
        } else {
            rootName = "Assembly";
        }
        
        // Add the root assembly name to the list
        partNames.push(`📁 ${rootName}`);
        
        // Process all shapes/parts in the STEP file
        for (let i = 0; i < result.meshes.length; i++) {
            const resultMesh = result.meshes[i]
            const geometry = new THREE.BufferGeometry()

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(resultMesh.attributes.position.array, 3))
            if (resultMesh.attributes.normal) {
                geometry.setAttribute('normal', new THREE.Float32BufferAttribute(resultMesh.attributes.normal.array, 3))
            }
            const index = Uint16Array.from(resultMesh.index.array)
            geometry.setIndex(new THREE.BufferAttribute(index, 1))

            // Create material
            const material = new THREE.MeshPhongMaterial({ 
                color: resultMesh.color ? 
                    new THREE.Color(resultMesh.color[0], resultMesh.color[1], resultMesh.color[2]) : 
                    0xcccccc 
            })

            const mesh = new THREE.Mesh(geometry, material)
            
            // Extract name similar to the Python extract_name function
            let partName = "";
            
            // Check for name in metadata (similar to Python's tup[1])
            if (resultMesh.metadata) {
                if (resultMesh.metadata.name && resultMesh.metadata.name.trim()) {
                    partName = resultMesh.metadata.name;
                } else if (resultMesh.metadata.productName && resultMesh.metadata.productName.trim()) {
                    partName = resultMesh.metadata.productName;
                } else if (resultMesh.metadata.label && resultMesh.metadata.label.trim()) {
                    partName = resultMesh.metadata.label;
                }
            }
            
            // If no name found in metadata, check other properties
            if (!partName) {
                if (resultMesh.name && resultMesh.name.trim()) {
                    partName = resultMesh.name;
                } else if (resultMesh.stepEntityName && resultMesh.stepEntityName.trim()) {
                    partName = resultMesh.stepEntityName;
                } else if (resultMesh.product && resultMesh.product.trim()) {
                    partName = resultMesh.product;
                } else {
                    // Fallback similar to Python's "Unnamed_" + type
                    partName = `Unnamed_Part_${i+1}`;
                }
            }
            
            // Set the name on the mesh
            mesh.name = partName;
            
            // Add to the part names list with indentation (similar to Python's print)
            partNames.push(`  🔧 ${partName}`);
            
            // Add to the target object
            targetObject.add(mesh);
        }
        
        // Store the part names for the UI
        targetObject.userData.partNames = partNames;
        
        console.log("Extracted part names:", partNames);
        
        return targetObject;

    } catch (error) {
        console.error('Error loading STEP file:', error)
        throw error
    }
}

// Helper function to flatten the assembly structure into a list of part names
// with proper indentation to show hierarchy
function flattenAssemblyStructure(structure: AssemblyNode[], level: number = 0): string[] {
    if (!structure || !Array.isArray(structure)) return [];
    
    const result: string[] = [];
    
    structure.forEach(node => {
        // Add indentation based on level
        const indent = '  '.repeat(level);
        const prefix = node.type === 'assembly' ? '📁 ' : '🔧 ';
        result.push(`${indent}${prefix}${node.name}`);
        
        // Process children recursively
        if (node.children && node.children.length > 0) {
            const childNames = flattenAssemblyStructure(node.children, level + 1);
            result.push(...childNames);
        }
    });
    
    return result;
} 