import React, { useState, useEffect } from 'react';
import type { Artboard } from '../types';

interface ArtboardPanelProps {
    artboard: Artboard | null;
    onArtboardChange: (artboard: Artboard | null) => void;
}

const presets: Record<string, { width: number, height: number }> = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '4:3': { width: 1024, height: 768 },
    '1:1': { width: 1080, height: 1080 },
};

const ArtboardPanel: React.FC<ArtboardPanelProps> = ({ artboard, onArtboardChange }) => {
    const [selectedPreset, setSelectedPreset] = useState(artboard?.aspectRatio || 'none');
    const [customWidth, setCustomWidth] = useState(artboard?.width || 1000);
    const [customHeight, setCustomHeight] = useState(artboard?.height || 1000);

    useEffect(() => {
        setSelectedPreset(artboard?.aspectRatio || 'none');
        if (artboard) {
            setCustomWidth(artboard.width);
            setCustomHeight(artboard.height);
        }
    }, [artboard]);

    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setSelectedPreset(value);
        if (value === 'none') {
            onArtboardChange(null);
        } else if (value === 'custom') {
            onArtboardChange({ width: customWidth, height: customHeight, aspectRatio: 'custom' });
        } else {
            const preset = presets[value];
            onArtboardChange({ ...preset, aspectRatio: value });
        }
    };
    
    const handleCustomChange = (dim: 'width' | 'height', value: string) => {
        const numValue = parseInt(value, 10) || 0;
        let newWidth = customWidth;
        let newHeight = customHeight;
        if(dim === 'width') {
            setCustomWidth(numValue);
            newWidth = numValue;
        } else {
            setCustomHeight(numValue);
            newHeight = numValue;
        }
        if(selectedPreset === 'custom') {
             onArtboardChange({ width: newWidth, height: newHeight, aspectRatio: 'custom' });
        }
    };

    return (
        <div className="space-y-4">
            <div className="border-b pb-2">
                <p className="text-sm text-gray-600 font-semibold">Artboard</p>
            </div>
            <div className="space-y-3 pt-2">
                <div>
                    <label htmlFor="artboard-preset" className="block text-sm font-medium text-gray-600 mb-1">Preset</label>
                    <select
                        id="artboard-preset"
                        value={selectedPreset}
                        onChange={handlePresetChange}
                        className="w-full p-1 border border-gray-300 rounded-md bg-gray-100"
                    >
                        <option value="none">None</option>
                        <option value="16:9">16:9 (Landscape)</option>
                        <option value="9:16">9:16 (Portrait)</option>
                        <option value="4:3">4:3 (Standard)</option>
                        <option value="1:1">1:1 (Square)</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                {selectedPreset === 'custom' && (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center">
                            <label htmlFor="custom-width" className="text-sm mr-2">W</label>
                            <input
                                id="custom-width"
                                type="number"
                                value={customWidth}
                                onChange={(e) => handleCustomChange('width', e.target.value)}
                                className="w-full p-1 border border-gray-300 rounded-md bg-gray-100"
                            />
                        </div>
                         <div className="flex items-center">
                            <label htmlFor="custom-height" className="text-sm mr-2">H</label>
                            <input
                                id="custom-height"
                                type="number"
                                value={customHeight}
                                onChange={(e) => handleCustomChange('height', e.target.value)}
                                className="w-full p-1 border border-gray-300 rounded-md bg-gray-100"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArtboardPanel;