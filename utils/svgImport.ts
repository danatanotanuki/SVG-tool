
import type { Shape, Point, ShapeStyle, PolygonShape } from '../types';
import { ToolType } from '../types';

function parseStyles(element: SVGElement, defaultStyles: ShapeStyle): ShapeStyle {
    const style = window.getComputedStyle(element);
    return {
        fill: style.fill && style.fill !== 'none' ? style.fill : defaultStyles.fill,
        stroke: style.stroke && style.stroke !== 'none' ? style.stroke : defaultStyles.stroke,
        strokeWidth: style.strokeWidth ? parseFloat(style.strokeWidth) : defaultStyles.strokeWidth,
    };
}

function applyTransform(points: Point[], matrix: DOMMatrix): Point[] {
    return points.map(p => {
        const domPoint = new DOMPoint(p.x, p.y).matrixTransform(matrix);
        return { x: domPoint.x, y: domPoint.y };
    });
}

export function parseSVG(svgString: string, defaultStyles: ShapeStyle): Shape[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    const errorNode = doc.querySelector('parsererror');

    if (errorNode) {
        throw new Error('Invalid SVG code: ' + errorNode.textContent);
    }
    if (!svgElement) {
        throw new Error('No <svg> element found');
    }

    const shapes: PolygonShape[] = [];

    // Temporary container to perform DOM calculations
    const tempContainer = document.createElement('div');
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.position = 'absolute';
    document.body.appendChild(tempContainer);
    
    const elements = svgElement.querySelectorAll('rect, circle, ellipse, polygon, path');

    elements.forEach((el) => {
        const element = el as SVGGraphicsElement;

        // Skip elements with no visibility
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return;
        }

        let points: Point[] = [];
        const tagName = element.tagName.toLowerCase();

        if (tagName === 'rect') {
            // FIX: Cast element to SVGRectElement to access x, y, width, and height properties.
            const rectElement = element as SVGRectElement;
            const x = rectElement.x.baseVal.value;
            const y = rectElement.y.baseVal.value;
            const width = rectElement.width.baseVal.value;
            const height = rectElement.height.baseVal.value;
            points = [
                { x, y },
                { x: x + width, y },
                { x: x + width, y: y + height },
                { x, y: y + height },
            ];
        } else if (tagName === 'circle') {
            const cx = (element as SVGCircleElement).cx.baseVal.value;
            const cy = (element as SVGCircleElement).cy.baseVal.value;
            const r = (element as SVGCircleElement).r.baseVal.value;
            // Approximate circle as a polygon
            const segments = 32;
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * 2 * Math.PI;
                points.push({
                    x: cx + r * Math.cos(angle),
                    y: cy + r * Math.sin(angle),
                });
            }
        } else if (tagName === 'ellipse') {
            const cx = (element as SVGEllipseElement).cx.baseVal.value;
            const cy = (element as SVGEllipseElement).cy.baseVal.value;
            const rx = (element as SVGEllipseElement).rx.baseVal.value;
            const ry = (element as SVGEllipseElement).ry.baseVal.value;
            // Approximate ellipse as a polygon
            const segments = 32;
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * 2 * Math.PI;
                points.push({
                    x: cx + rx * Math.cos(angle),
                    y: cy + ry * Math.sin(angle),
                });
            }
        } else if (tagName === 'polygon') {
            const polygonPoints = (element as SVGPolygonElement).points;
            for (let i = 0; i < polygonPoints.numberOfItems; i++) {
                const p = polygonPoints.getItem(i);
                points.push({ x: p.x, y: p.y });
            }
        } else if (tagName === 'path') {
            const path = element as SVGPathElement;
            const len = path.getTotalLength();
            if (len > 0) {
                // Sample points along the path
                const step = Math.min(len / 100, 5); // Adjust step for detail
                for (let i = 0; i < len; i += step) {
                    const p = path.getPointAtLength(i);
                    points.push({ x: p.x, y: p.y });
                }
                 points.push(path.getPointAtLength(len)); // Add the last point
            }
        }

        if (points.length > 0) {
            // Get transform matrix relative to the svg container
            const matrix = element.getCTM();
            
            if (matrix) {
                points = applyTransform(points, matrix);
            }

            const shapeStyles = parseStyles(element, defaultStyles);

            shapes.push({
                id: `shape-${Date.now()}-${Math.random()}`,
                type: ToolType.POLYGON,
                points,
                x: 0,
                y: 0,
                rotation: 0,
                ...shapeStyles,
            });
        }
    });

    // Clean up the temporary container
    document.body.removeChild(tempContainer);

    return shapes;
}
