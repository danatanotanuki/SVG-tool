import type { Point } from '../types';

// Vector math helpers
const sub = (p1: Point, p2: Point): Point => ({ x: p1.x - p2.x, y: p1.y - p2.y });
const add = (p1: Point, p2: Point): Point => ({ x: p1.x + p2.x, y: p1.y + p2.y });
const scale = (p: Point, s: number): Point => ({ x: p.x * s, y: p.y * s });
const len = (p: Point): number => Math.sqrt(p.x * p.x + p.y * p.y);
const normalize = (p: Point): Point => {
    const l = len(p);
    return l > 0 ? scale(p, 1 / l) : { x: 0, y: 0 };
};

/**
 * Generates an SVG path data string for a polygon with rounded corners.
 * @param points The array of points for the polygon.
 * @param radius The desired corner radius.
 * @returns An SVG path data string (`d` attribute).
 */
export const getRoundedPolygonPath = (points: Point[], radius: number): string => {
    if (points.length < 3 || radius <= 0) {
        return "M" + points.map(p => `${p.x} ${p.y}`).join(" L") + " Z";
    }

    const pathData: (string|number)[] = [];
    
    for (let i = 0; i < points.length; i++) {
        const p0 = points[i === 0 ? points.length - 1 : i - 1];
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        const v1 = sub(p0, p1);
        const v2 = sub(p2, p1);

        const lenV1 = len(v1);
        const lenV2 = len(v2);
        
        // Calculate the maximum possible radius for this corner to prevent collapse
        const maxRadius = Math.min(lenV1 / 2, lenV2 / 2);
        const r = Math.min(radius, maxRadius);

        const nV1 = normalize(v1);
        const nV2 = normalize(v2);

        // Calculate start and end points of the quadratic curve (the rounded corner)
        const pA = add(p1, scale(nV1, r));
        const pB = add(p1, scale(nV2, r));

        if (i === 0) {
            pathData.push("M", pA.x, pA.y);
        } else {
            pathData.push("L", pA.x, pA.y);
        }
        
        // Use a quadratic Bezier curve for the corner
        pathData.push("Q", p1.x, p1.y, pB.x, pB.y);
    }
    
    pathData.push("Z");
    return pathData.join(" ");
};
