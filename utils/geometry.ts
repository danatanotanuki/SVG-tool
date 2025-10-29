import type { Point, Shape } from '../types';
import { ToolType } from '../types';

export const getVertices = (shape: Shape): Point[] => {
    if (shape.type === ToolType.RECTANGLE) {
        const { x, y, width, height } = shape;
        const points = [
            { x, y },
            { x: x + width, y },
            { x: x + width, y: y + height },
            { x, y: y + height },
        ];
        // Apply rotation
        const rotation = shape.rotation || 0;
        if (rotation !== 0) {
            const rad = rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const cx = x + width / 2;
            const cy = y + height / 2;
            return points.map(p => {
                const translatedX = p.x - cx;
                const translatedY = p.y - cy;
                return {
                    x: translatedX * cos - translatedY * sin + cx,
                    y: translatedX * sin + translatedY * cos + cy,
                };
            });
        }
        return points;
    }
    if (shape.type === ToolType.POLYGON) {
        return shape.points;
    }
    return [];
};

const rotatePoint = (point: Point, center: Point, angle: number): Point => {
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const translatedX = point.x - center.x;
    const translatedY = point.y - center.y;

    return {
        x: translatedX * cos - translatedY * sin + center.x,
        y: translatedX * sin + translatedY * cos + center.y,
    };
};

export const getShapeAABB = (shape: Shape): { minX: number, minY: number, maxX: number, maxY: number } => {
    const rotation = shape.rotation || 0;
    if (rotation === 0) {
        if (shape.type === ToolType.RECTANGLE) {
            return { minX: shape.x, minY: shape.y, maxX: shape.x + shape.width, maxY: shape.y + shape.height };
        } else if (shape.type === ToolType.CIRCLE) {
            return { minX: shape.x - shape.rx, minY: shape.y - shape.ry, maxX: shape.x + shape.rx, maxY: shape.y + shape.ry };
        } else if (shape.type === ToolType.POLYGON) {
            if (shape.points.length === 0) return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
            const xs = shape.points.map(p => p.x);
            const ys = shape.points.map(p => p.y);
            return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
        }
    }

    let points: Point[] = [];
    let center: Point;

    if (shape.type === ToolType.RECTANGLE) {
        const { x, y, width, height } = shape;
        center = { x: x + width / 2, y: y + height / 2 };
        points = [
            { x, y },
            { x: x + width, y },
            { x: x + width, y: y + height },
            { x, y: y + height },
        ];
    } else if (shape.type === ToolType.CIRCLE) {
        const { x, y, rx, ry } = shape;
        center = { x, y };
        // Approximate with bounding box of the ellipse
        const bbX = x - rx;
        const bbY = y - ry;
        const width = rx * 2;
        const height = ry * 2;
         points = [
            { x: bbX, y: bbY },
            { x: bbX + width, y: bbY },
            { x: bbX + width, y: bbY + height },
            { x: bbX, y: bbY + height },
        ];
    } else { // Polygon
        if (shape.points.length === 0) return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        const xs = shape.points.map(p => p.x);
        const ys = shape.points.map(p => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const width = Math.max(...xs) - minX;
        const height = Math.max(...ys) - minY;
        center = { x: minX + width / 2, y: minY + height / 2 };
        points = shape.points;
    }

    const rotatedPoints = points.map(p => rotatePoint(p, center, rotation));
    const xs = rotatedPoints.map(p => p.x);
    const ys = rotatedPoints.map(p => p.y);

    return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
    };
};