
import React from 'react';
import type { Layer } from '../types';
import { PlusIcon, TrashIcon, EyeIcon, EyeOffIcon, ChevronUpIcon, ChevronDownIcon } from './icons/Icons';

interface LayerPanelProps {
    layers: Layer[];
    setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
    activeLayerId: string;
    setActiveLayerId: (id: string) => void;
    setSelectedShapeId: (id: string | null) => void;
}

const LayerPanel: React.FC<LayerPanelProps> = ({ layers, setLayers, activeLayerId, setActiveLayerId, setSelectedShapeId }) => {

    const addLayer = () => {
        const newLayer: Layer = {
            id: `layer-${Date.now()}`,
            name: `Layer ${layers.length + 1}`,
            shapes: [],
            isVisible: true,
        };
        setLayers(prev => [...prev, newLayer]);
        setActiveLayerId(newLayer.id);
    };

    const deleteLayer = (id: string) => {
        if (layers.length <= 1) return; // Cannot delete the last layer
        setLayers(prev => prev.filter(l => l.id !== id));
        if (activeLayerId === id) {
            setActiveLayerId(layers.filter(l => l.id !== id)[0].id);
        }
    };

    const toggleVisibility = (id: string) => {
        setLayers(prev => prev.map(l => l.id === id ? { ...l, isVisible: !l.isVisible } : l));
    };

    const moveLayer = (id: string, direction: 'up' | 'down') => {
        const index = layers.findIndex(l => l.id === id);
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === layers.length - 1)) {
            return;
        }
        const newLayers = [...layers];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newLayers[index], newLayers[targetIndex]] = [newLayers[targetIndex], newLayers[index]];
        setLayers(newLayers);
    };

    const selectLayer = (id: string) => {
        setActiveLayerId(id);
        setSelectedShapeId(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold text-gray-700">Layers</h3>
                <button onClick={addLayer} className="p-1 text-gray-600 hover:text-blue-500 rounded">
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>
            <ul className="space-y-2">
                {layers.map((layer, index) => (
                    <li
                        key={layer.id}
                        onClick={() => selectLayer(layer.id)}
                        className={`p-2 rounded-md cursor-pointer transition-colors duration-200 ${
                            activeLayerId === layer.id ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-gray-100'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-medium">{layer.name}</span>
                            <div className="flex items-center space-x-1 text-gray-500">
                                <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'up'); }} disabled={index === 0} className="p-1 hover:text-gray-800 disabled:opacity-30"><ChevronUpIcon className="w-4 h-4" /></button>
                                <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'down'); }} disabled={index === layers.length - 1} className="p-1 hover:text-gray-800 disabled:opacity-30"><ChevronDownIcon className="w-4 h-4" /></button>
                                <button onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.id); }} className="p-1 hover:text-gray-800">
                                    {layer.isVisible ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }} disabled={layers.length <= 1} className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default LayerPanel;