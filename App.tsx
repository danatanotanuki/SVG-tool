
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Shape, Layer, Tool, Point, ShapeStyle, RectangleShape, EllipseShape, PolygonShape, Artboard, ViewBox, PathShape } from './types';
import { ToolType } from './types';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import LayerPanel from './components/LayerPanel';
import Canvas from './components/Canvas';
import BackgroundPanel from './components/BackgroundPanel';
import ArtboardPanel from './components/ArtboardPanel';
import SvgImportPanel from './components/SvgImportPanel';
import HelpModal from './components/HelpModal';
import SaveSvgModal from './components/SaveSvgModal';
import ActionPanel from './components/ActionPanel';
import { exportToSVG } from './utils/svgExport';
import { parseSVG } from './utils/svgImport';
import { useHistory } from './hooks/useHistory';
import { UndoIcon, RedoIcon, ChevronLeftIcon, ChevronRightIcon, DuplicateIcon, PropertiesIcon, LayersIcon, BackgroundIcon, MenuIcon, ZoomInIcon, ZoomOutIcon, ZoomResetIcon, ArtboardIcon, SvgImportIcon } from './components/icons/Icons';
import { getVertices } from './utils/geometry';


type BottomBarTab = 'actions' | 'properties' | 'layers' | 'background' | 'artboard' | 'svgImport';
type ActiveSlider = 'rotate' | 'scale' | 'cornerRadius' | null;
type AlignType = 'left' | 'h-center' | 'right' | 'top' | 'v-center' | 'bottom';


const TabButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ label, isActive, onClick, children }) => (
    <button
        title={label}
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-full p-1 rounded-lg text-xs transition-colors duration-200 ${
            isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
        }`}
    >
        {children}
        <span className="mt-1">{label}</span>
    </button>
);


const App: React.FC = () => {
    const { 
        state: layers, 
        setState: setLayers, 
        undo, 
        redo, 
        canUndo, 
        canRedo,
        beginBatchUpdate,
        endBatchUpdate
    } = useHistory<Layer[]>([
        { id: `layer-${Date.now()}`, name: 'Layer 1', shapes: [], isVisible: true },
    ]);
    
    const [activeLayerId, setActiveLayerId] = useState<string>(layers[0].id);
    const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
    const [activeTool, setActiveTool] = useState<Tool>(ToolType.SELECT);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    
    const [defaultStyles, setDefaultStyles] = useState<ShapeStyle>({
        fill: '#cccccc',
        stroke: '#333333',
        strokeWidth: 2,
    });
    
    const [backgroundImage, setBackgroundImage] = useState<{ src: string; opacity: number } | null>(null);
    const [artboard, setArtboard] = useState<Artboard | null>(null);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isToolbarOpen, setIsToolbarOpen] = useState(!isMobile);
    const [isTopPanelOpen, setIsTopPanelOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<BottomBarTab>('properties');

    const [activeSlider, setActiveSlider] = useState<ActiveSlider>(null);
    const initialSliderState = useRef<{ shapes: Shape[] } | null>(null);
    
    const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, width: 1000, height: 800 });
    const [zoom, setZoom] = useState(1);
    const svgSizeRef = useRef({width: 1000, height: 800});

    const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
    const [selectedVertex, setSelectedVertex] = useState<{ shapeId: string; vertexIndex: number } | null>(null);

    useEffect(() => {
        const checkMobile = () => {
            const isMobileView = window.innerWidth < 768;
            if (isMobileView !== isMobile) {
                setIsMobile(isMobileView);
                setIsToolbarOpen(!isMobileView);
                setIsTopPanelOpen(false);
            }
        };
        window.addEventListener('resize', checkMobile);
        checkMobile();
        return () => window.removeEventListener('resize', checkMobile);
    }, [isMobile]);

    // Exit vertex edit mode if selection changes
    useEffect(() => {
        if (selectedShapeIds.length !== 1) {
            setEditingShapeId(null);
        } else if (editingShapeId && !selectedShapeIds.includes(editingShapeId)) {
            setEditingShapeId(null);
        }
        
        if (!editingShapeId) {
            setSelectedVertex(null);
        }
    }, [selectedShapeIds, editingShapeId]);

    // Adjust view when artboard changes
    useEffect(() => {
        if (artboard) {
            const padding = 100; // A bit of space around the artboard
            const newViewBoxWidth = artboard.width + padding * 2;
            const newViewBoxHeight = artboard.height + padding * 2;
            
            setViewBox({
                x: -newViewBoxWidth / 2,
                y: -newViewBoxHeight / 2,
                width: newViewBoxWidth,
                height: newViewBoxHeight,
            });
    
            const { width: svgWidth, height: svgHeight } = svgSizeRef.current;
            const zoomX = svgWidth / newViewBoxWidth;
            const zoomY = svgHeight / newViewBoxHeight;
            setZoom(Math.min(zoomX, zoomY));
        }
    }, [artboard]);

    const handleToolSelect = (tool: Tool) => {
        setActiveTool(tool);
        setEditingShapeId(null);
        if (tool !== ToolType.SELECT) {
            setIsMultiSelectMode(false);
        }
    };
    
    const handleToggleMultiSelectMode = useCallback(() => {
        setIsMultiSelectMode(prev => {
            // If we are exiting multi-select mode, clear the current selection.
            if (prev) {
                setSelectedShapeIds([]);
            }
            return !prev;
        });
    }, [setSelectedShapeIds]);

    const getActiveLayer = useCallback(() => {
        return layers.find(l => l.id === activeLayerId);
    }, [layers, activeLayerId]);

    const getSelectedShapes = useCallback(() => {
        const layer = getActiveLayer();
        if (!layer) return [];
        return layer.shapes.filter(s => selectedShapeIds.includes(s.id));
    }, [getActiveLayer, selectedShapeIds]);
    
    const updateShapes = useCallback((updates: { id: string, updates: Partial<Shape> }[]) => {
        const updatesMap = new Map(updates.map(u => [u.id, u.updates]));
        setLayers(prevLayers => prevLayers.map(layer => {
            if (layer.id === activeLayerId) {
                return {
                    ...layer,
                    shapes: layer.shapes.map(shape => {
                        if (updatesMap.has(shape.id)) {
                            return { ...shape, ...updatesMap.get(shape.id) } as Shape;
                        }
                        return shape;
                    }),
                };
            }
            return layer;
        }));
    }, [activeLayerId, setLayers]);

    const handleStyleChange = (style: Partial<ShapeStyle>) => {
        if (selectedShapeIds.length > 0) {
            const updates = selectedShapeIds.map(id => ({ id, updates: style }));
            updateShapes(updates);
        } else {
            setDefaultStyles(prev => ({ ...prev, ...style }));
        }
    };

    const handleSaveSVG = () => {
        setIsSaveModalOpen(true);
    };

    const handleConfirmSave = (title: string) => {
        exportToSVG(layers, title, artboard);
        setIsSaveModalOpen(false);
    };

    const handleImportSVG = (svgString: string) => {
        try {
            const parsedShapes = parseSVG(svgString, defaultStyles);
            if (parsedShapes.length === 0) {
                alert('No valid shapes found in the SVG.');
                return;
            }

            beginBatchUpdate();

            const allPoints = parsedShapes.flatMap(getVertices);
            let shapesToImport: Shape[] = parsedShapes;

            if (allPoints.length > 0) {
                const xs = allPoints.map(p => p.x);
                const ys = allPoints.map(p => p.y);
                const minX = Math.min(...xs);
                const minY = Math.min(...ys);
                const maxX = Math.max(...xs);
                const maxY = Math.max(...ys);
                const importWidth = maxX - minX;
                const importHeight = maxY - minY;

                const TARGET_SIZE_RATIO = 0.8;
                const targetWidth = viewBox.width * TARGET_SIZE_RATIO;
                const targetHeight = viewBox.height * TARGET_SIZE_RATIO;
                const targetCenterX = viewBox.x + viewBox.width / 2;
                const targetCenterY = viewBox.y + viewBox.height / 2;

                let scaleFactor = 1;
                const epsilon = 1e-6;
                if (importWidth > epsilon && importHeight > epsilon) {
                    scaleFactor = Math.min(targetWidth / importWidth, targetHeight / importHeight);
                } else if (importWidth > epsilon) {
                    scaleFactor = targetWidth / importWidth;
                } else if (importHeight > epsilon) {
                    scaleFactor = targetHeight / importHeight;
                }

                const originalCenterX = minX + importWidth / 2;
                const originalCenterY = minY + importHeight / 2;

                const transformPoint = (p: Point): Point => ({
                    x: targetCenterX + (p.x - originalCenterX) * scaleFactor,
                    y: targetCenterY + (p.y - originalCenterY) * scaleFactor,
                });

                shapesToImport = parsedShapes.map(shape => {
                    // Since the import process standardizes shapes into paths, we only need to handle PathShape
                    const pathShape = shape as PathShape;
                    return {
                        ...pathShape,
                        segments: pathShape.segments.map(seg => ({
                            ...seg,
                            points: seg.points.map(transformPoint),
                        })),
                    };
                });
            }

            const newLayer: Layer = {
                id: `layer-${Date.now()}`,
                name: `Imported ${layers.length}`,
                shapes: shapesToImport,
                isVisible: true,
            };

            setLayers(prev => [...prev, newLayer]);
            setActiveLayerId(newLayer.id);
            setSelectedShapeIds(shapesToImport.map(s => s.id));

        } catch (error) {
            console.error('Failed to import SVG:', error);
            alert(`Failed to import SVG. Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            endBatchUpdate();
        }
    };

    const handleDeleteShapes = useCallback(() => {
        if (selectedShapeIds.length === 0 || !activeLayerId) return;
        setLayers(prevLayers => prevLayers.map(layer => {
            if (layer.id === activeLayerId) {
                return {
                    ...layer,
                    shapes: layer.shapes.filter(s => !selectedShapeIds.includes(s.id)),
                };
            }
            return layer;
        }));
        setSelectedShapeIds([]);
        setEditingShapeId(null);
    }, [selectedShapeIds, activeLayerId, setLayers]);

    const handleDuplicateShapes = useCallback(() => {
        if (selectedShapeIds.length === 0 || !activeLayerId) return;
        const activeLayer = getActiveLayer();
        if (!activeLayer) return;

        setEditingShapeId(null);
        const shapesToDuplicate = activeLayer.shapes.filter(s => selectedShapeIds.includes(s.id));
        const newShapes: Shape[] = [];
        const newShapeIds: string[] = [];
        
        shapesToDuplicate.forEach(shape => {
            const newId = `shape-${Date.now()}-${Math.random()}`;
            const offset = 10;
            let newShape: Shape;

            if (shape.type === ToolType.POLYGON) {
                newShape = {
                    ...shape,
                    id: newId,
                    points: shape.points.map(p => ({ x: p.x + offset, y: p.y + offset })),
                };
            } else if (shape.type === ToolType.PATH) {
                 newShape = {
                    ...shape,
                    id: newId,
                    segments: shape.segments.map(seg => ({...seg, points: seg.points.map(p => ({x: p.x + offset, y: p.y + offset}))}))
                 }
            }
            else {
                 newShape = {
                    ...shape,
                    id: newId,
                    x: shape.x + offset,
                    y: shape.y + offset,
                };
            }
            newShapes.push(newShape);
            newShapeIds.push(newId);
        });

        setLayers(prev => prev.map(layer => {
            if (layer.id === activeLayerId) {
                return { ...layer, shapes: [...layer.shapes, ...newShapes] };
            }
            return layer;
        }));
        setSelectedShapeIds(newShapeIds);

    }, [selectedShapeIds, activeLayerId, getActiveLayer, setLayers]);

    const handleDeselectAll = () => {
        setSelectedShapeIds([]);
        setActiveSlider(null);
        setEditingShapeId(null);
        setSelectedVertex(null);
    };
    
    const handleGroupShapes = useCallback(() => {
        const selectedShapes = getSelectedShapes();
        if (selectedShapes.length <= 1) return;

        const activeLayer = getActiveLayer();
        if (!activeLayer) return;
        
        setEditingShapeId(null);

        const allShapeIdsToGroup = new Set<string>();
        const existingGroupIds = new Set<string>();

        selectedShapes.forEach(shape => {
            if (shape.groupId) {
                existingGroupIds.add(shape.groupId);
            } else {
                allShapeIdsToGroup.add(shape.id);
            }
        });

        if (existingGroupIds.size > 0) {
            activeLayer.shapes.forEach(shape => {
                if (shape.groupId && existingGroupIds.has(shape.groupId)) {
                    allShapeIdsToGroup.add(shape.id);
                }
            });
        }
        
        const newGroupId = `group-${Date.now()}`;
        const shapeIdsArray = Array.from(allShapeIdsToGroup);

        setLayers(prev => prev.map(layer => {
            if (layer.id === activeLayerId) {
                return {
                    ...layer,
                    shapes: layer.shapes.map(s => {
                        if (shapeIdsArray.includes(s.id)) {
                            return { ...s, groupId: newGroupId };
                        }
                        return s;
                    })
                };
            }
            return layer;
        }));
        setSelectedShapeIds(shapeIdsArray);
        setIsMultiSelectMode(false);
    }, [getSelectedShapes, getActiveLayer, activeLayerId, setLayers]);
    
    const handleUngroupShapes = useCallback(() => {
        const selectedShapes = getSelectedShapes();
        if (selectedShapes.length === 0) return;
        
        setEditingShapeId(null);
        const groupIdsToUngroup = new Set<string>();
        selectedShapes.forEach(shape => {
            if (shape.groupId) {
                groupIdsToUngroup.add(shape.groupId);
            }
        });

        if (groupIdsToUngroup.size === 0) return;

        const shapeIdsThatWereUngrouped: string[] = [];

        setLayers(prev => prev.map(layer => {
            if (layer.id === activeLayerId) {
                return {
                    ...layer,
                    shapes: layer.shapes.map(s => {
                        if (s.groupId && groupIdsToUngroup.has(s.groupId)) {
                            shapeIdsThatWereUngrouped.push(s.id);
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const { groupId, ...rest } = s;
                            return rest as Shape;
                        }
                        return s;
                    })
                };
            }
            return layer;
        }));
        setSelectedShapeIds(shapeIdsThatWereUngrouped);
        setIsMultiSelectMode(true);
    }, [getSelectedShapes, activeLayerId, setLayers]);

    const handleUndo = useCallback(() => {
        if (canUndo) {
            undo();
            setIsMultiSelectMode(false);
        }
    }, [undo, canUndo]);

    // --- Transform Logic ---

    const getSimpleBoundingBox = (shape: Shape): { x: number; y: number; width: number; height: number } => {
        if (shape.type === ToolType.RECTANGLE) {
            return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
        }
        if (shape.type === ToolType.CIRCLE) {
            return { x: shape.x - shape.rx, y: shape.y - shape.ry, width: shape.rx * 2, height: shape.ry * 2 };
        }
        const vertices = getVertices(shape);
        if (vertices.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
        
        const xs = vertices.map(p => p.x);
        const ys = vertices.map(p => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const width = Math.max(...xs) - minX;
        const height = Math.max(...ys) - minY;
        return { x: minX, y: minY, width, height };
    };
    
    const handleAlignShapes = useCallback((alignType: AlignType) => {
        const selected = getSelectedShapes();
        if (selected.length < 2) return;
        setEditingShapeId(null);

        const bboxes = selected.map(s => getSimpleBoundingBox(s));

        const minX = Math.min(...bboxes.map(b => b.x));
        const minY = Math.min(...bboxes.map(b => b.y));
        const maxX = Math.max(...bboxes.map(b => b.x + b.width));
        const maxY = Math.max(...bboxes.map(b => b.y + b.height));
        const hCenter = (minX + maxX) / 2;
        const vCenter = (minY + maxY) / 2;

        const shapeUpdates: { id: string, updates: Partial<Shape> }[] = [];

        selected.forEach((shape, index) => {
            const bbox = bboxes[index];
            const updates: Partial<Shape> = {};
            let dx = 0;
            let dy = 0;

            switch(alignType) {
                case 'left': dx = minX - bbox.x; break;
                case 'h-center': dx = hCenter - (bbox.x + bbox.width / 2); break;
                case 'right': dx = maxX - (bbox.x + bbox.width); break;
                case 'top': dy = minY - bbox.y; break;
                case 'v-center': dy = vCenter - (bbox.y + bbox.height / 2); break;
                case 'bottom': dy = maxY - (bbox.y + bbox.height); break;
            }

            if(dx !== 0 || dy !== 0) {
                 if (shape.type === ToolType.POLYGON) {
                    (updates as Partial<PolygonShape>).points = shape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
                } else if (shape.type === ToolType.PATH) {
                    (updates as Partial<PathShape>).segments = shape.segments.map(seg => ({...seg, points: seg.points.map(p => ({x: p.x+dx, y: p.y+dy}))}));
                }
                else {
                    updates.x = shape.x + dx;
                    updates.y = shape.y + dy;
                }
                shapeUpdates.push({ id: shape.id, updates });
            }
        });

        if(shapeUpdates.length > 0) {
            updateShapes(shapeUpdates);
        }
    }, [getSelectedShapes, updateShapes]);

    const handleToggleSlider = useCallback((slider: 'rotate' | 'scale' | 'cornerRadius') => {
        setEditingShapeId(null);
        setActiveSlider(current => {
            const nextSlider = current === slider ? null : slider;
            if (nextSlider) {
                initialSliderState.current = { shapes: JSON.parse(JSON.stringify(getSelectedShapes())) };
            } else {
                initialSliderState.current = null;
            }
            return nextSlider;
        });
    }, [getSelectedShapes]);

    const handleSliderInteractionStart = useCallback(() => {
        beginBatchUpdate();
    }, [beginBatchUpdate]);

    const handleSliderInteractionEnd = useCallback(() => {
        endBatchUpdate();
    }, [endBatchUpdate]);

    const handleRotateShapes = useCallback((angle: number) => {
        if (!initialSliderState.current) return;
        const { shapes: initialShapes } = initialSliderState.current;
        if (initialShapes.length === 0) return;

        let transformOrigin: Point;

        if (initialShapes.length === 1) {
            const shape = initialShapes[0];
            const bbox = getSimpleBoundingBox(shape);
            transformOrigin = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
        } else {
            const bboxes = initialShapes.map(s => getSimpleBoundingBox(s));
            const minX = Math.min(...bboxes.map(b => b.x));
            const minY = Math.min(...bboxes.map(b => b.y));
            const maxX = Math.max(...bboxes.map(b => b.x + b.width));
            const maxY = Math.max(...bboxes.map(b => b.y + b.height));
            transformOrigin = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        }
        
        const dRotation = angle;

        const matrix = new DOMMatrix()
            .translate(transformOrigin.x, transformOrigin.y)
            .rotate(dRotation)
            .translate(-transformOrigin.x, -transformOrigin.y);

        const transformPoint = (p: Point): Point => {
            const domPoint = new DOMPoint(p.x, p.y);
            const newPoint = domPoint.matrixTransform(matrix);
            return { x: newPoint.x, y: newPoint.y };
        };

        const shapeUpdates = initialShapes.map(initialShape => {
            const updates: Partial<Shape> = {
                rotation: (initialShape.rotation || 0) + dRotation,
            };

            if (initialShape.type === ToolType.POLYGON) {
                (updates as Partial<PolygonShape>).points = initialShape.points.map(transformPoint);
                delete updates.rotation;
            } else if (initialShape.type === ToolType.PATH) {
                (updates as Partial<PathShape>).segments = initialShape.segments.map(seg => ({ ...seg, points: seg.points.map(transformPoint) }));
                delete updates.rotation;
            } else if (initialShape.type === ToolType.CIRCLE) {
                const newCenter = transformPoint({ x: initialShape.x, y: initialShape.y });
                updates.x = newCenter.x;
                updates.y = newCenter.y;
            } else if (initialShape.type === ToolType.RECTANGLE) {
                const initialCenter = { x: initialShape.x + initialShape.width / 2, y: initialShape.y + initialShape.height / 2 };
                const newCenter = transformPoint(initialCenter);
                updates.x = newCenter.x - initialShape.width / 2;
                updates.y = newCenter.y - initialShape.height / 2;
            }
            
            return { id: initialShape.id, updates };
        });

        updateShapes(shapeUpdates);
    }, [updateShapes]);

    const scalePoint = (point: Point, center: Point, factor: number): Point => {
        return {
            x: center.x + (point.x - center.x) * factor,
            y: center.y + (point.y - center.y) * factor,
        };
    };

    const handleScaleShapes = useCallback((factor: number) => {
        if (!initialSliderState.current) return;
        const { shapes: initialShapes } = initialSliderState.current;
        if (initialShapes.length === 0) return;

        let transformOrigin: Point;
        if (initialShapes.length === 1) {
            const shape = initialShapes[0];
            const bbox = getSimpleBoundingBox(shape);
            transformOrigin = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
        } else {
            const bboxes = initialShapes.map(s => getSimpleBoundingBox(s));
            const minX = Math.min(...bboxes.map(b => b.x));
            const minY = Math.min(...bboxes.map(b => b.y));
            const maxX = Math.max(...bboxes.map(b => b.x + b.width));
            const maxY = Math.max(...bboxes.map(b => b.y + b.height));
            transformOrigin = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        }
        
        const shapeUpdates: { id: string; updates: Partial<Shape> }[] = [];

        for (const initialShape of initialShapes) {
            if (initialShape.type === ToolType.RECTANGLE) {
                const rect = initialShape;
                const newWidth = rect.width * factor;
                const newHeight = rect.height * factor;
                const initialCenter = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
                const newCenter = scalePoint(initialCenter, transformOrigin, factor);
                const updates: Partial<RectangleShape> = {
                    width: newWidth,
                    height: newHeight,
                    x: newCenter.x - newWidth / 2,
                    y: newCenter.y - newHeight / 2,
                };
                shapeUpdates.push({ id: initialShape.id, updates });
            } else if (initialShape.type === ToolType.CIRCLE) {
                const ellipse = initialShape;
                const newCenter = scalePoint({ x: ellipse.x, y: ellipse.y }, transformOrigin, factor);
                const updates: Partial<EllipseShape> = {
                    rx: ellipse.rx * factor,
                    ry: ellipse.ry * factor,
                    x: newCenter.x,
                    y: newCenter.y,
                };
                shapeUpdates.push({ id: initialShape.id, updates });
            } else if (initialShape.type === ToolType.POLYGON) {
                const polygon = initialShape;
                const updates: Partial<PolygonShape> = {
                    points: polygon.points.map(p => scalePoint(p, transformOrigin, factor)),
                };
                shapeUpdates.push({ id: initialShape.id, updates });
            } else if (initialShape.type === ToolType.PATH) {
                const path = initialShape;
                const updates: Partial<PathShape> = {
                    segments: path.segments.map(seg => ({...seg, points: seg.points.map(p => scalePoint(p, transformOrigin, factor))})),
                };
                shapeUpdates.push({ id: initialShape.id, updates });
            }
        }
        updateShapes(shapeUpdates);
    }, [updateShapes]);
    
    const handleCornerRadiusChange = useCallback((radius: number) => {
        if (selectedShapeIds.length === 0) return;

        const shapeUpdates = selectedShapeIds.map(id => {
            return { id, updates: { cornerRadius: radius } };
        });

        updateShapes(shapeUpdates);
    }, [selectedShapeIds, updateShapes]);
    
    const handleZoom = (direction: 'in' | 'out' | 'reset') => {
        const { width: svgWidth, height: svgHeight } = svgSizeRef.current;
        const zoomFactor = 1.25;
        
        let newWidth, newHeight, newZoom;

        if (direction === 'reset') {
            if (artboard) {
                // If there's an artboard, reset zoom to fit the artboard
                const padding = 100;
                newWidth = artboard.width + padding * 2;
                newHeight = artboard.height + padding * 2;
                const newX = -newWidth / 2;
                const newY = -newHeight / 2;
                
                setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
                
                const zoomX = svgWidth / newWidth;
                const zoomY = svgHeight / newHeight;
                setZoom(Math.min(zoomX, zoomY));
            } else {
                // No artboard, fit to screen
                newWidth = svgWidth;
                newHeight = svgHeight;
                newZoom = 1;
                setViewBox({ x: 0, y: 0, width: newWidth, height: newHeight });
                setZoom(newZoom);
            }
        } else {
            const center = { x: viewBox.x + viewBox.width / 2, y: viewBox.y + viewBox.height / 2 };
            const factor = direction === 'in' ? 1 / zoomFactor : zoomFactor;
            newWidth = viewBox.width * factor;
            newHeight = viewBox.height * factor;
            newZoom = zoom / factor;
            const newX = center.x - newWidth / 2;
            const newY = center.y - newHeight / 2;
            setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
            setZoom(newZoom);
        }
    };

    const handleToggleVertexEditMode = useCallback(() => {
        setEditingShapeId(prev => {
            if (prev) {
                return null;
            }
            if (selectedShapeIds.length === 1) {
                return selectedShapeIds[0];
            }
            return null;
        });
    }, [selectedShapeIds]);

    const handleVertexSnap = useCallback((snapType: 'horizontal' | 'vertical') => {
        if (!selectedVertex) return;
    
        const activeLayer = getActiveLayer();
        if (!activeLayer) return;
    
        const shapeToUpdate = activeLayer.shapes.find(s => s.id === selectedVertex.shapeId);
    
        if (!shapeToUpdate || (shapeToUpdate.type !== ToolType.POLYGON && shapeToUpdate.type !== ToolType.RECTANGLE && shapeToUpdate.type !== ToolType.PATH)) {
            return;
        }
        
        const allVertices = getVertices(shapeToUpdate);
        const selectedPoint = allVertices[selectedVertex.vertexIndex];
    
        let closestVertex: Point | null = null;
        let minDistance = Infinity;
    
        for (let i = 0; i < allVertices.length; i++) {
            if (i === selectedVertex.vertexIndex) continue;
    
            const currentVertex = allVertices[i];
            const distance = snapType === 'horizontal'
                ? Math.abs(currentVertex.y - selectedPoint.y)
                : Math.abs(currentVertex.x - selectedPoint.x);
    
            if (distance < minDistance) {
                minDistance = distance;
                closestVertex = currentVertex;
            }
        }
    
        if (closestVertex) {
            if (shapeToUpdate.type === ToolType.POLYGON) {
                const newPoints = [...shapeToUpdate.points];
                const newPoint = { ...newPoints[selectedVertex.vertexIndex] };
                if (snapType === 'horizontal') {
                    newPoint.y = closestVertex.y;
                } else { // vertical
                    newPoint.x = closestVertex.x;
                }
                newPoints[selectedVertex.vertexIndex] = newPoint;

                updateShapes([{ id: shapeToUpdate.id, updates: { points: newPoints } }]);
                setSelectedVertex(null); // Deselect vertex after snap
            }
            // Note: Rectangle and Path snapping is not implemented as it's more complex.
        }
    }, [selectedVertex, getActiveLayer, updateShapes, setSelectedVertex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleDeselectAll();
                setIsMultiSelectMode(false);
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                handleDeleteShapes();
            }
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                handleGroupShapes();
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                handleUngroupShapes();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                handleDuplicateShapes();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                handleUndo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
            }
            if (e.key.toLowerCase() === 'v') setActiveTool(ToolType.SELECT);
            if (e.key.toLowerCase() === 'r') setActiveTool(ToolType.RECTANGLE);
            if (e.key.toLowerCase() === 'c') setActiveTool(ToolType.CIRCLE);
            if (e.key.toLowerCase() === 'p' && activeTool !== ToolType.PATH) { // prevent conflict with path tool
                setActiveTool(ToolType.POLYGON);
            } else if (e.key.toLowerCase() === 'p' && activeTool === ToolType.POLYGON) {
                setActiveTool(ToolType.PATH);
            } else if (e.key.toLowerCase() === 'p' && activeTool === ToolType.PATH) {
                setActiveTool(ToolType.POLYGON);
            }


        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleDeleteShapes, handleDuplicateShapes, handleGroupShapes, handleUngroupShapes, handleUndo, redo, activeTool]);

    const selectedShapes = getSelectedShapes();
    const canApplyCornerRadius = selectedShapes.some(s => s.type === ToolType.RECTANGLE || s.type === ToolType.POLYGON);
    const canEnterVertexEditMode = selectedShapes.length === 1 && (selectedShapes[0].type === ToolType.RECTANGLE || selectedShapes[0].type === ToolType.POLYGON || selectedShapes[0].type === ToolType.PATH);


    const getMaxCornerRadiusForSlider = useCallback((): number => {
        if (selectedShapes.length === 0) return 100;

        let minMaxRadius = Infinity;

        for (const shape of selectedShapes) {
            if (shape.type === ToolType.RECTANGLE) {
                const maxRadius = Math.min(shape.width, shape.height) / 2;
                if (maxRadius < minMaxRadius) {
                    minMaxRadius = maxRadius;
                }
            } else if (shape.type === ToolType.POLYGON) {
                if (shape.points.length >= 3) {
                    for (let i = 0; i < shape.points.length; i++) {
                        const p1 = shape.points[i];
                        const p2 = shape.points[(i + 1) % shape.points.length];
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const edgeLength = Math.sqrt(dx * dx + dy * dy);
                        const maxRadius = edgeLength / 2;
                         if (maxRadius < minMaxRadius) {
                            minMaxRadius = maxRadius;
                        }
                    }
                }
            }
        }
        return minMaxRadius === Infinity ? 100 : Math.max(0, minMaxRadius);
    }, [selectedShapes]);

    const getConsolidatedStyle = (): ShapeStyle | null => {
        if (selectedShapes.length === 0) return defaultStyles;
        if (selectedShapes.length === 1) return selectedShapes[0];

        const firstStyle = selectedShapes[0];
        const isMixed = selectedShapes.slice(1).some(s => 
            s.fill !== firstStyle.fill ||
            s.stroke !== firstStyle.stroke ||
            s.strokeWidth !== firstStyle.strokeWidth
        );
        return isMixed ? null : firstStyle;
    };


    return (
        <div className="flex flex-col h-screen font-sans text-gray-800 bg-gray-100 overflow-hidden">
            <header className="bg-white shadow-md z-40 p-2 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-700">SVG Draw</h1>
                <div className="flex items-center space-x-2 md:space-x-4">
                     <button
                        onClick={handleUndo}
                        disabled={!canUndo}
                        title="Undo (Ctrl+Z)"
                        className="p-2 rounded-md transition-colors duration-200 text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                     >
                        <UndoIcon className="w-5 h-5" />
                     </button>
                     <button
                        onClick={redo}
                        disabled={!canRedo}
                        title="Redo (Ctrl+Y)"
                        className="p-2 rounded-md transition-colors duration-200 text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                     >
                        <RedoIcon className="w-5 h-5" />
                     </button>
                     <div className="w-px h-6 bg-gray-300 hidden md:block"></div>
                     <div className="items-center space-x-1 hidden md:flex">
                        <button onClick={() => handleZoom('out')} title="Zoom Out" className="p-2 rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200"><ZoomOutIcon className="w-5 h-5"/></button>
                        <button onClick={() => handleZoom('reset')} title="Reset Zoom" className="text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md px-2 py-1 w-16 text-center">{Math.round(zoom * 100)}%</button>
                        <button onClick={() => handleZoom('in')} title="Zoom In" className="p-2 rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200"><ZoomInIcon className="w-5 h-5"/></button>
                     </div>
                     <div className="w-px h-6 bg-gray-300 hidden md:block"></div>
                     
                     <button
                        onClick={() => setIsTopPanelOpen(p => !p)}
                        title="Toggle Panels"
                        className="p-2 rounded-md transition-colors duration-200 text-gray-600 bg-gray-100 hover:bg-gray-200 md:hidden"
                     >
                        <MenuIcon className="w-5 h-5" />
                     </button>

                     <button
                        onClick={() => setIsHelpModalOpen(true)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-3 md:px-4 rounded text-sm md:text-base transition-colors duration-200"
                    >
                        Help
                    </button>
                    <button
                        onClick={handleSaveSVG}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 md:px-4 rounded text-sm md:text-base transition-colors duration-200"
                    >
                        Save
                    </button>
                </div>
            </header>
            
            <div className="flex flex-1 overflow-hidden">
                <div className="relative flex-1 h-full">
                    <div className={`absolute top-0 left-0 h-full z-30 transition-transform duration-300 ease-in-out ${isToolbarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                        <Toolbar activeTool={activeTool} onToolSelect={handleToolSelect} />
                    </div>

                    <button
                        onClick={() => setIsToolbarOpen(prev => !prev)}
                        className="absolute top-4 z-30 p-2 bg-white rounded-r-lg shadow-lg transition-all duration-300 ease-in-out"
                        style={{ left: isToolbarOpen ? '4rem' : '0' }}
                        aria-label={isToolbarOpen ? 'Collapse toolbar' : 'Expand toolbar'}
                    >
                        {isToolbarOpen ? <ChevronLeftIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
                    </button>

                    <div className={`absolute top-0 left-0 right-0 z-20 md:hidden bg-white shadow-lg transition-transform duration-300 ease-in-out ${isTopPanelOpen ? 'translate-y-0' : '-translate-y-full'}`}>
                        <div className="p-2 flex flex-col max-h-[50vh]">
                            <div className="grid grid-cols-5 items-center justify-around border-b pb-2 mb-2 gap-1">
                                <TabButton label="Actions" isActive={activeTab === 'actions'} onClick={() => setActiveTab('actions')}>
                                    <DuplicateIcon className="w-5 h-5" />
                                </TabButton>
                                <TabButton label="Properties" isActive={activeTab === 'properties'} onClick={() => setActiveTab('properties')}>
                                    <PropertiesIcon className="w-5 h-5" />
                                </TabButton>
                                <TabButton label="Layers" isActive={activeTab === 'layers'} onClick={() => setActiveTab('layers')}>
                                    <LayersIcon className="w-5 h-5" />
                                </TabButton>
                                <TabButton label="Artboard" isActive={activeTab === 'artboard'} onClick={() => setActiveTab('artboard')}>
                                    <ArtboardIcon className="w-5 h-5" />
                                </TabButton>
                                <TabButton label="Import" isActive={activeTab === 'svgImport'} onClick={() => setActiveTab('svgImport')}>
                                    <SvgImportIcon className="w-5 h-5" />
                                </TabButton>
                            </div>
                            <div className="overflow-y-auto px-2">
                                {activeTab === 'actions' && <ActionPanel onDuplicate={handleDuplicateShapes} onDelete={handleDeleteShapes} selectedCount={selectedShapeIds.length} onDeselectAll={handleDeselectAll} onSave={handleSaveSVG} activeSlider={activeSlider} onToggleSlider={handleToggleSlider} onRotate={handleRotateShapes} onScale={handleScaleShapes} onCornerRadiusChange={handleCornerRadiusChange} maxCornerRadius={getMaxCornerRadiusForSlider()} canApplyCornerRadius={canApplyCornerRadius} onSliderInteractionStart={handleSliderInteractionStart} onSliderInteractionEnd={handleSliderInteractionEnd} onGroup={handleGroupShapes} onUngroup={handleUngroupShapes} canGroup={selectedShapes.length > 1} canUngroup={selectedShapes.some(s => s.groupId)} onToggleMultiSelectMode={handleToggleMultiSelectMode} isMultiSelectMode={isMultiSelectMode} onAlign={handleAlignShapes} canEnterVertexEditMode={canEnterVertexEditMode} editingShapeId={editingShapeId} onToggleVertexEditMode={handleToggleVertexEditMode} selectedVertex={selectedVertex} onVertexSnap={handleVertexSnap} />}
                                {activeTab === 'properties' && <PropertiesPanel style={getConsolidatedStyle()} onStyleChange={handleStyleChange} selectedShapesCount={selectedShapeIds.length} />}
                                {activeTab === 'layers' && <LayerPanel layers={layers} setLayers={setLayers} activeLayerId={activeLayerId} setActiveLayerId={setActiveLayerId} setSelectedShapeId={(id) => setSelectedShapeIds(id ? [id] : [])} />}
                                {activeTab === 'artboard' && <ArtboardPanel artboard={artboard} onArtboardChange={setArtboard} />}
                                {activeTab === 'background' && <BackgroundPanel onImageChange={setBackgroundImage} />}
                                {activeTab === 'svgImport' && <SvgImportPanel onImport={handleImportSVG} />}
                            </div>
                        </div>
                    </div>
                    
                    <main className="w-full h-full bg-gray-200">
                        <Canvas
                            layers={layers}
                            activeLayerId={activeLayerId}
                            setLayers={setLayers}
                            selectedShapeIds={selectedShapeIds}
                            setSelectedShapeIds={setSelectedShapeIds}
                            activeTool={activeTool}
                            defaultStyles={defaultStyles}
                            backgroundImage={backgroundImage}
                            artboard={artboard}
                            updateShapes={updateShapes}
                            selectedCount={selectedShapeIds.length}
                            beginBatchUpdate={beginBatchUpdate}
                            endBatchUpdate={endBatchUpdate}
                            isMultiSelectMode={isMultiSelectMode}
                            viewBox={viewBox}
                            setViewBox={setViewBox}
                            setZoom={setZoom}
                            svgSizeRef={svgSizeRef}
                            editingShapeId={editingShapeId}
                            setEditingShapeId={setEditingShapeId}
                            selectedVertex={selectedVertex}
                            setSelectedVertex={setSelectedVertex}
                        />
                    </main>
                </div>
                
                <aside className="w-64 bg-white shadow-lg p-4 space-y-6 overflow-y-auto z-10 hidden md:block flex-shrink-0">
                    <ActionPanel
                        onDuplicate={handleDuplicateShapes}
                        onDelete={handleDeleteShapes}
                        selectedCount={selectedShapeIds.length}
                        onDeselectAll={handleDeselectAll}
                        onSave={handleSaveSVG}
                        activeSlider={activeSlider}
                        onToggleSlider={handleToggleSlider}
                        onRotate={handleRotateShapes}
                        onScale={handleScaleShapes}
                        onCornerRadiusChange={handleCornerRadiusChange}
                        maxCornerRadius={getMaxCornerRadiusForSlider()}
                        canApplyCornerRadius={canApplyCornerRadius}
                        onSliderInteractionStart={handleSliderInteractionStart}
                        onSliderInteractionEnd={handleSliderInteractionEnd}
                        onGroup={handleGroupShapes}
                        onUngroup={handleUngroupShapes}
                        canGroup={selectedShapes.length > 1}
                        canUngroup={selectedShapes.some(s => s.groupId)}
                        onToggleMultiSelectMode={handleToggleMultiSelectMode}
                        isMultiSelectMode={isMultiSelectMode}
                        onAlign={handleAlignShapes}
                        canEnterVertexEditMode={canEnterVertexEditMode}
                        editingShapeId={editingShapeId}
                        onToggleVertexEditMode={handleToggleVertexEditMode}
                        selectedVertex={selectedVertex}
                        onVertexSnap={handleVertexSnap}
                    />
                    <PropertiesPanel
                        style={getConsolidatedStyle()}
                        onStyleChange={handleStyleChange}
                        selectedShapesCount={selectedShapeIds.length}
                    />
                    <LayerPanel
                        layers={layers}
                        setLayers={setLayers}
                        activeLayerId={activeLayerId}
                        setActiveLayerId={setActiveLayerId}
                        setSelectedShapeId={(id) => setSelectedShapeIds(id ? [id] : [])}
                    />
                    <ArtboardPanel
                        artboard={artboard}
                        onArtboardChange={setArtboard}
                    />
                    <BackgroundPanel onImageChange={setBackgroundImage} />
                    <SvgImportPanel onImport={handleImportSVG} />
                </aside>
            </div>
            <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
            <SaveSvgModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                onSave={handleConfirmSave}
            />
        </div>
    );
};

export default App;
