import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

// Define types for your custom node data
interface CustomNodeData {
  label: string;
  type: string;
  expanded: boolean;
  hasChildren?: boolean;
  columnLabels?: string[]; // For columns container node
  isColumnsContainer?: boolean; // Flag for columns container node
  onToggleExpand?: (nodeId: string, expanded: boolean) => void;
}

// Create custom node component for hierarchical nodes
export const HierarchicalNode = memo<NodeProps<CustomNodeData>>(({ id, data, selected }) => {
  const { label, type, expanded, hasChildren, isColumnsContainer, columnLabels, onToggleExpand } = data;
  
  // Different styles based on node type
  const getNodeClass = () => {
    if (isColumnsContainer) {
      return 'hierarchical-node columns-container-node';
    }
    
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
  const showExpandCollapse = hasChildren && !isColumnsContainer;
  
  // Render special columns container node
  if (isColumnsContainer) {
    return (
      <div 
        className={`${getNodeClass()} ${selected ? 'selected' : ''}`}
        style={{
          background: '#f9ebff', 
          border: '1px solid #8E44AD',
          borderRadius: '6px',
          padding: '10px',
          width: '220px',
          minHeight: '100px'
        }}
      >
        <Handle 
          type="target" 
          position={Position.Top} 
          id="top"
          style={{ background: '#8E44AD', width: '8px', height: '8px' }}
        />
        
        <div className="node-header">
          <div className="node-type-indicator">Columns</div>
        </div>
        
        <div className="node-content">
          <div className="columns-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {columnLabels && columnLabels.map((colLabel, index) => (
              <div 
                key={index} 
                className="column-item"
                style={{
                  padding: '4px 8px',
                  margin: '4px 0',
                  background: 'rgba(142, 68, 173, 0.1)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  borderLeft: '3px solid #8E44AD'
                }}
              >
                {colLabel}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // Render regular node
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