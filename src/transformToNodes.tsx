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
  horizontalSpacing: number = 300, // Spacing between nodes on the same level
  verticalSpacing: number = 150,   // Spacing between different levels
  parentExpanded: boolean = true,
  allParentsVisible: boolean = true
): AppNode[] => {
  let nodes: AppNode[] = [];
  
  data.forEach((item, index) => {
    // Calculate position based on level and index
    const x = parentX + (index - (data.length - 1) / 2) * horizontalSpacing;
    const y = parentY + verticalSpacing;
    
    // Set initial expanded state (all collapsed by default, unless explicitly set)
    const expanded = item.expanded !== undefined ? item.expanded : false;
    
    // Create node for current item
    const node: AppNode = {
      id: item.id,
      type: mapNodeType(item.type),
      position: { x, y },
      data: { 
        label: item.label,
        type: item.type,
        expanded: expanded,
        hasChildren: item.children && item.children.length > 0
      },
      // Add styling based on node type
      style: getNodeStyle(item.type),
      // Only show this node if all parent nodes are expanded
      hidden: !allParentsVisible
    };
    
    nodes.push(node);
    
    // Process children recursively if they exist
    if (item.children && item.children.length > 0) {
      // Special handling for column children - create a single container node
      const columnChildren = item.children.filter(child => child.type === 'column');
      const nonColumnChildren = item.children.filter(child => child.type !== 'column');
      
      // Create a single container node for all columns if there are any
      if (columnChildren.length > 0) {
        const columnsContainerId = `${item.id}-columns`;
        const columnLabels = columnChildren.map(c => c.label);
        
        // Calculate position for columns container node
        const columnsContainerNode: AppNode = {
          id: columnsContainerId,
          type: 'hierarchical-node',
          position: { x, y: y + verticalSpacing },
          data: {
            label: 'Columns',
            type: 'columns-container',
            isColumnsContainer: true,
            columnLabels: columnLabels,
            expanded: false,
            hasChildren: false
          },
          style: {
            background: '#f9ebff',
            border: '1px solid #8E44AD',
            width: '220px'
          },
          hidden: !allParentsVisible || !expanded
        };
        
        nodes.push(columnsContainerNode);
        
        // Add edge from parent to columns container
        const columnsContainerEdge: Edge = {
          id: `${item.id}->${columnsContainerId}`,
          source: item.id,
          target: columnsContainerId,
          type: 'straight',
          style: { 
            stroke: '#8E44AD', 
            strokeWidth: 1.5,
            strokeDasharray: '4,2'
          },
          sourceHandle: 'bottom',
          targetHandle: 'top'
        };
        
        // We can't add edges here, so we'll handle this in the edges creation
      }
      
      // Process non-column children normally
      if (nonColumnChildren.length > 0) {
        const childSpacingMultiplier = Math.max(0.8, 1 - (level * 0.05));
        const childHorizontalSpacing = horizontalSpacing * childSpacingMultiplier;
        
        const adjustedHorizontalSpacing = nonColumnChildren.length > 3 
          ? childHorizontalSpacing * (1 + (nonColumnChildren.length - 3) * 0.1)
          : childHorizontalSpacing;
        
        // Offset Y position if we added a columns container
        const offsetY = columnChildren.length > 0 ? verticalSpacing : 0;
        
        const childNodes = transformToNodes(
          nonColumnChildren,
          x,
          y + offsetY,
          level + 1,
          adjustedHorizontalSpacing,
          verticalSpacing,
          expanded,
          allParentsVisible && expanded
        );
        
        nodes = [...nodes, ...childNodes];
      }
    }
  });
  
  return nodes;
};




// Function to create edges between nodes with better routing
// Function to create edges between nodes with better routing
export const createEdges = (data: HierarchicalItem[]): Edge[] => {
  let edges: Edge[] = [];
  
  const processItem = (item: HierarchicalItem) => {
    if (item.children && item.children.length > 0) {
      // Identify column and non-column children
      const columnChildren = item.children.filter(child => child.type === 'column');
      const nonColumnChildren = item.children.filter(child => child.type !== 'column');
      
      // Add edge to columns container if we have column children
      if (columnChildren.length > 0) {
        const columnsContainerId = `${item.id}-columns`;
        
        edges.push({
          id: `${item.id}->${columnsContainerId}`,
          source: item.id,
          target: columnsContainerId,
          type: 'straight',
          style: { 
            stroke: '#8E44AD', 
            strokeWidth: 1.5,
            strokeDasharray: '4,2'
          },
          sourceHandle: 'bottom',
          targetHandle: 'top'
        });
      }
      
      // Process non-column children normally
      nonColumnChildren.forEach(child => {
        edges.push({
          id: `${item.id}->${child.id}`,
          source: item.id,
          target: child.id,
          type: 'smoothstep',
          style: { 
            stroke: '#555', 
            strokeWidth: 1.5
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


// Map your custom types to React Flow node types


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
    case 'columns-container':
      return { background: '#f9ebff', border: '1px solid #8E44AD', borderRadius: '6px', padding: '8px', width: '220px' };
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

// Toggle expanded state of a node in the hierarchical data
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

