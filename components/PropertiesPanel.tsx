import React from 'react';
import type { ShapeStyle } from '../types';

interface PropertiesPanelProps {
    style: ShapeStyle | null;
    onStyleChange: (style: Partial<ShapeStyle>) => void;
    selectedShapesCount: number;
}

const StyleInput: React.FC<{
    label: string;
    type: string;
    value: string | number;
    placeholder?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: any;
}> = ({ label, ...props }) => (
    <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-600">{label}</label>
        <input {...props} className="w-24 p-1 border border-gray-300 rounded-md bg-gray-100" />
    </div>
);

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ style, onStyleChange, selectedShapesCount }) => {
    const getTitle = () => {
        if (selectedShapesCount > 1) {
            return `Properties (${selectedShapesCount} items)`;
        }
        if (selectedShapesCount === 1) {
            return 'Shape Properties';
        }
        return 'Default Styles';
    };

    return (
        <div className="space-y-4">
            <div className="border-b pb-2">
                <p className="text-sm text-gray-600 font-semibold">{getTitle()}</p>
             </div>
            <div className="space-y-3 pt-2">
                <StyleInput
                    label="Fill Color"
                    type="color"
                    value={style?.fill || '#000000'}
                    onChange={(e) => onStyleChange({ fill: e.target.value })}
                />
                <StyleInput
                    label="Stroke Color"
                    type="color"
                    value={style?.stroke || '#000000'}
                    onChange={(e) => onStyleChange({ stroke: e.target.value })}
                />
                <StyleInput
                    label="Stroke Width"
                    type="number"
                    min="0"
                    value={style?.strokeWidth ?? ''}
                    placeholder={style === null ? '(mixed)' : ''}
                    onChange={(e) => onStyleChange({ strokeWidth: parseInt(e.target.value, 10) || 0 })}
                />
            </div>
        </div>
    );
};

export default PropertiesPanel;