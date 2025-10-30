export interface Point {
    x: number;
    y: number;
}

export enum ToolType {
    SELECT = 'select',
    RECTANGLE = 'rectangle',
    CIRCLE = 'circle',
    POLYGON = 'polygon',
    PATH = 'path',
}

export type Tool = ToolType;

export interface ShapeStyle {
    fill: string;
    stroke: string;
    strokeWidth: number;
}

interface BaseShape extends ShapeStyle {
    id: string;
    type: ToolType;
    x: number;
    y: number;
    rotation: number;
    groupId?: string;
}

export interface RectangleShape extends BaseShape {
    type: ToolType.RECTANGLE;
    width: number;
    height: number;
    cornerRadius?: number;
}

export interface EllipseShape extends BaseShape {
    type: ToolType.CIRCLE;
    rx: number;
    ry: number;
}

export interface PolygonShape extends BaseShape {
    type: ToolType.POLYGON;
    points: Point[];
    cornerRadius?: number;
}

export interface PathSegment {
    command: 'M' | 'L' | 'C' | 'Q' | 'A' | 'Z';
    points: Point[];
}

export interface PathShape extends BaseShape {
    type: ToolType.PATH;
    segments: PathSegment[];
    fillRule?: 'evenodd' | 'nonzero';
}


export type Shape = RectangleShape | EllipseShape | PolygonShape | PathShape;

export interface Layer {
    id: string;
    name: string;
    shapes: Shape[];
    isVisible: boolean;
}

export interface Artboard {
    width: number;
    height: number;
    aspectRatio: string;
}

export interface ViewBox {
    x: number;
    y: number;
    width: number;
    height: number;
}