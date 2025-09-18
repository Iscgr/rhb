
import React, { useEffect, useState, useMemo, useRef, WheelEvent, MouseEvent } from 'react';
import { VisualData, GraphNode } from '../types';

interface VisualGraphProps {
  data: VisualData;
  onNodeClick: (node: GraphNode) => void;
  selectedNodeId?: string | null;
}

interface Position { x: number; y: number; }
interface ViewBox { x: number; y: number; width: number; height: number; }

const NODE_COLORS: Record<GraphNode['type'], string> = {
    protocol: '#06b6d4', // cyan-500
    tool: '#34d399',     // emerald-400
    vulnerability: '#f87171', // red-400
    concept: '#a78bfa',  // violet-400
    solution: '#60a5fa', // blue-400
};

const SIM_WIDTH = 800;
const SIM_HEIGHT = 600;

const VisualGraph: React.FC<VisualGraphProps> = ({ data, onNodeClick, selectedNodeId }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, width: SIM_WIDTH, height: SIM_HEIGHT });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  
  const graphNodes = useMemo(() => data?.nodes || [], [data?.nodes]);
  const graphEdges = useMemo(() => data?.edges || [], [data?.edges]);

  const positions = useMemo(() => {
    if (graphNodes.length === 0) return {};

    const nodes = [...graphNodes];
    const edges = [...graphEdges];
    const pos: Record<string, Position> = {};
    nodes.forEach(node => { pos[node.id] = { x: Math.random() * SIM_WIDTH, y: Math.random() * SIM_HEIGHT }; });

    const iterations = 100;
    const k = Math.sqrt(SIM_WIDTH * SIM_HEIGHT / nodes.length);

    for (let i = 0; i < iterations; i++) {
        for (const n1 of nodes) {
            for (const n2 of nodes) {
                if (n1.id === n2.id) continue;
                const dx = pos[n1.id].x - pos[n2.id].x;
                const dy = pos[n1.id].y - pos[n2.id].y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const repulsiveForce = k * k / dist;
                pos[n1.id].x += dx / dist * repulsiveForce;
                pos[n1.id].y += dy / dist * repulsiveForce;
            }
        }

        for (const edge of edges) {
            const source = pos[edge.from];
            const target = pos[edge.to];
            if (!source || !target) continue;
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const attractiveForce = dist * dist / k;
            const moveX = dx / dist * attractiveForce;
            const moveY = dy / dist * attractiveForce;

            pos[edge.from].x += moveX;
            pos[edge.from].y += moveY;
            pos[edge.to].x -= moveX;
            pos[edge.to].y -= moveY;
        }
        
        for (const node of nodes) {
            const d_from_center_x = pos[node.id].x - SIM_WIDTH / 2;
            const d_from_center_y = pos[node.id].y - SIM_HEIGHT / 2;
            pos[node.id].x -= d_from_center_x * 0.1;
            pos[node.id].y -= d_from_center_y * 0.1;

            pos[node.id].x = Math.max(30, Math.min(SIM_WIDTH - 30, pos[node.id].x));
            pos[node.id].y = Math.max(30, Math.min(SIM_HEIGHT - 30, pos[node.id].y));
        }
    }
    
    return pos;
  }, [graphNodes, graphEdges]);
  
  const handleWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!svgRef.current) return;
    
    const zoomFactor = 1.1;
    const { deltaY } = e;
    const direction = deltaY < 0 ? 'in' : 'out';

    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    
    const transformedPoint = svgPoint.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    
    const scale = direction === 'in' ? 1 / zoomFactor : zoomFactor;
    
    const newWidth = viewBox.width * scale;
    const newHeight = viewBox.height * scale;

    const dx = (transformedPoint.x - viewBox.x) * (scale - 1);
    const dy = (transformedPoint.y - viewBox.y) * (scale - 1);

    const newX = viewBox.x - dx;
    const newY = viewBox.y - dy;

    setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
  };

  const handleMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
  };
  
  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    e.preventDefault();
    
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    
    const scaleX = viewBox.width / (svgRef.current?.clientWidth || 1);
    const scaleY = viewBox.height / (svgRef.current?.clientHeight || 1);
    
    setViewBox(prev => ({ ...prev, x: prev.x - dx * scaleX, y: prev.y - dy * scaleY }));
    panStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsPanning(false);

  if (graphNodes.length === 0) {
      return <div className="flex items-center justify-center h-full text-slate-400">نقشه بصری برای نمایش وجود ندارد.</div>;
  }
  if (Object.keys(positions).length === 0) {
      return <div className="flex items-center justify-center h-full text-slate-400">در حال رندر کردن نقشه بصری...</div>;
  }

  return (
    <svg 
      ref={svgRef}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} 
      className={`w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      role="graphics-document"
      aria-label="نقشه مفهومی تعاملی"
    >
      <g>
        {graphEdges.map((edge, i) => {
            const fromPos = positions[edge.from];
            const toPos = positions[edge.to];
            if (!fromPos || !toPos) return null;
            return (
                <line
                    key={`edge-${i}`}
                    x1={fromPos.x} y1={fromPos.y}
                    x2={toPos.x} y2={toPos.y}
                    stroke="rgba(71, 85, 105, 0.7)"
                    strokeWidth="2"
                />
            );
        })}
      </g>
      <g>
        {graphNodes.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;
          const isSelected = selectedNodeId === node.id;
          const color = NODE_COLORS[node.type] || '#a78bfa';
          const radius = 15 + (node.centrality * 15);
          return (
              <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => onNodeClick(node)}
                  className="cursor-pointer group"
                  role="img"
                  aria-label={`نود: ${node.label}، نوع: ${node.type}`}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNodeClick(node)}
              >
                  <circle
                      r={isSelected ? radius + 5 : radius}
                      fill={color}
                      stroke="rgba(15, 23, 42, 0.8)"
                      strokeWidth="3"
                      className="transition-all duration-300"
                  />
                  {isSelected && <circle r={radius + 10} fill="none" stroke={color} strokeWidth="2" className="opacity-70 animate-pulse" />}
                  <text
                      textAnchor="middle" dy=".3em"
                      fill="#ffffff" fontSize="12" fontWeight="bold"
                      className="pointer-events-none select-none"
                  >
                      {node.label}
                  </text>
              </g>
          );
        })}
      </g>
    </svg>
  );
};

export default VisualGraph;