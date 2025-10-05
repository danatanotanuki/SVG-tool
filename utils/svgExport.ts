
import type { Layer, Shape, RectangleShape, EllipseShape, PolygonShape, Point } from '../types';
import { ToolType } from '../types';

const getShapeSVG = (shape: Shape): string => {
    const getTransform = (s: Shape) => {
        let cx, cy;
        if (s.type === ToolType.RECTANGLE) {
            cx = s.x + s.width / 2;
            cy = s.y + s.height / 2;
        } else if (s.type === ToolType.CIRCLE) {
            cx = s.x;
            cy = s.y;
        } else { // Polygon
            if (s.points.length === 0) return '';
            const xs = s.points.map(p => p.x);
            const ys = s.points.map(p => p.y);
            cx = xs.reduce((a, b) => a + b, 0) / xs.length;
            cy = ys.reduce((a, b) => a + b, 0) / ys.length;
        }
        return s.rotation !== 0 ? `transform="rotate(${s.rotation} ${cx} ${cy})"` : '';
    };

    const commonProps = `fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" ${getTransform(shape)}`;

    switch (shape.type) {
        case ToolType.RECTANGLE:
            const rect = shape as RectangleShape;
            return `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" ${commonProps} />`;
        case ToolType.CIRCLE:
            const ellipse = shape as EllipseShape;
            return `<ellipse cx="${ellipse.x}" cy="${ellipse.y}" rx="${ellipse.rx}" ry="${ellipse.ry}" ${commonProps} />`;
        case ToolType.POLYGON:
            const polygon = shape as PolygonShape;
            if (polygon.points.length === 0) return '';
            const pointsStr = polygon.points.map(p => `${p.x},${p.y}`).join(' ');
            return `<polygon points="${pointsStr}" ${commonProps} />`;
        default:
            return '';
    }
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

const getRotatedBoundingBox = (shape: Shape): { minX: number, minY: number, maxX: number, maxY: number } => {
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
        center = { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length };
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


export const exportToSVG = (layers: Layer[], title?: string) => {
    const visibleLayers = layers.filter(layer => layer.isVisible);
    let hasShapes = false;

    let globalMinX = Infinity;
    let globalMinY = Infinity;
    let globalMaxX = -Infinity;
    let globalMaxY = -Infinity;

    visibleLayers.forEach(layer => {
        if (layer.shapes.length > 0) hasShapes = true;
        layer.shapes.forEach(shape => {
            const bbox = getRotatedBoundingBox(shape);
            globalMinX = Math.min(globalMinX, bbox.minX);
            globalMinY = Math.min(globalMinY, bbox.minY);
            globalMaxX = Math.max(globalMaxX, bbox.maxX);
            globalMaxY = Math.max(globalMaxY, bbox.maxY);
        });
    });

    const svgTitle = title ? `\n  <title>${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>` : '';

    const svgContent = visibleLayers
        .slice()
        .reverse()
        .map(layer => 
            `<g id="${layer.name.replace(/\s+/g, '_')}">\n` +
            layer.shapes.map(shape => `  ${getShapeSVG(shape)}`).join('\n') +
            `\n</g>`
        )
        .join('\n');

    let fullSVG: string;

    if (hasShapes) {
        const padding = 10;
        const viewBoxX = globalMinX - padding;
        const viewBoxY = globalMinY - padding;
        const viewBoxWidth = (globalMaxX - globalMinX) + 2 * padding;
        const viewBoxHeight = (globalMaxY - globalMinY) + 2 * padding;
        
        fullSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}">` +
                  `${svgTitle}\n${svgContent}\n</svg>`;
    } else {
        const canvas = document.querySelector('svg');
        const width = canvas?.clientWidth || 1000;
        const height = canvas?.clientHeight || 800;
        fullSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">` +
                  `${svgTitle}\n${svgContent}\n</svg>`;
    }

    const blob = new Blob([fullSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drawing-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
