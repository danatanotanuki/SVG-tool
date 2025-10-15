import React from 'react';
import type { Shape, Point, EllipseShape } from '../types';
import { ToolType } from '../types';

export type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate' | 'move';

export interface BBox {
    x: number;
    y: number;
    width: number;
    height: number;
    cx: number;
    cy: number;
    rotation: number;
}

export const getBoundingBox = (shape: Shape): BBox => {
    let x, y, width, height;
    const rotation = shape.rotation || 0;

    if (shape.type === ToolType.RECTANGLE) {
        ({ x, y, width, height } = shape);
    } else if (shape.type === ToolType.CIRCLE) {
        const ellipse = shape as EllipseShape;
        x = ellipse.x - ellipse.rx;
        y = ellipse.y - ellipse.ry;
        width = ellipse.rx * 2;
        height = ellipse.ry * 2;
    } else { // Polygon
        if(shape.points.length === 0) return { x: 0, y: 0, width: 0, height: 0, cx: 0, cy: 0, rotation };
        const xs = shape.points.map(p => p.x);
        const ys = shape.points.map(p => p.y);
        x = Math.min(...xs);
        y = Math.min(...ys);
        width = Math.max(...xs) - x;
        height = Math.max(...ys) - y;
    }
    return { x, y, width, height, cx: x + width / 2, cy: y + height / 2, rotation };
};

interface SelectionHandlesProps {
    shape: Shape;
    selectedCount: number;
    onPointerDown: (event: React.MouseEvent | React.TouchEvent, handle: HandleType) => void;
}

const SelectionHandles: React.FC<SelectionHandlesProps> = ({ shape, selectedCount, onPointerDown }) => {
    const bbox = getBoundingBox(shape);
    const handleSize = 10;
    const halfHandle = handleSize / 2;
    
    const strokeColor = selectedCount > 1 ? 'red' : 'blue';

    const handles: { type: HandleType, x: number, y: number, cursor: string }[] = [
        { type: 'nw', x: bbox.x - halfHandle, y: bbox.y - halfHandle, cursor: 'nwse-resize' },
        { type: 'n', x: bbox.cx - halfHandle, y: bbox.y - halfHandle, cursor: 'ns-resize' },
        { type: 'ne', x: bbox.x + bbox.width - halfHandle, y: bbox.y - halfHandle, cursor: 'nesw-resize' },
        { type: 'e', x: bbox.x + bbox.width - halfHandle, y: bbox.cy - halfHandle, cursor: 'ew-resize' },
        { type: 'se', x: bbox.x + bbox.width - halfHandle, y: bbox.y + bbox.height - halfHandle, cursor: 'nwse-resize' },
        { type: 's', x: bbox.cx - halfHandle, y: bbox.y + bbox.height - halfHandle, cursor: 'ns-resize' },
        { type: 'sw', x: bbox.x - halfHandle, y: bbox.y + bbox.height - halfHandle, cursor: 'nesw-resize' },
        { type: 'w', x: bbox.x - halfHandle, y: bbox.cy - halfHandle, cursor: 'ew-resize' },
        { type: 'rotate', x: bbox.cx - halfHandle, y: bbox.y - 30 - halfHandle, cursor: 'crosshair' },
    ];
    
    const rotationCenter = { x: bbox.cx, y: bbox.cy };

    return (
        <g transform={`rotate(${shape.rotation}, ${rotationCenter.x}, ${rotationCenter.y})`}>
            <rect
                x={bbox.x}
                y={bbox.y}
                width={bbox.width}
                height={bbox.height}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1"
                strokeDasharray="4 2"
                style={{ pointerEvents: 'none' }}
            />
            <line x1={bbox.cx} y1={bbox.y} x2={bbox.cx} y2={bbox.y - 30} stroke={strokeColor} strokeWidth="1" />
            {handles.map(h => {
                const handleProps = {
                    key: h.type,
                    x: h.x,
                    y: h.y,
                    width: handleSize,
                    height: handleSize,
                    fill: "white",
                    stroke: strokeColor,
                    strokeWidth:"1",
                    style: { cursor: h.cursor },
                    onMouseDown: (e: React.MouseEvent) => onPointerDown(e, h.type),
                    onTouchStart: (e: React.TouchEvent) => onPointerDown(e, h.type),
                };
                return h.type === 'rotate' ? <circle cx={h.x + halfHandle} cy={h.y + halfHandle} r={halfHandle + 2} {...handleProps} /> : <rect {...handleProps} />;
             })}
        </g>
    );
};

export default SelectionHandles;
