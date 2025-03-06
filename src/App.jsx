import React, { useState, useEffect } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import _ from 'lodash';
import organization from './org.json';

import { ArrowBigDown, ArrowBigDownDash, ArrowBigDownDashIcon, ArrowBigDownIcon } from 'lucide-react';

const cardStyle = {
  background: 'white',
  display: 'inline-block',
  borderRadius: '16px',
  border: '1px solid #e0e0e0',
  margin: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  fontFamily: 'Arial, sans-serif'
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px',
  borderBottom: '1px solid #f0f0f0'
};

const avatarStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: '#ECECF4',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '12px'
};

const menuStyle = {
  position: 'absolute',
  background: 'white',
  border: '1px solid #e0e0e0',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  borderRadius: '8px',
  padding: '8px',
  zIndex: 10
};

const menuItemStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px',
  cursor: 'pointer'
};

// Style for accounts container
const accountsContainerStyle = {
  display: 'flex',
  // flexDirection: 'column',
  flexWrap: 'wrap',
  // justifyContent: 'flex-start',
  padding: '12px',
  background: '#f6f6f6',
  borderRadius: '12px',
  // margin: '12px',
  minWidth: '100px'
};

function Organization({ org, onCollapse, collapsed }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [{ canDrop, isOver }, drop] = useDrop({
    accept: "ACCOUNT",
    drop: () => ({ name: org.tradingName }),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  const isActive = canDrop && isOver;
  let backgroundColor = "white";
  if (isActive) {
    backgroundColor = "#ddffd2";
  } else if (canDrop) {
    backgroundColor = "#ffeedc";
  }

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div 
      style={{
        ...cardStyle, 
        backgroundColor,
        position: 'relative'
      }} 
      ref={drop}
    >
      <div style={headerStyle}>
        <div 
          style={{
            ...avatarStyle,
            cursor: 'pointer'
          }} 
          onClick={onCollapse}
        >
          {collapsed ? <ArrowBigDown /> : <ArrowBigDownDash />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold' }}>{org.tradingName}</div>
          <div style={{ fontSize: '0.8em', color: '#666' }}>
            {_.size(org.organizationChildRelationship)} Sub Profiles, 
            {_.size(org.account)} Sub Accounts
          </div>
        </div>
        <button 
          onClick={handleClick} 
          style={{
            background: 'none', 
            border: 'none', 
            cursor: 'pointer'
          }}
        >
          <ArrowBigDownIcon />
        </button>
      </div>

      {anchorEl && (
        <div 
          style={{
            ...menuStyle,
            top: '100%',
            right: 0
          }}
        >
          <div 
            style={menuItemStyle} 
            onClick={handleClose}
          >
           <ArrowBigDownDash />
            Add Sub Profile
          </div>
          <div 
            style={menuItemStyle} 
            onClick={handleClose}
          >
            <ArrowBigDownDashIcon />
            Add Sub Account
          </div>
        </div>
      )}
    </div>
  );
}

function Account({ a }) {
  const [{ isDragging }, drag] = useDrag({
    type: "ACCOUNT",
    item: { 
      type: "ACCOUNT", 
      name: a.name 
    },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult();
      if (item && dropResult) {
        alert(`You moved ${item.name} to ${dropResult.name}`);
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div 
      ref={drag} 
      style={{
        ...cardStyle,
        cursor: 'pointer',
        opacity: isDragging ? 0.4 : 1,
        margin: '8px',
        width: '150px'  // Fixed width for column-like appearance
      }}
    >
      <div style={headerStyle}>
        <div style={avatarStyle}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="10" y1="21" x2="14" y2="21"></line>
          </svg>
        </div>
        <div style={{ fontWeight: 'bold' }}>{a.name}</div>
      </div>
    </div>
  );
}

function AccountsContainer({ accounts }) {
  if (!accounts || accounts.length === 0) return null;
  
  return (
    <div style={accountsContainerStyle}>
      {accounts.map((account) => (
        <Account key={account.name} a={account} />
      ))}
    </div>
  );
}

// Initialize all nodes as collapsed
function initializeCollapsedState(orgData) {
  // Set each node to collapsed by default
  orgData.collapsed = true;
  
  // Recursively set all children to collapsed
  if (orgData.organizationChildRelationship && orgData.organizationChildRelationship.length > 0) {
    orgData.organizationChildRelationship.forEach(child => {
      initializeCollapsedState(child);
    });
  }
  
  return orgData;
}

function Node({ o, parent }) {
  // Use local collapsed state for each node
  const [collapsed, setCollapsed] = useState(true);
  const [childrenVisible, setChildrenVisible] = useState(false);

  const handleCollapse = () => {
    // Toggle collapsed state
    setCollapsed(!collapsed);
    
    // If expanding, show children
    if (collapsed) {
      setChildrenVisible(true);
    }
  };

  const hasAccounts = o.account && o.account.length > 0;
  const hasChildren = o.organizationChildRelationship && o.organizationChildRelationship.length > 0;

  const T = parent
    ? TreeNode
    : (props) => (
        <Tree
          {...props}
          lineWidth={"2px"}
          lineColor={"#bbc"}
          lineBorderRadius={"12px"}
        >
          {props.children}
        </Tree>
      );

  return (
    <T
      label={
        <div>
          <Organization
            org={o}
            onCollapse={handleCollapse}
            collapsed={collapsed}
          />
          {/* Display accounts only if this node is expanded */}
          {!collapsed && hasAccounts && <AccountsContainer accounts={o.account} />}
        </div>
      }
    >
      {/* Show child organizations only if not collapsed and children are visible */}
      {!collapsed && childrenVisible && hasChildren && 
        _.map(o.organizationChildRelationship, (c) => (
          <Node key={c.tradingName} o={c} parent={o} />
        ))
      }
    </T>
  );
}

export default function App() {
  // Initialize organization data with all nodes collapsed
  const [orgData, setOrgData] = useState(null);
  
  useEffect(() => {
    // Clone the organization data and set all nodes to collapsed
    const initializedData = _.cloneDeep(organization);
    initializeCollapsedState(initializedData);
    setOrgData(initializedData);
  }, []);
  
  if (!orgData) return <div>Loading...</div>;

  return (
    <div 
      style={{ 
        background: '#ECECF4', 
        padding: '16px', 
        height: '100vh', 
        width: '100vw',
        fontFamily: 'Arial, sans-serif', 
        color: '#333',
        overflowX: 'auto'  // Add horizontal scrolling for wide charts
      }}
    >
      <DndProvider backend={HTML5Backend}>
        <Node o={orgData} />
      </DndProvider>
    </div>
  );
}