import React, { useState } from 'react';
export default function DetailPanel({isOpen,onClose,title,onEdit,onDelete,children}){
  const [editing, setEditing] = useState(false);
  if(!isOpen) return null;
  const handleEdit = () => {
    if (onEdit) onEdit();
    else setEditing(!editing);
  };
  const handleDelete = () => {
    if (onDelete) onDelete();
    else if (onClose) onClose();
  };
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={onClose}>
      <div role="dialog" aria-modal="true" style={{background:'#16213e',borderRadius:12,width:520,maxWidth:'92vw',maxHeight:'85vh',overflow:'auto',border:'1px solid #0f3460',boxShadow:'0 20px 60px rgba(0,0,0,0.6)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:20,borderBottom:'1px solid #0f3460',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{color:'#e94560',fontSize:18,margin:0}}>{title}</h2>
          <button style={{background:'none',border:'none',cursor:'pointer',color:'#a0a0b0',fontSize:24}} onClick={onClose}>&times;</button>
        </div>
        <div style={{padding:20}}>{children}</div>
        <div style={{padding:'16px 20px',borderTop:'1px solid #0f3460',display:'flex',justifyContent:'flex-end',gap:10}}>
          <button type="button" style={{padding:'8px 16px',background:'#3498db',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:'bold'}} onClick={handleEdit}>Edit</button>
          <button type="button" style={{padding:'8px 16px',background:'#e94560',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:'bold'}} onClick={handleDelete}>Delete</button>
          <button type="button" style={{padding:'8px 16px',background:'transparent',color:'#a0a0b0',border:'1px solid #0f3460',borderRadius:8,cursor:'pointer'}} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
