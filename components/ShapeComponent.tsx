import React from 'react';
import type { Shape, RectangleShape, EllipseShape, PolygonShape, Tool } from '../types';
import { ToolType } from '../types';
import { getBoundingBox } from './SelectionHandles';
import { getRoundedPolygonPath } from '../utils/polygonTools';

interface ShapeComponentProps {
    shape: Shape;
    isSelected: boolean;
    activeTool: Tool;
    onPointerDown: (event: React.MouseEvent | React.TouchEvent) => void;
    onClick: (event: React.MouseEvent) => void;
    onDoubleClick?: (event: React.MouseEvent) => void;
    isEditing?: boolean;
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
        const bbox = getBoundingBox(shape);
        cx = bbox.cx;
        cy = bbox.cy;
    } else {
        return '';
    }
    return `rotate(${shape.rotation}, ${cx}, ${cy})`;
};

const ShapeComponent: React.FC<ShapeComponentProps> = ({ shape, isSelected, activeTool, onPointerDown, onClick, onDoubleClick, isEditing }) => {
    
    const getCursor = () => {
        if (isEditing) return 'default';
        if (activeTool === ToolType.SELECT) {
            return isSelected ? 'move' : 'pointer';
        }
        return 'default';
    };
    
    const commonProps = {
        fill: shape.fill,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth,
        onMouseDown: onPointerDown,
        onTouchStart: onPointerDown,
        onClick: onClick,
        onDoubleClick: onDoubleClick,
        style: { cursor: getCursor() },
        transform: getTransform(shape),
        strokeDasharray: isEditing ? "4 4" : undefined,
    };

    switch (shape.type) {
        case ToolType.RECTANGLE:
            const rect = shape as RectangleShape;
            return <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={rect.cornerRadius} ry={rect.cornerRadius} {...commonProps} />;
        
        case ToolType.CIRCLE:
            const ellipse = shape as EllipseShape;
            return <ellipse cx={ellipse.x} cy={ellipse.y} rx={ellipse.rx} ry={ellipse.ry} {...commonProps} />;
        
        case ToolType.POLYGON:
            const polygon = shape as PolygonShape;
            if (polygon.cornerRadius && polygon.cornerRadius > 0) {
                const pathData = getRoundedPolygonPath(polygon.points, polygon.cornerRadius);
                // The transform for polygons is baked into the path, but rotation is separate.
                // We re-apply the commonProps which include the rotation transform.
                return <path d={pathData} {...commonProps} />;
            }
            const pointsStr = polygon.points.map(p => `${p.x},${p.y}`).join(' ');
            return <polygon points={pointsStr} {...commonProps} />;
        
        default:
            return null;
    }
};

export default ShapeComponent;