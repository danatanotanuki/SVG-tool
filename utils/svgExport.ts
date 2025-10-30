import type { Layer, Shape, RectangleShape, EllipseShape, PolygonShape, Point, Artboard, PathShape } from '../types';
import { ToolType } from '../types';
import { getRoundedPolygonPath } from './polygonTools';
import { getShapeAABB } from './geometry';
import { segmentsToPathData } from './pathTools';

const getShapeSVG = (shape: Shape): string => {
    const getTransform = (s: Shape) => {
        let cx, cy;
        if (s.type === ToolType.RECTANGLE) {
            cx = s.x + s.width / 2;
            cy = s.y + s.height / 2;
        } else if (s.type === ToolType.CIRCLE) {
            cx = s.x;
            cy = s.y;
        } else { // Polygon or Path
            const bbox = getShapeAABB(s);
             if (bbox.minX === Infinity) return '';
            cx = bbox.minX + (bbox.maxX - bbox.minX) / 2;
            cy = bbox.minY + (bbox.maxY - bbox.minY) / 2;
        }
        return s.rotation !== 0 ? `transform="rotate(${s.rotation} ${cx} ${cy})"` : '';
    };

    const commonProps = `fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" ${getTransform(shape)}`;

    switch (shape.type) {
        case ToolType.RECTANGLE:
            const rect = shape as RectangleShape;
            const cornerRadius = rect.cornerRadius ? `rx="${rect.cornerRadius}" ry="${rect.cornerRadius}"` : '';
            return `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" ${cornerRadius} ${commonProps} />`;
        case ToolType.CIRCLE:
            const ellipse = shape as EllipseShape;
            return `<ellipse cx="${ellipse.x}" cy="${ellipse.y}" rx="${ellipse.rx}" ry="${ellipse.ry}" ${commonProps} />`;
        case ToolType.POLYGON:
            const polygon = shape as PolygonShape;
            if (polygon.points.length === 0) return '';
            if (polygon.cornerRadius && polygon.cornerRadius > 0) {
                const pathData = getRoundedPolygonPath(polygon.points, polygon.cornerRadius);
                return `<path d="${pathData}" ${commonProps} />`;
            }
            const pointsStr = polygon.points.map(p => `${p.x},${p.y}`).join(' ');
            return `<polygon points="${pointsStr}" ${commonProps} />`;
        case ToolType.PATH:
            const path = shape as PathShape;
            const fillRule = path.fillRule ? `fill-rule="${path.fillRule}"` : '';
            return `<path d="${segmentsToPathData(path.segments)}" ${fillRule} ${commonProps} />`;
        default:
            return '';
    }
};

export const exportToSVG = (layers: Layer[], title?: string, artboard?: Artboard | null) => {
    const visibleLayers = layers.filter(layer => layer.isVisible);
    let hasShapes = false;

    let globalMinX = Infinity;
    let globalMinY = Infinity;
    let globalMaxX = -Infinity;
    let globalMaxY = -Infinity;

    visibleLayers.forEach(layer => {
        if (layer.shapes.length > 0) hasShapes = true;
        layer.shapes.forEach(shape => {
            const bbox = getShapeAABB(shape);
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

    if (artboard) {
        const { width, height } = artboard;
        const viewBoxX = -width / 2;
        const viewBoxY = -height / 2;
        
        fullSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${width} ${height}" width="${width}" height="${height}">` +
                  `${svgTitle}\n${svgContent}\n</svg>`;
    }
    else if (hasShapes && globalMinX !== Infinity) {
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