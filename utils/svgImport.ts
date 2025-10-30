
import type { Shape, Point, ShapeStyle, PathShape, PathSegment } from '../types';
import { ToolType } from '../types';
import { parsePathData } from './pathTools';

function parseStyles(element: SVGElement, defaultStyles: ShapeStyle): ShapeStyle & { fillRule?: 'evenodd' | 'nonzero' } {
    const style = window.getComputedStyle(element);
    const fillRule = element.getAttribute('fill-rule') as 'evenodd' | 'nonzero' | null;
    
    return {
        fill: style.fill && style.fill !== 'none' ? style.fill : defaultStyles.fill,
        stroke: style.stroke && style.stroke !== 'none' ? style.stroke : defaultStyles.stroke,
        strokeWidth: style.strokeWidth ? parseFloat(style.strokeWidth) : defaultStyles.strokeWidth,
        ...(fillRule && { fillRule }),
    };
}

function applyTransformToSegments(segments: PathSegment[], matrix: DOMMatrix): PathSegment[] {
    const transformPoint = (p: Point) => {
        const domPoint = new DOMPoint(p.x, p.y).matrixTransform(matrix);
        return { x: domPoint.x, y: domPoint.y };
    };

    return segments.map(seg => ({
        ...seg,
        // We assume arc transformations are baked in by browser, so we only transform coordinate points
        points: seg.command === 'A' ? seg.points : seg.points.map(transformPoint),
    }));
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
    
    // Temporarily remove viewBox, width, and height attributes to prevent global scaling.
    // This ensures that the getCTM() call for child elements returns coordinates
    // in a neutral system, independent of the imported SVG's own coordinate system settings.
    svgElement.removeAttribute('viewBox');
    svgElement.removeAttribute('width');
    svgElement.removeAttribute('height');

    // Style the SVG to be invisible and append it to the DOM.
    // This allows the browser to compute the correct CTM.
    svgElement.style.position = 'absolute';
    svgElement.style.left = '-9999px';
    svgElement.style.top = '-9999px';
    document.body.appendChild(svgElement);

    const shapes: PathShape[] = [];

    try {
        const elements = svgElement.querySelectorAll('rect, circle, ellipse, polygon, path, line, polyline');

        elements.forEach((el) => {
            const element = el as SVGGraphicsElement;
            
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return;
            }

            let d = '';
            const tagName = element.tagName.toLowerCase();

            if (tagName === 'rect') {
                const x = (element as SVGRectElement).x.baseVal.value;
                const y = (element as SVGRectElement).y.baseVal.value;
                const width = (element as SVGRectElement).width.baseVal.value;
                const height = (element as SVGRectElement).height.baseVal.value;
                const rx = (element as SVGRectElement).rx.baseVal.value;
                const ry = (element as SVGRectElement).ry.baseVal.value;
                 if (rx || ry) {
                    d = `M${x + rx},${y} h${width - 2 * rx} a${rx},${ry} 0 0 1 ${rx},${ry} v${height - 2 * ry} a${rx},${ry} 0 0 1 -${rx},${ry} h-${width - 2 * rx} a${rx},${ry} 0 0 1 -${rx},-${ry} v-${height - 2 * ry} a${rx},${ry} 0 0 1 ${rx},-${ry} z`;
                } else {
                    d = `M${x},${y} h${width} v${height} h-${width} z`;
                }
            } else if (tagName === 'circle') {
                const cx = (element as SVGCircleElement).cx.baseVal.value;
                const cy = (element as SVGCircleElement).cy.baseVal.value;
                const r = (element as SVGCircleElement).r.baseVal.value;
                d = `M${cx-r},${cy} a${r},${r} 0 1,0 ${r*2},0 a${r},${r} 0 1,0 -${r*2},0 z`;
            } else if (tagName === 'ellipse') {
                const cx = (element as SVGEllipseElement).cx.baseVal.value;
                const cy = (element as SVGEllipseElement).cy.baseVal.value;
                const rx = (element as SVGEllipseElement).rx.baseVal.value;
                const ry = (element as SVGEllipseElement).ry.baseVal.value;
                d = `M${cx-rx},${cy} a${rx},${ry} 0 1,0 ${rx*2},0 a${rx},${ry} 0 1,0 -${rx*2},0 z`;
            } else if (tagName === 'polygon' || tagName === 'polyline') {
                const points = (element as SVGPolygonElement).points;
                if (points.numberOfItems > 0) {
                     d = `M${points.getItem(0).x} ${points.getItem(0).y} ` + 
                         Array.from({length: points.numberOfItems - 1}, (_, i) => `L${points.getItem(i+1).x} ${points.getItem(i+1).y}`).join(' ');
                    if (tagName === 'polygon') d += ' Z';
                }
            } else if (tagName === 'line') {
                const line = element as SVGLineElement;
                d = `M${line.x1.baseVal.value} ${line.y1.baseVal.value} L${line.x2.baseVal.value} ${line.y2.baseVal.value}`;
            } else if (tagName === 'path') {
                d = element.getAttribute('d') || '';
            }

            if (d) {
                let segments = parsePathData(d);
                const matrix = element.getCTM();
                
                if (matrix && !matrix.isIdentity) {
                     segments = applyTransformToSegments(segments, matrix);
                }

                if (segments.length > 0) {
                    const shapeStyles = parseStyles(element, defaultStyles);
                    shapes.push({
                        id: `shape-${Date.now()}-${Math.random()}`,
                        type: ToolType.PATH,
                        segments: segments,
                        x: 0, y: 0, rotation: 0, // Position and rotation are baked into path data
                        ...shapeStyles,
                    });
                }
            }
        });
    } finally {
        // Clean up by removing the temporary SVG element from the DOM
        document.body.removeChild(svgElement);
    }

    return shapes;
}
