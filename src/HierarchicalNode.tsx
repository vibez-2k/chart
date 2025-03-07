import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

// Define types for your custom node data
interface CustomNodeData {
  label: string;
  type: string;
  expanded: boolean;
  hasChildren?: boolean;
  onToggleExpand?: (nodeId: string, expanded: boolean) => void;
}

// Create custom node component for hierarchical nodes
export const HierarchicalNode = memo<NodeProps<CustomNodeData>>(({ id, data, selected }) => {
  const { label, type, expanded, hasChildren, onToggleExpand } = data;
  
  // Different styles based on node type
  const getNodeClass = () => {
    switch (type) {
      case 'parent':
        return 'hierarchical-node parent-node';
      case 'schema':
        return 'hierarchical-node schema-node';
      case 'table':
        return 'hierarchical-node table-node';
      case 'column':
        return 'hierarchical-node column-node';
      default:
        return 'hierarchical-node';
    }
  };

  // Handle node click to toggle expand/collapse
  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren && onToggleExpand) {
      onToggleExpand(id, !!expanded);
    }
  };
  
  // Only show expand/collapse indicator for nodes that have children
  const showExpandCollapse = hasChildren;
  
  return (
    <div 
      className={`${getNodeClass()} ${selected ? 'selected' : ''} ${hasChildren ? 'has-children' : ''}`}
      onClick={handleNodeClick}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top"
        style={{ background: '#555', width: '8px', height: '8px' }}
      />
      
      <div className="node-header">
        <div className="node-type-indicator">{type}</div>
        {showExpandCollapse && (
          <div className="expand-collapse-indicator">
            {expanded ? '−' : '+'}
          </div>
        )}
      </div>
      
      <div className="node-content">
        <div className="node-label">{label}</div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom"
        style={{ background: '#555', width: '8px', height: '8px' }}
      />
    </div>
  );
});

export default HierarchicalNode;