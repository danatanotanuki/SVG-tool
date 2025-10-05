import React from 'react';
import type { Shape, RectangleShape, EllipseShape, PolygonShape, Tool } from '../types';
import { ToolType } from '../types';

interface ShapeComponentProps {
    shape: Shape;
    isSelected: boolean;
    activeTool: Tool;
    onMouseDown: (event: React.MouseEvent) => void;
    onClick: (event: React.MouseEvent) => void;
}

const getTransform = (shape: Shape) => {
    let cx, cy;
    if (shape.type === ToolType.RECTANGLE) {
        cx = shape.x + shape.width / 2;
        cy = shape.y + shape.height / 2;
    } else if (shape.type === ToolType.CIRCLE) {
        cx = shape.x;
        cy = shape.y;
    } else if (shape.type === ToolType.POLYGON) {
        if (shape.points.length === 0) return '';
        const xs = shape.points.map(p => p.x);
        const ys = shape.points.map(p => p.y);
        cx = xs.reduce((a, b) => a + b, 0) / xs.length;
        cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    } else {
        return '';
    }
    return `rotate(${shape.rotation}, ${cx}, ${cy})`;
};

const ShapeComponent: React.FC<ShapeComponentProps> = ({ shape, isSelected, activeTool, onMouseDown, onClick }) => {
    
    const getCursor = () => {
        if (activeTool === ToolType.SELECT) {
            return isSelected ? 'move' : 'pointer';
        }
        return 'default';
    };
    
    const commonProps = {
        fill: shape.fill,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth,
        onMouseDown: onMouseDown,
        onClick: onClick,
        style: { cursor: getCursor() },
        transform: getTransform(shape)
    };

    switch (shape.type) {
        case ToolType.RECTANGLE:
            const rect = shape as RectangleShape;
            return <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} {...commonProps} />;
        
        case ToolType.CIRCLE:
            const ellipse = shape as EllipseShape;
            return <ellipse cx={ellipse.x} cy={ellipse.y} rx={ellipse.rx} ry={ellipse.ry} {...commonProps} />;
        
        case ToolType.POLYGON:
            const polygon = shape as PolygonShape;
            const pointsStr = polygon.points.map(p => `${p.x},${p.y}`).join(' ');
            return <polygon points={pointsStr} {...commonProps} />;
        
        default:
            return null;
    }
};

export default ShapeComponent;