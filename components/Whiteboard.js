'use client';
import { useRef, useState, useEffect, useCallback } from 'react';

const COLORS = ['#fafafa', '#f87171', '#4ade80', '#60a5fa', '#facc15'];

export default function Whiteboard({ onSend, onClose }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState('#fafafa');
  const [lineWidth, setLineWidth] = useState(3);
  const [eraser, setEraser] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    // Save state for undo
    setHistory(prev => [...prev, canvas.toDataURL()]);
    setDrawing(true);
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.strokeStyle = eraser ? '#0a0a0a' : color;
    ctx.lineWidth = eraser ? 20 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => setDrawing(false);

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); };
    img.src = prev;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    setHistory(prev => [...prev, canvas.toDataURL()]);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const sendToAI = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSend(dataUrl);
  };

  return (
    <div style={ws.wrap}>
      <div style={ws.head}>
        <span className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#555' }}>WHITEBOARD</span>
        <button style={ws.closeBtn} onClick={onClose}>✕</button>
      </div>
      <div style={ws.toolbar}>
        {COLORS.map(c => (
          <button key={c} onClick={() => { setColor(c); setEraser(false); }} style={{ ...ws.colorBtn, background: c, outline: color === c && !eraser ? '2px solid #fafafa' : 'none' }} />
        ))}
        <button className="mono" style={{ ...ws.toolBtn, color: eraser ? '#f87171' : '#888' }} onClick={() => setEraser(!eraser)}>
          {eraser ? '● ERASER' : 'ERASER'}
        </button>
        <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} style={ws.select}>
          <option value={2}>Thin</option>
          <option value={3}>Medium</option>
          <option value={5}>Thick</option>
        </select>
        <button className="mono" style={ws.toolBtn} onClick={undo}>UNDO</button>
        <button className="mono" style={ws.toolBtn} onClick={clear}>CLEAR</button>
      </div>
      <div style={ws.canvasWrap}>
        <canvas
          ref={canvasRef}
          style={ws.canvas}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div style={ws.footer}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={sendToAI}>Send to AI →</button>
      </div>
    </div>
  );
}

const ws = {
  wrap: { display: 'flex', flexDirection: 'column', height: '100%' },
  head: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2a2a' },
  closeBtn: { fontSize: 14, color: '#555', background: 'none', border: 'none', cursor: 'pointer' },
  toolbar: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: '1px solid #2a2a2a', flexWrap: 'wrap' },
  colorBtn: { width: 20, height: 20, border: '1px solid #2a2a2a', cursor: 'pointer', borderRadius: 0 },
  toolBtn: { fontSize: 10, letterSpacing: '0.05em', background: 'none', border: '1px solid #2a2a2a', padding: '4px 8px', color: '#888', cursor: 'pointer' },
  select: { fontSize: 11, background: '#111', color: '#888', border: '1px solid #2a2a2a', padding: '4px 6px' },
  canvasWrap: { flex: 1, padding: 8, overflow: 'hidden' },
  canvas: { width: '100%', height: '100%', cursor: 'crosshair', display: 'block', border: '1px solid #2a2a2a' },
  footer: { padding: '8px 12px', borderTop: '1px solid #2a2a2a', display: 'flex' },
};
