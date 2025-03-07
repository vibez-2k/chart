import React, { useCallback, useState, useRef } from 'react';
import {
  ReactFlow, 
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  NodeTypes,
  ReactFlowInstance
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
// import './HierarchicalNode.css'; // Import the CSS file

import { 
  initialFlowNodes, 
  initialFlowEdges, 
  edgeTypes, 
  initialHierarchicalData,
  transformToNodes,
  createEdges,
  toggleNodeExpanded
} from './transformToNodes';

import HierarchicalNode from './hierarchicalnode';

const DataMapFlow = () => {
  // State for hierarchical data structure
  const [hierarchicalData, setHierarchicalData] = useState(initialHierarchicalData);
  
  // Keep reference to ReactFlow instance
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  
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
    
    // After expanding/collapsing, fit view with some delay
    // to give time for the layout to update
    setTimeout(() => {
      if (reactFlowInstanceRef.current) {
        reactFlowInstanceRef.current.fitView({ 
          padding: 0.2, 
          includeHiddenNodes: false 
        });
      }
    }, 50);
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

  // Store reference to ReactFlow instance
  const onInit = (flowInstance: ReactFlowInstance) => {
    reactFlowInstanceRef.current = flowInstance;
  };

  return (
    <div style={{ width: '100%', height: '800px' }}>
      <ReactFlow
        nodes={nodesWithHandlers}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={customNodeTypes}
        edgeTypes={edgeTypes}
        onInit={onInit}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Controls />
        <MiniMap 
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
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