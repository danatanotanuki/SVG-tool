
import React, { useState, useCallback, useEffect } from 'react';
import type { Shape, Layer, Tool, Point, ShapeStyle } from './types';
import { ToolType } from './types';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import LayerPanel from './components/LayerPanel';
import Canvas from './components/Canvas';
import BackgroundPanel from './components/BackgroundPanel';
import HelpModal from './components/HelpModal';
import SaveSvgModal from './components/SaveSvgModal';
import ActionPanel from './components/ActionPanel';
import { exportToSVG } from './utils/svgExport';
import { useHistory } from './hooks/useHistory';
import { UndoIcon, RedoIcon } from './components/icons/Icons';

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
    
    const [defaultStyles, setDefaultStyles] = useState<ShapeStyle>({
        fill: '#cccccc',
        stroke: '#333333',
        strokeWidth: 2,
    });
    
    const [backgroundImage, setBackgroundImage] = useState<{ src: string; opacity: number } | null>(null);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    const getActiveLayer = useCallback(() => {
        return layers.find(l => l.id === activeLayerId);
    }, [layers, activeLayerId]);

    const getSelectedShapes = useCallback(() => {
        const layer = getActiveLayer();
        if (!layer) return [];
        return layer.shapes.filter(s => selectedShapeIds.includes(s.id));
    }, [getActiveLayer, selectedShapeIds]);

    const updateShape = useCallback((shapeId: string, updates: Partial<Shape>) => {
        setLayers(prevLayers => prevLayers.map(layer => {
            if (layer.id === activeLayerId) {
                return {
                    ...layer,
                    shapes: layer.shapes.map(shape =>
                        shape.id === shapeId ? { ...shape, ...updates } as Shape : shape
                    ),
                };
            }
            return layer;
        }));
    }, [activeLayerId, setLayers]);
    
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
        exportToSVG(layers, title);
        setIsSaveModalOpen(false);
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
    }, [selectedShapeIds, activeLayerId, setLayers]);

    const handleDuplicateShapes = useCallback(() => {
        if (selectedShapeIds.length === 0 || !activeLayerId) return;
        const activeLayer = getActiveLayer();
        if (!activeLayer) return;

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
            } else {
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
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                handleDeleteShapes();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                handleDuplicateShapes();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
            }
            if (e.key.toLowerCase() === 'v') setActiveTool(ToolType.SELECT);
            if (e.key.toLowerCase() === 'r') setActiveTool(ToolType.RECTANGLE);
            if (e.key.toLowerCase() === 'c') setActiveTool(ToolType.CIRCLE);
            if (e.key.toLowerCase() === 'p') setActiveTool(ToolType.POLYGON);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleDeleteShapes, handleDuplicateShapes, undo, redo]);

    const selectedShapes = getSelectedShapes();

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
        <div className="flex flex-col h-screen font-sans text-gray-800">
            <header className="bg-white shadow-md z-20 p-2 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-700">SVG Vector Draw</h1>
                <div className="flex items-center space-x-4">
                     <button
                        onClick={undo}
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
                     <div className="w-px h-6 bg-gray-300"></div>

                     <button
                        onClick={() => setIsHelpModalOpen(true)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded transition-colors duration-200"
                    >
                        How to Use
                    </button>
                    <button
                        onClick={handleSaveSVG}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                    >
                        Save as SVG
                    </button>
                </div>
            </header>
            <div className="flex flex-1 overflow-hidden">
                <Toolbar activeTool={activeTool} onToolSelect={setActiveTool} />
                <main className="flex-1 bg-gray-200 relative">
                    <Canvas
                        layers={layers}
                        activeLayerId={activeLayerId}
                        setLayers={setLayers}
                        selectedShapeIds={selectedShapeIds}
                        setSelectedShapeIds={setSelectedShapeIds}
                        activeTool={activeTool}
                        defaultStyles={defaultStyles}
                        backgroundImage={backgroundImage}
                        updateShapes={updateShapes}
                        selectedCount={selectedShapeIds.length}
                        beginBatchUpdate={beginBatchUpdate}
                        endBatchUpdate={endBatchUpdate}
                    />
                </main>
                <aside className="w-64 bg-white shadow-lg p-4 space-y-6 overflow-y-auto z-10">
                    <ActionPanel
                        onDuplicate={handleDuplicateShapes}
                        onDelete={handleDeleteShapes}
                        selectedCount={selectedShapeIds.length}
                        onDeselectAll={handleDeselectAll}
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
                    <BackgroundPanel onImageChange={setBackgroundImage} />
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
