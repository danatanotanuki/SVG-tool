import type { Point, PathSegment } from '../types';

/**
 * Converts an array of PathSegment objects into an SVG path data string.
 * @param segments The array of PathSegment objects.
 * @returns An SVG path data string (`d` attribute).
 */
export const segmentsToPathData = (segments: PathSegment[]): string => {
    return segments.map(segment => {
        const pointsStr = segment.points.map(p => `${p.x} ${p.y}`).join(' ');
        return `${segment.command}${pointsStr}`;
    }).join(' ');
};

/**
 * Parses an SVG path data string (`d` attribute) into an array of PathSegment objects.
 * Handles absolute and relative commands for M, L, C, Q, H, V and Z.
 * @param d The SVG path data string.
 * @returns An array of PathSegment objects.
 */
export const parsePathData = (d: string): PathSegment[] => {
    const segments: PathSegment[] = [];
    // This regex splits the path data string into command-and-parameter chunks.
    const commands = d.match(/[a-z][^a-z]*/ig) || [];
    
    let currentPoint: Point = { x: 0, y: 0 };
    let startOfSubpath: Point = { x: 0, y: 0 };

    for (const commandStr of commands) {
        const commandChar = commandStr[0];
        let command = commandChar.toUpperCase();
        const isRelative = commandChar === commandChar.toLowerCase();
        
        // A more robust regex for numbers, and filter out any NaN results.
        const args = (commandStr.slice(1).match(/-?(\d*\.\d+|\d+)/g) || []).map(Number).filter(n => !isNaN(n));
        
        if (command === 'Z') {
            segments.push({ command: 'Z', points: [] });
            currentPoint = startOfSubpath;
            continue;
        }

        let argIndex = 0;
        while(argIndex < args.length) {
            // After the first moveto, subsequent coordinate pairs are treated as lineto.
            if (command === 'M' && argIndex > 0) {
                command = 'L';
            }
            
            let segmentPoints: Point[] = [];

            switch(command) {
                case 'M':
                case 'L': {
                    const x = args[argIndex++];
                    const y = args[argIndex++];
                    currentPoint = isRelative ? { x: currentPoint.x + x, y: currentPoint.y + y } : { x, y };
                    segmentPoints.push(currentPoint);
                    if (command === 'M') {
                        startOfSubpath = currentPoint;
                    }
                    segments.push({ command: command as 'M' | 'L', points: segmentPoints });
                    break;
                }
                case 'H': {
                    const x = args[argIndex++];
                    currentPoint = { x: isRelative ? currentPoint.x + x : x, y: currentPoint.y };
                    segmentPoints.push(currentPoint);
                    segments.push({ command: 'L', points: segmentPoints }); // Convert H to L
                    break;
                }
                case 'V': {
                    const y = args[argIndex++];
                    currentPoint = { x: currentPoint.x, y: isRelative ? currentPoint.y + y : y };
                    segmentPoints.push(currentPoint);
                    segments.push({ command: 'L', points: segmentPoints }); // Convert V to L
                    break;
                }
                case 'C': {
                    const [x1, y1, x2, y2, x, y] = [args[argIndex++], args[argIndex++], args[argIndex++], args[argIndex++], args[argIndex++], args[argIndex++]];
                    const p1 = isRelative ? { x: currentPoint.x + x1, y: currentPoint.y + y1 } : { x: x1, y: y1 };
                    const p2 = isRelative ? { x: currentPoint.x + x2, y: currentPoint.y + y2 } : { x: x2, y: y2 };
                    const p = isRelative ? { x: currentPoint.x + x, y: currentPoint.y + y } : { x, y };
                    segmentPoints.push(p1, p2, p);
                    currentPoint = p;
                    segments.push({ command: 'C', points: segmentPoints });
                    break;
                }
                case 'Q': {
                    const [x1, y1, x, y] = [args[argIndex++], args[argIndex++], args[argIndex++], args[argIndex++]];
                    const p1 = isRelative ? { x: currentPoint.x + x1, y: currentPoint.y + y1 } : { x: x1, y: y1 };
                    const p = isRelative ? { x: currentPoint.x + x, y: currentPoint.y + y } : { x, y };
                    segmentPoints.push(p1, p);
                    currentPoint = p;
                    segments.push({ command: 'Q', points: segmentPoints });
                    break;
                }
                case 'A': {
                    // Arc command is complex and not used in the provided SVG.
                    // For now, just consume its arguments to prevent errors.
                    argIndex += 7;
                    break;
                }
                default:
                    // Unknown command, skip all its args to avoid infinite loop
                    argIndex = args.length;
                    break;
            }
        }
    }
    
    return segments;
};
