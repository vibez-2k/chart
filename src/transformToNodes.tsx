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
// Function to transform hierarchical data to React Flow nodes with improved spacing
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

  // Calculate dynamic horizontal spacing based on level and sibling count
  // Increase base spacing for higher levels with more children
  const levelSpacingFactor = Math.max(1, 1 + (level * 0.2)); // Increase spacing at deeper levels
  const siblingCountFactor = Math.max(1, 1 + (data.length * 0.1)); // More siblings = more space
  const dynamicHorizontalSpacing = horizontalSpacing * levelSpacingFactor * siblingCountFactor;
  
  // Special handling for level 4 nodes (stacking vertically)
  const isLevel4 = level === 3; // 0-based indexing, so level 3 is the 4th level
  const verticalStackSpacing = isLevel4 ? 60 : verticalSpacing; // Tighter vertical spacing for stacked columns
  
  // First pass: calculate the space needed by each expanded node's children
  const nodeWidths: Record<string, number> = {};
  const nodeTrees: Record<string, AppNode[]> = {};
  const nodeHeights: Record<string, number> = {};
  
  data.forEach((item, index) => {
    if (item.children && item.children.length > 0 && item.expanded) {
      const expanded = item.expanded !== undefined ? item.expanded : false;
      
      // Calculate child spacing parameters based on level and child count
      const childLevel = level + 1;
      const isColumnLevel = item.type === 'table'; // Table's children are columns
      
      // For columns (level 4), we'll stack vertically, so horizontal spacing is less important
      const childHorizontalSpacing = isColumnLevel 
        ? horizontalSpacing * 0.5 // Tighter horizontal spacing for columns
        : dynamicHorizontalSpacing;
      
      // Calculate vertical spacing for column children (level 4)
      const childVerticalSpacing = isColumnLevel
        ? verticalStackSpacing // Tighter spacing for stacked columns
        : verticalSpacing;
        
      // Adjust spacing based on number of children
      const childCountFactor = item.children.length > 3 
        ? 1 + ((item.children.length - 3) * 0.2) 
        : 1;
      
      const adjustedHorizontalSpacing = childHorizontalSpacing * childCountFactor;
      
      // Pre-calculate child nodes for later use
      const childContext = { 
        expandedSiblings: [],
        childHeights: {},
        horizontalOffset: 0
      };
      
      // For column level (level 4), use special positioning logic
      if (isColumnLevel) {
        // Position columns vertically stacked under their parent table
        nodeTrees[item.id] = [];
        let columnY = 0;
        
        item.children.forEach((child, childIndex) => {
          const node: AppNode = {
            id: child.id,
            type: mapNodeType(child.type),
            position: { 
              x: 0, // Will be adjusted in the final pass
              y: columnY 
            },
            data: {
              label: child.label,
              type: child.type,
              expanded: false,
              hasChildren: false
            },
            style: getNodeStyle(child.type),
            hidden: !allParentsVisible
          };
          
          nodeTrees[item.id].push(node);
          
          // Increment Y position for next column
          columnY += verticalStackSpacing;
        });
        
        // Track vertical height needed for this column group
        nodeHeights[item.id] = item.children.length * verticalStackSpacing;
        
        // For columns, width is fixed
        nodeWidths[item.id] = horizontalSpacing;
      } else {
        // Standard positioning for non-column nodes
        nodeTrees[item.id] = transformToNodes(
          item.children,
          0, // Will be adjusted in final pass
          0,
          childLevel,
          adjustedHorizontalSpacing,
          childVerticalSpacing,
          expanded,
          allParentsVisible && expanded,
          childContext
        );
        
        // Calculate width based on children
        const childTreeWidth = Math.max(
          item.children.length * adjustedHorizontalSpacing,
          nodeTrees[item.id].length > 0 ? 
            Math.max(...nodeTrees[item.id].map(node => node.position.x)) + 100 : 
            horizontalSpacing
        );
        
        nodeWidths[item.id] = Math.max(childTreeWidth, horizontalSpacing);
        
        // Calculate height based on children
        let maxChildDepth = 0;
        Object.values(childContext.childHeights).forEach(height => {
          maxChildDepth = Math.max(maxChildDepth, height);
        });
        
        nodeHeights[item.id] = verticalSpacing + 
          (maxChildDepth > 0 ? maxChildDepth : 0);
      }
      
      // Store height for parent's reference
      siblingContext.childHeights![item.id] = nodeHeights[item.id];
    } else {
      // Leaf nodes take up minimal space
      nodeWidths[item.id] = horizontalSpacing;
      nodeHeights[item.id] = 0;
      siblingContext.childHeights![item.id] = 0;
    }
  });

  // Calculate total width needed for this level
  let totalWidth = 0;
  data.forEach(item => {
    totalWidth += nodeWidths[item.id];
  });
  
  // Add extra padding between nodes based on level
  totalWidth += (data.length - 1) * (level * 20);

  // Second pass: create parent nodes with adjusted horizontal spacing
  let currentX = parentX - (totalWidth / 2);
  
  data.forEach((item, index) => {
    const nodeWidth = nodeWidths[item.id];
    // Add extra spacing between nodes at higher levels
    const extraSpacing = level * 20;
    const nodeX = currentX + (nodeWidth / 2);
    const nodeY = parentY + verticalSpacing;
    
    currentX += nodeWidth + extraSpacing;

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
      const extraSpacing = level * 20;
      const nodeX = currentX + (nodeWidth / 2);
      const nodeY = parentY + verticalSpacing;
      
      currentX += nodeWidth + extraSpacing;
      
      if (nodeTrees[item.id]) {
        if (item.type === 'table') {
          // For table nodes with column children, stack the columns vertically
          const adjustedChildNodes = nodeTrees[item.id].map((childNode, childIndex) => {
            return {
              ...childNode,
              position: {
                x: nodeX,
                y: nodeY + verticalSpacing + (childIndex * verticalStackSpacing)
              }
            };
          });
          
          nodes = [...nodes, ...adjustedChildNodes];
        } else {
          // For other node types, use standard positioning
          const adjustedChildNodes = nodeTrees[item.id].map(childNode => {
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
      }
    } else {
      // Skip leaf nodes in this pass
      currentX += nodeWidths[item.id] + (level * 20);
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
const hierarchicalData =[
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
          {
            id: "66",
            type: "table",
            label: "LAMSAN02",
            parentId: "2",
            sameLevelParentId: "",
            expanded: false,
            children: [
              {
                id: "100",
                type: "column",
                label: "AN_INS_ADDR_LINE_l1",
                parentId: "6",
                sameLevelParentId: "",
              },
              {
                id: "190",
                type: "column",
                label: "AN_INS_ADDR_LINE_l3",
                parentId: "6",
                sameLevelParentId: "",
              },
              {
                id: "200",
                type: "column",
                label: "AN_INS_ADDR_LINE_l4",
                parentId: "6",
                sameLevelParentId: "",
              },
              {
                id: "210",
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
              {
                id: "110",
                type: "column",
                label: "AN_INS_ADDR_LINE_l2",
                parentId: "7",
                sameLevelParentId: "10",
              },
              {
                id: "111",
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
]

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