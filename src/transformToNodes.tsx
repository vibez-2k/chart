import type { Node, Edge, NodeTypes, EdgeTypes } from '@xyflow/react';
import { PositionLoggerNode } from './nodes/PositionLoggerNode';
import { AppNode } from './types';

// Define a type for your hierarchical data structure
interface HierarchicalItem {
  id: string;
  type: string;
  label: string;
  parentId?: string;
  sameLevelParentId?: string;
  expanded?: boolean;
  children?: HierarchicalItem[];
}

// Function to transform hierarchical data to React Flow nodes
export const transformToNodes = (
  data: HierarchicalItem[], 
  parentX: number = 0, 
  parentY: number = 0, 
  level: number = 0, 
  horizontalSpacing: number = 300, // Base spacing between nodes
  verticalSpacing: number = 150,   // Spacing between different levels
  parentExpanded: boolean = true, 
  allParentsVisible: boolean = true, 
  siblingContext: { 
    expandedSiblings?: string[],
    childHeights?: Record<string, number>, // Track height needed by each expanded node
    horizontalOffset?: number // Track horizontal offset caused by expanded siblings
  } = {}
): AppNode[] => {
  let nodes: AppNode[] = [];
  
  // Initialize tracking objects if not provided
  siblingContext.childHeights = siblingContext.childHeights || {};
  siblingContext.horizontalOffset = siblingContext.horizontalOffset || 0;
  
  // Track expanded items at this level to adjust spacing
  const expandedItems = data.filter(item => item.expanded && item.children && item.children.length > 0);
  siblingContext.expandedSiblings = expandedItems.map(item => item.id);

  // Calculate dynamic horizontal spacing based on how many siblings are expanded
  const dynamicSpacing = horizontalSpacing * (1 + (expandedItems.length * 0.5)); // Increased factor for more space

  // First pass: calculate the space needed by each expanded node's children
  const nodeWidths: Record<string, number> = {};
  const nodeTrees: Record<string, AppNode[]> = {};
  
  data.forEach((item, index) => {
    if (item.children && item.children.length > 0 && item.expanded) {
      const expanded = item.expanded !== undefined ? item.expanded : false;
      
      // Calculate child spacing parameters
      const childLevel = level + 1;
      const levelScaleFactor = Math.max(0.5, 1 - (childLevel * 0.1));
      const siblingScaleFactor = 1 + (siblingContext.expandedSiblings?.length || 0) * 0.2;
      const childHorizontalSpacing = horizontalSpacing * levelScaleFactor * siblingScaleFactor;
      
      // Further adjust based on number of children
      const childCountFactor = item.children.length > 3 
        ? 1 + ((item.children.length - 3) * 0.2) // Increased factor
        : 1;
      
      const adjustedHorizontalSpacing = childHorizontalSpacing * childCountFactor;
      
      // Calculate the width needed for this node's children tree
      const childTreeWidth = item.children.length * adjustedHorizontalSpacing;
      nodeWidths[item.id] = Math.max(childTreeWidth, horizontalSpacing);
      
      // Pre-calculate child nodes for later use
      const childContext = { 
        expandedSiblings: [],
        childHeights: {},
        horizontalOffset: 0
      };
      
      // Position doesn't matter yet, we'll fix it later
      nodeTrees[item.id] = transformToNodes(
        item.children,
        0,
        0,
        childLevel,
        adjustedHorizontalSpacing,
        verticalSpacing,
        expanded,
        allParentsVisible && expanded,
        childContext
      );
      
      // Store the vertical space needed for this node's children
      let maxChildDepth = 0;
      Object.values(childContext.childHeights).forEach(height => {
        maxChildDepth = Math.max(maxChildDepth, height);
      });
      
      // Account for immediate children plus any deeper nested structure
      siblingContext.childHeights![item.id] = verticalSpacing + 
        (maxChildDepth > 0 ? maxChildDepth : 0);
    } else {
      // Leaf nodes take up minimal space
      nodeWidths[item.id] = horizontalSpacing;
      siblingContext.childHeights![item.id] = 0;
    }
  });

   // Calculate total width needed for this level
   let totalWidth = 0;
   data.forEach(item => {
     totalWidth += nodeWidths[item.id];
   });
// Second pass: create parent nodes with adjusted horizontal spacing
let currentX = parentX - (totalWidth / 2);
data.forEach((item, index) => {
  const nodeWidth = nodeWidths[item.id];
  const nodeX = currentX + (nodeWidth / 2);
  const nodeY = parentY + verticalSpacing;
  
  currentX += nodeWidth;

  const expanded = item.expanded !== undefined ? item.expanded : false;

  const node: AppNode = {
    id: item.id,
    type: mapNodeType(item.type),
    position: { x: nodeX, y: nodeY },
    data: {
      label: item.label,
      type: item.type,
      expanded: expanded,
      hasChildren: item.children && item.children.length > 0
    },
    style: getNodeStyle(item.type),
    hidden: !allParentsVisible
  };

  nodes.push(node);
});

 // Third pass: add children with proper positioning relative to their parents
 currentX = parentX - (totalWidth / 2);

 data.forEach((item, index) => {
  if (item.children && item.children.length > 0 && item.expanded) {
    const expanded = item.expanded !== undefined ? item.expanded : false;
    const nodeWidth = nodeWidths[item.id];
    const nodeX = currentX + (nodeWidth / 2);
    const nodeY = parentY + verticalSpacing;
    
    currentX += nodeWidth;
    
    if (nodeTrees[item.id]) {
      // Adjust positions of pre-calculated child nodes
      const adjustedChildNodes = nodeTrees[item.id].map(childNode => {
        // Only adjust the absolute position, keeping the relative positions
        const relativeX = childNode.position.x;
        const relativeY = childNode.position.y;
        
        return {
          ...childNode,
          position: {
            x: nodeX + relativeX,
            y: nodeY + verticalSpacing + relativeY
          }
        };
      });
      
      nodes = [...nodes, ...adjustedChildNodes];
    }
  } else {
    // Skip leaf nodes in this pass
    currentX += nodeWidths[item.id];
  }
});

return nodes;
};


