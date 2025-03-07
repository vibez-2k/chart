import React, { useCallback, useState } from 'react';
import {
  ReactFlow, 
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { 
  initialFlowNodes, 
  initialFlowEdges, 
  edgeTypes, 
  initialHierarchicalData,
  transformToNodes,
  createEdges,
  toggleNodeExpanded
} from './transformToNodes';

import HierarchicalNode from './car2';

const DataMapFlow = () => {
  // State for hierarchical data structure
  const [hierarchicalData, setHierarchicalData] = useState(initialHierarchicalData);
  
  // Custom node types including our HierarchicalNode
  const customNodeTypes: NodeTypes = {
    'hierarchical-node': HierarchicalNode,
  };
  
  // Initialize nodes and edges states
  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlowEdges);

  // Handle node expansion toggle
  const handleToggleExpand = useCallback((nodeId: string, currentExpanded: boolean) => {
    // Update the hierarchical data structure
    const updatedData = toggleNodeExpanded(nodeId, hierarchicalData);
    setHierarchicalData(updatedData);
    
    // Re-generate nodes and edges
    const newNodes = transformToNodes(updatedData);
    const newEdges = createEdges(updatedData);
    
    // Update the flow chart
    setNodes(newNodes);
    setEdges(newEdges);
    
    // You might want to recenter the view after expanding/collapsing
    // This would require a reference to the ReactFlow instance
  }, [hierarchicalData, setNodes, setEdges]);
  
  // Pass the toggle handler to nodes
  const nodesWithHandlers = React.useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onToggleExpand: handleToggleExpand
      }
    }));
  }, [nodes, handleToggleExpand]);

  return (
    <div style={{ width: '100%', height: '800px' }}>
      <ReactFlow
        nodes={nodesWithHandlers}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={customNodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
        <Panel position="top-right">
          <div className="legend">
            <h3>Node Types</h3>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#d0e0ff', border: '1px solid #2471A3' }}></div>
              <span>Parent</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#e6fff2', border: '1px solid #27AE60' }}></div>
              <span>Schema</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#fff2e6', border: '1px solid #E67E22' }}></div>
              <span>Table</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#f9ebff', border: '1px solid #8E44AD' }}></div>
              <span>Column</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default DataMapFlow;