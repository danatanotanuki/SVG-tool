import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Shape, Layer, Tool, Point, ShapeStyle, PolygonShape, EllipseShape } from '../types';
import { ToolType, RectangleShape } from '../types';
import ShapeComponent from './ShapeComponent';
import SelectionHandles, { getBoundingBox as getShapeBoundingBox, BBox, HandleType } from './SelectionHandles';

interface CanvasProps {
    layers: Layer[];
    activeLayerId: string | null;
    setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
    selectedShapeIds: string[];
    setSelectedShapeIds: React.Dispatch<React.SetStateAction<string[]>>;
    activeTool: Tool;
    defaultStyles: ShapeStyle;
    backgroundImage: { src: string; opacity: number } | null;
    updateShapes: (updates: { id: string, updates: Partial<Shape> }[]) => void;
    selectedCount: number;
    beginBatchUpdate: () => void;
    endBatchUpdate: () => void;
    isMultiSelectMode: boolean;
}

const Canvas: React.FC<CanvasProps> = ({
    layers, activeLayerId, setLayers, selectedShapeIds,
    setSelectedShapeIds, activeTool, defaultStyles, backgroundImage, updateShapes,
    selectedCount, beginBatchUpdate, endBatchUpdate, isMultiSelectMode
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [drawing, setDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
    const [currentPoint, setCurrentPoint] = useState<Point>({ x: 0, y: 0 });
    const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
    
    const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
    const initialDragState = useRef<{
        startPoint: Point;
        bbox: BBox;
        svg: SVGSVGElement;
        initialShapes: Shape[];
        initialGroupBbox: Shape;
    } | null>(null);

    const getMousePosition = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent): Point => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const CTM = svgRef.current.getScreenCTM();
        if (!CTM) return { x: 0, y: 0 };

        const evt = 'nativeEvent' in e ? e.nativeEvent : e;
        const point = 'touches' in evt && evt.touches.length > 0
            ? evt.touches[0]
            : 'changedTouches' in evt && evt.changedTouches.length > 0
                ? evt.changedTouches[0]
                : evt as MouseEvent;

        return {
            x: (point.clientX - CTM.e) / CTM.a,
            y: (point.clientY - CTM.f) / CTM.d,
        };
    }, []);


    const addShapeToLayer = useCallback((shape: Shape) => {
        if (!activeLayerId) return;
        setLayers(prevLayers =>
            prevLayers.map(layer =>
                layer.id === activeLayerId ? { ...layer, shapes: [...layer.shapes, shape] } : layer
            )
        );
    }, [activeLayerId, setLayers]);

    const handleDrawStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) e.preventDefault();
        
        const pos = getMousePosition(e);
        if (activeTool === ToolType.SELECT) {
            return;
        }

        if (activeTool === ToolType.POLYGON) return;
        
        setDrawing(true);
        setStartPoint(pos);
        setCurrentPoint(pos);
    }, [activeTool, getMousePosition]);
    
    const handleDrawMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!drawing) return;
        if ('touches' in e) e.preventDefault();
        setCurrentPoint(getMousePosition(e));
    }, [drawing, getMousePosition]);

    const handleDrawEnd = useCallback(() => {
        if (!drawing) return;
        setDrawing(false);

        const id = `shape-${Date.now()}`;
        let newShape: Shape | null = null;
        
        if (activeTool === ToolType.RECTANGLE) {
            const x = Math.min(startPoint.x, currentPoint.x);
            const y = Math.min(startPoint.y, currentPoint.y);
            const width = Math.abs(startPoint.x - currentPoint.x);
            const height = Math.abs(startPoint.y - currentPoint.y);
            if(width < 2 || height < 2) return;
            newShape = {
                id, type: ToolType.RECTANGLE, x, y, width, height, rotation: 0, ...defaultStyles
            };
        } else if (activeTool === ToolType.CIRCLE) {
            const radius = Math.sqrt(Math.pow(currentPoint.x - startPoint.x, 2) + Math.pow(currentPoint.y - startPoint.y, 2));
            if(radius < 2) return;
            newShape = {
                id, type: ToolType.CIRCLE, x: startPoint.x, y: startPoint.y, rx: radius, ry: radius, rotation: 0, ...defaultStyles
            };
        }
        
        if (newShape) {
            addShapeToLayer(newShape);
        }
    }, [drawing, activeTool, startPoint, currentPoint, defaultStyles, addShapeToLayer]);
    
    const handleCanvasClick = (e: React.MouseEvent) => {
        if (activeTool !== ToolType.POLYGON) return;
        const pos = getMousePosition(e);
        setPolygonPoints([...polygonPoints, pos]);
    };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (activeTool === ToolType.POLYGON) {
                if (e.key === 'Enter' && polygonPoints.length >= 3) {
                    const id = `shape-${Date.now()}`;
                    const newShape: PolygonShape = {
                        id, type: ToolType.POLYGON,
                        points: polygonPoints,
                        x: 0, y: 0,
                        rotation: 0,
                        ...defaultStyles
                    };
                    addShapeToLayer(newShape);
                    setPolygonPoints([]);
                } else if (e.key === 'Escape') {
                    setPolygonPoints([]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTool, polygonPoints, defaultStyles, addShapeToLayer]);


    const renderPreview = () => {
        if (!drawing) return null;

        if (activeTool === ToolType.RECTANGLE) {
            const x = Math.min(startPoint.x, currentPoint.x);
            const y = Math.min(startPoint.y, currentPoint.y);
            const width = Math.abs(startPoint.x - currentPoint.x);
            const height = Math.abs(startPoint.y - currentPoint.y);
            return <rect x={x} y={y} width={width} height={height} fill="none" stroke="rgba(0,0,255,0.5)" strokeDasharray="4" />;
        }
        
        if (activeTool === ToolType.CIRCLE) {
            const radius = Math.sqrt(Math.pow(currentPoint.x - startPoint.x, 2) + Math.pow(currentPoint.y - startPoint.y, 2));
            return <circle cx={startPoint.x} cy={startPoint.y} r={radius} fill="none" stroke="rgba(0,0,255,0.5)" strokeDasharray="4" />;
        }
        
        return null;
    };
    
    const renderPolygonPreview = () => {
        if (activeTool !== ToolType.POLYGON || polygonPoints.length === 0) return null;
        const pointsStr = polygonPoints.map(p => `${p.x},${p.y}`).join(' ');
        return <polyline points={pointsStr} fill="none" stroke="rgba(0,0,255,0.5)" strokeWidth="1" />;
    };

    const selectedShapes = layers
        .find(l => l.id === activeLayerId)?.shapes
        .filter(s => selectedShapeIds.includes(s.id)) || [];

    const getGroupBoundingBox = (): Shape | null => {
        if (selectedShapes.length === 0) return null;
        if (selectedShapes.length === 1) return selectedShapes[0];

        const bboxes = selectedShapes.map(s => getShapeBoundingBox(s));
        const minX = Math.min(...bboxes.map(b => b.x));
        const minY = Math.min(...bboxes.map(b => b.y));
        const maxX = Math.max(...bboxes.map(b => b.x + b.width));
        const maxY = Math.max(...bboxes.map(b => b.y + b.height));

        return {
            id: 'group-selection',
            type: ToolType.RECTANGLE,
            x: minX, y: minY,
            width: maxX - minX, height: maxY - minY,
            rotation: 0,
            fill: '', stroke: '', strokeWidth: 0,
        };
    };
    
    const selectionBoxShape = selectedShapes.length === 1 ? selectedShapes[0] : getGroupBoundingBox();

    const handleSelectionTransform = useCallback((updates: Partial<Shape>, initialShapes: Shape[], initialGroupBbox: Shape) => {
        const oldBbox = getShapeBoundingBox(initialGroupBbox);
        
        const updatesBBox = updates as Partial<BBox & {rotation: number}>;
        const newBbox: BBox = {
            ...oldBbox,
            x: updatesBBox.x ?? oldBbox.x,
            y: updatesBBox.y ?? oldBbox.y,
            width: updatesBBox.width ?? oldBbox.width,
            height: updatesBBox.height ?? oldBbox.height,
            rotation: updatesBBox.rotation ?? oldBbox.rotation,
        };
        newBbox.cx = newBbox.x + newBbox.width / 2;
        newBbox.cy = newBbox.y + newBbox.height / 2;
        
        const dx = newBbox.x - oldBbox.x;
        const dy = newBbox.y - oldBbox.y;
        const scaleX = oldBbox.width === 0 ? 1 : newBbox.width / oldBbox.width;
        const scaleY = oldBbox.height === 0 ? 1 : newBbox.height / oldBbox.height;
        const dRotation = (updates.rotation ?? oldBbox.rotation) - (oldBbox.rotation ?? 0);

        const transformPoint = (p: Point, origin: Point, matrix: DOMMatrix) => {
            const newP = new DOMPoint(p.x, p.y).matrixTransform(matrix);
            return { x: newP.x, y: newP.y };
        }

        const groupMatrix = new DOMMatrix()
            .translate(oldBbox.cx, oldBbox.cy)
            .rotate(dRotation)
            .scale(scaleX, scaleY)
            .translate(-oldBbox.cx, -oldBbox.cy)
            .translate(dx, dy);

        const shapeUpdates = initialShapes.map(initialShape => {
            const shapeUpdates: Partial<Shape> = {};
            let newPos: Point;
            if (initialShape.type === ToolType.POLYGON) {
                 const newPoints = initialShape.points.map(p => transformPoint(p, oldBbox, groupMatrix));
                 (shapeUpdates as Partial<PolygonShape>).points = newPoints;
            } else {
                 newPos = transformPoint({x: initialShape.x, y: initialShape.y}, oldBbox, groupMatrix);
                 shapeUpdates.x = newPos.x;
                 shapeUpdates.y = newPos.y;
                 shapeUpdates.rotation = initialShape.rotation + dRotation;
            }

            if (initialShape.type === ToolType.RECTANGLE) {
                (shapeUpdates as Partial<RectangleShape>).width = (initialShape as RectangleShape).width * scaleX;
                (shapeUpdates as Partial<RectangleShape>).height = (initialShape as RectangleShape).height * scaleY;
            } else if (initialShape.type === ToolType.CIRCLE) {
                const initialEllipse = initialShape as EllipseShape;
                (shapeUpdates as Partial<EllipseShape>).rx = initialEllipse.rx * scaleX;
                (shapeUpdates as Partial<EllipseShape>).ry = initialEllipse.ry * scaleY;
            }
            return { id: initialShape.id, updates: shapeUpdates };
        });

        updateShapes(shapeUpdates);
    }, [updateShapes]);

    const handleTransformMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!activeHandle || !initialDragState.current) return;

        const { startPoint, bbox: initialBBox, svg, initialShapes, initialGroupBbox } = initialDragState.current;
        const currentPoint = getMousePosition(e);
        const dx = currentPoint.x - startPoint.x;
        const dy = currentPoint.y - startPoint.y;

        if (activeHandle === 'move') {
            handleSelectionTransform({ x: initialBBox.x + dx, y: initialBBox.y + dy }, initialShapes, initialGroupBbox);
        } else if (activeHandle === 'rotate') {
            const angle = Math.atan2(
                currentPoint.y - initialBBox.cy,
                currentPoint.x - initialBBox.cx
            ) * 180 / Math.PI + 90; // +90 to align with top handle
            handleSelectionTransform({ rotation: angle }, initialShapes, initialGroupBbox);
        } else { // Resize
            const { x, y, width, height, rotation } = initialBBox;
            
            // Rotate mouse delta into shape's local coordinate system to handle rotated shapes
            const rad = rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const localDx = dx * cos + dy * sin;
            const localDy = -dx * sin + dy * cos;
            
            let newWidth = width;
            let newHeight = height;

            // Symmetrically adjust width/height based on handle and local delta
            if (activeHandle.includes('e')) { newWidth += localDx; }
            if (activeHandle.includes('w')) { newWidth -= localDx; }
            if (activeHandle.includes('s')) { newHeight += localDy; }
            if (activeHandle.includes('n')) { newHeight -= localDy; }
            
            if (newWidth > 5 && newHeight > 5) {
                // By passing the original x/y, the translation part of handleSelectionTransform is zero.
                // The transformation will be a pure scale around the shape's center.
                handleSelectionTransform({ x, y, width: newWidth, height: newHeight }, initialShapes, initialGroupBbox);
            }
        }
    }, [activeHandle, handleSelectionTransform, getMousePosition]);
    
    const handleTransformEnd = useCallback((e: MouseEvent | TouchEvent) => {
        if (!activeHandle) return;
        e.stopPropagation();
        endBatchUpdate();
        setActiveHandle(null);
        initialDragState.current = null;
    }, [activeHandle, endBatchUpdate]);

    useEffect(() => {
        if (activeHandle) {
            const moveHandler = (e: MouseEvent | TouchEvent) => {
                if ('touches' in e) e.preventDefault();
                handleTransformMove(e);
            }
            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('touchmove', moveHandler, { passive: false });
            window.addEventListener('mouseup', handleTransformEnd);
            window.addEventListener('touchend', handleTransformEnd);
            return () => {
                window.removeEventListener('mousemove', moveHandler);
                window.removeEventListener('touchmove', moveHandler);
                window.removeEventListener('mouseup', handleTransformEnd);
                window.removeEventListener('touchend', handleTransformEnd);
            };
        }
    }, [activeHandle, handleTransformMove, handleTransformEnd]);

    const handleTransformStart = (e: React.MouseEvent | React.TouchEvent, handle: HandleType, boxShape: Shape, shapesToTransform: Shape[]) => {
        e.stopPropagation();
        if ('touches' in e) e.preventDefault();
        if (!svgRef.current) return;
        
        beginBatchUpdate();
    
        setActiveHandle(handle);
        initialDragState.current = {
            startPoint: getMousePosition(e),
            bbox: getShapeBoundingBox(boxShape),
            svg: svgRef.current,
            initialShapes: JSON.parse(JSON.stringify(shapesToTransform)),
            initialGroupBbox: JSON.parse(JSON.stringify(boxShape)),
        };
    };
    
    const handleShapePointerDown = (e: React.MouseEvent | React.TouchEvent, shape: Shape) => {
        if (activeTool !== ToolType.SELECT) return;
        e.stopPropagation();
    
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer) return;
    
        const targetShapeIds = shape.groupId
            ? activeLayer.shapes.filter(s => s.groupId === shape.groupId).map(s => s.id)
            : [shape.id];
        
        const isTargetFullySelected = targetShapeIds.every(id => selectedShapeIds.includes(id));
    
        if (isMultiSelectMode) {
            if (isTargetFullySelected) {
                setSelectedShapeIds(prev => prev.filter(id => !targetShapeIds.includes(id)));
            } else {
                setSelectedShapeIds(prev => [...new Set([...prev, ...targetShapeIds])]);
            }
        } else {
            const isAdditive = e.ctrlKey || e.metaKey;
            if (isAdditive) {
                if (isTargetFullySelected) {
                    setSelectedShapeIds(prev => prev.filter(id => !targetShapeIds.includes(id)));
                } else {
                    setSelectedShapeIds(prev => [...new Set([...prev, ...targetShapeIds])]);
                }
            } else {
                if (!isTargetFullySelected) {
                    setSelectedShapeIds(targetShapeIds);
                } else {
                    if (selectionBoxShape) {
                        handleTransformStart(e, 'move', selectionBoxShape, selectedShapes);
                    }
                }
            }
        }
    };

    return (
        <svg
            ref={svgRef}
            className="w-full h-full cursor-crosshair bg-white"
            onMouseDown={handleDrawStart}
            onMouseMove={handleDrawMove}
            onMouseUp={handleDrawEnd}
            onMouseLeave={handleDrawEnd}
            onTouchStart={handleDrawStart}
            onTouchMove={handleDrawMove}
            onTouchEnd={handleDrawEnd}
            onClick={handleCanvasClick}
        >
            {backgroundImage && (
                <image
                    href={backgroundImage.src}
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    opacity={backgroundImage.opacity}
                    preserveAspectRatio="xMidYMid slice"
                />
            )}
            
            {layers.slice().reverse().map(layer => (
                <g key={layer.id} visibility={layer.isVisible ? 'visible' : 'hidden'}>
                    {layer.shapes.map(shape => (
                        <ShapeComponent
                            key={shape.id}
                            shape={shape}
                            isSelected={selectedShapeIds.includes(shape.id) && layer.id === activeLayerId}
                            activeTool={activeTool}
                            onPointerDown={(e) => handleShapePointerDown(e, shape)}
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                            }}
                        />
                    ))}
                </g>
            ))}
            
            {renderPreview()}
            {renderPolygonPreview()}

            {isMultiSelectMode && selectedShapes.map(shape => {
                const bbox = getShapeBoundingBox(shape);
                return <rect
                    key={`selection-${shape.id}`}
                    x={bbox.x}
                    y={bbox.y}
                    width={bbox.width}
                    height={bbox.height}
                    transform={`rotate(${bbox.rotation}, ${bbox.cx}, ${bbox.cy})`}
                    fill="none"
                    stroke="rgba(59, 130, 246, 0.8)"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    style={{ pointerEvents: 'none' }}
                />
            })}

            {!isMultiSelectMode && selectionBoxShape && activeLayerId && layers.find(l => l.id === activeLayerId)?.isVisible && (
                <SelectionHandles 
                    shape={selectionBoxShape} 
                    selectedCount={selectedCount}
                    onPointerDown={(e, handle) => handleTransformStart(e, handle, selectionBoxShape, selectedShapes)}
                    onMovePointerDown={(e) => handleTransformStart(e, 'move', selectionBoxShape, selectedShapes)}
                />
            )}
        </svg>
    );
};

export default Canvas;