// Helper function to calculate the deepest level in a subtree
const calculateSubtreeDepth = (item: HierarchicalItem, level: number = 0): number => {
  if (!item.children || item.children.length === 0 || !item.expanded) {
    return level;
  }
  
  let maxChildDepth = level;
  item.children.forEach(child => {
    const childDepth = calculateSubtreeDepth(child, level + 1);
    maxChildDepth = Math.max(maxChildDepth, childDepth);
  });
  
  return maxChildDepth;
};


// Function to create edges between nodes with better routing
export const createEdges = (data: HierarchicalItem[]): Edge[] => {
  let edges: Edge[] = [];
  
  const processItem = (item: HierarchicalItem) => {
    if (item.children && item.children.length > 0) {
      // Process all children normally, including columns
      item.children.forEach(child => {
        // Add direct parent-child edge
        edges.push({
          id: `${item.id}->${child.id}`,
          source: item.id,
          target: child.id,
          type: child.type === 'column' ? 'straight' : 'smoothstep',
          style: { 
            stroke: child.type === 'column' ? '#8E44AD' : '#555', 
            strokeWidth: 1.5,
            strokeDasharray: child.type === 'column' ? '4,2' : undefined
          },
          sourceHandle: 'bottom',
          targetHandle: 'top'
        });
        
        // Process child's children
        processItem(child);
      });
    }
    
    // Create same-level relationship edges with improved styling
    if (item.sameLevelParentId && item.sameLevelParentId !== "") {
      edges.push({
        id: `${item.sameLevelParentId}->${item.id}-relation`,
        source: item.sameLevelParentId,
        target: item.id,
        type: 'straight',
        animated: true,
        style: { stroke: '#f6ab6c', strokeWidth: 1.5, strokeDasharray: '5,5' },
        markerEnd: {
          type: 'arrow',
          color: '#f6ab6c',
        }
      });
    }
  };
  
  // Process all top-level items
  data.forEach(item => processItem(item));
  
  return edges;
};

// Map your custom types to React Flow node types
const mapNodeType = (type: string): string => {
  return 'hierarchical-node';
};

// Get styling based on node type
const getNodeStyle = (type: string): React.CSSProperties => {
  switch (type) {
    case 'parent':
      return { background: '#d0e0ff', border: '1px solid #2471A3', borderRadius: '8px', padding: '10px' };
    case 'schema':
      return { background: '#e6fff2', border: '1px solid #27AE60', borderRadius: '6px', padding: '8px' };
    case 'table':
      return { background: '#fff2e6', border: '1px solid #E67E22', borderRadius: '6px', padding: '8px' };
    case 'column':
      return { background: '#f9ebff', border: '1px solid #8E44AD', borderRadius: '4px', padding: '5px' };
    default:
      return {};
  }
};

// Helper to get all child node IDs for a given node
export const getChildNodeIds = (nodeId: string, data: HierarchicalItem[]): string[] => {
  const childIds: string[] = [];
  
  const findChildren = (items: HierarchicalItem[], targetId: string) => {
    for (const item of items) {
      if (item.id === targetId) {
        if (item.children) {
          item.children.forEach(child => {
            childIds.push(child.id);
            findChildren(item.children!, child.id);
          });
        }
        return true;
      }
      
      if (item.children) {
        if (findChildren(item.children, targetId)) {
          return true;
        }
      }
    }
    return false;
  };
  
  findChildren(data, nodeId);
  return childIds;
};

