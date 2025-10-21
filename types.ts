export interface Point {
    x: number;
    y: number;
}

export enum ToolType {
    SELECT = 'select',
    RECTANGLE = 'rectangle',
    CIRCLE = 'circle',
    POLYGON = 'polygon',
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

export type Shape = RectangleShape | EllipseShape | PolygonShape;

export interface Layer {
    id: string;
    name: string;
    shapes: Shape[];
    isVisible: boolean;
}