// Find a node by ID in the hierarchical data
export const findNodeById = (id: string, data: HierarchicalItem[]): HierarchicalItem | null => {
  for (const item of data) {
    if (item.id === id) {
      return item;
    }
    
    if (item.children) {
      const found = findNodeById(id, item.children);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
};

// Update the toggle function to trigger a complete re-layout
export const toggleNodeExpanded = (
  id: string, 
  data: HierarchicalItem[]
): HierarchicalItem[] => {
  return data.map(item => {
    if (item.id === id) {
      return {
        ...item,
        expanded: !item.expanded
      };
    }
    
    if (item.children) {
      return {
        ...item,
        children: toggleNodeExpanded(id, item.children)
      };
    }
    
    return item;
  });
};
// Usage with your sample data
const hierarchicalData = [
  {
    id: "1",
    type: "parent",
    label: "Data Maps",
    expanded: false,
    children: [
      {
        id: "2",
        type: "schema",
        label: "Param_Schema_ADSAF",
        parentId: "1",
        sameLevelParentId: "",
        expanded: false,
        children: [
          {
            id: "6",
            type: "table",
            label: "LAMSAN02",
            parentId: "2",
            sameLevelParentId: "",
            expanded: false,
            children: [
              {
                id: "10",
                type: "column",
                label: "AN_INS_ADDR_LINE_l1",
                parentId: "6",
                sameLevelParentId: "",
              },
              {
                id: "19",
                type: "column",
                label: "AN_INS_ADDR_LINE_l3",
                parentId: "6",
                sameLevelParentId: "",
              },
              {
                id: "20",
                type: "column",
                label: "AN_INS_ADDR_LINE_l4",
                parentId: "6",
                sameLevelParentId: "",
              },
              {
                id: "21",
                type: "column",
                label: "AN_INS_ADDR_LINE_l5",
                parentId: "6",
                sameLevelParentId: "",
              },
            ],
          },
  
        ],
      },
      {
        id: "3",
        type: "schema",
        label: "Param_Schema_SDV",
        parentId: "1",
        sameLevelParentId: "2",
        expanded: false,
        children: [
          {
            id: "7",
            type: "table",
            label: "S_AUTO_INSUR_TRACKING_AAF",
            parentId: "3",
            sameLevelParentId: "6",
            expanded: false,
            children: [
              {
                id: "11",
                type: "column",
                label: "AN_INS_ADDR_LINE_l2",
                parentId: "7",
                sameLevelParentId: "10",
              },
            ],
          },
          
        ],
      },
      {
        id: "4",
        type: "schema",
        label: "RDV",
        parentId: "1",
        sameLevelParentId: "3",
        expanded: false,
        children: [
          {
            id: "8",
            type: "table",
            label: "PIXL_AUTO_INSUR_TRACKING",
            parentId: "4",
            sameLevelParentId: "7",
            expanded: false,
            children: [
              {
                id: "12",
                type: "column",
                label: "AN_INS_ADDR_LINE_l3",
                parentId: "8",
                sameLevelParentId: "11",
              },
            ],
          },
        ],
      },
      {
        id: "5",
        type: "schema",
        label: "PIXL",
        parentId: "1",
        sameLevelParentId: "4",
        expanded: false,
        children: [
          {
            id: "9",
            type: "table",
            label: "PIXL_AUTO_INSUR_TRACKING",
            parentId: "5",
            sameLevelParentId: "8",
            expanded: false,
            children: [
              {
                id: "13",
                type: "column",
                label: "AN_INS_ADDR_LINE_l4",
                parentId: "9",
                sameLevelParentId: "12",
              },
            ],
          },
        ],
      },
    ],
  },
];

// Export hierarchical data for use in the component
export const initialHierarchicalData = hierarchicalData;

// Initial transform of hierarchical data to React Flow format
export const initialFlowNodes: AppNode[] = transformToNodes(hierarchicalData);
export const initialFlowEdges: Edge[] = createEdges(hierarchicalData);

// Define custom node types for React Flow
export const nodeTypes = {
  'position-logger': PositionLoggerNode,
  'hierarchical-node': null, // This will be replaced with the actual component in your main file
} satisfies NodeTypes;

// Define custom edge types for React Flow
export const edgeTypes = {
  // Add your custom edge types here
} satisfies EdgeTypes;