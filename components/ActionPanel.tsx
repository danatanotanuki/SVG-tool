
import React, { useState, useEffect } from 'react';
import { DuplicateIcon, TrashIcon, DeselectIcon, SaveIcon, RotateCwIcon, ExpandIcon, GroupIcon, UngroupIcon, MultiSelectIcon, CornerRadiusIcon } from './icons/Icons';

type ActiveSlider = 'rotate' | 'scale' | 'cornerRadius' | null;

interface ActionPanelProps {
    onDuplicate: () => void;
    onDelete: () => void;
    onDeselectAll: () => void;
    onSave: () => void;
    selectedCount: number;
    activeSlider: ActiveSlider;
    onToggleSlider: (slider: 'rotate' | 'scale' | 'cornerRadius') => void;
    onRotate: (angle: number) => void;
    onScale: (factor: number) => void;
    onCornerRadiusChange: (radius: number) => void;
    onSliderInteractionStart: () => void;
    onSliderInteractionEnd: () => void;
    onGroup: () => void;
    onUngroup: () => void;
    canGroup: boolean;
    canUngroup: boolean;
    isMultiSelectMode: boolean;
    onToggleMultiSelectMode: () => void;
    canApplyCornerRadius: boolean;
    maxCornerRadius: number;
}

const ActionButton: React.FC<{
    label: string;
    onClick: () => void;
    disabled: boolean;
    isActive?: boolean;
    children: React.ReactNode;
}> = ({ label, onClick, disabled, isActive, children }) => (
    <button
        title={label}
        onClick={onClick}
        disabled={disabled}
        className={`p-2 rounded-md transition-colors duration-200 text-gray-600 ${
            isActive ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-gray-100 hover:bg-gray-200'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
        {children}
    </button>
);

interface TransformSliderProps {
    label: string;
    min: number;
    max: number;
    step: number;
    initialValue: number;
    onChange: (value: number) => void;
    onInteractionStart: () => void;
    // FIX: Standardized prop name to onSliderInteractionEnd for consistency.
    onSliderInteractionEnd: () => void;
    marks?: number[];
    snapThreshold?: number;
}

const TransformSlider: React.FC<TransformSliderProps> = ({
    label, min, max, step, initialValue, onChange, 
    onInteractionStart, onSliderInteractionEnd, marks, snapThreshold
}) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let newValue = parseFloat(e.target.value);
        if (marks && snapThreshold) {
            for (const mark of [...marks, min, max]) {
                if (Math.abs(newValue - mark) < snapThreshold) {
                    newValue = mark;
                    break;
                }
            }
        }
        setValue(newValue);
        onChange(newValue);
    };

    const handleReset = () => {
        setValue(initialValue);
        onChange(initialValue);
    };

    return (
        <div className="p-2 bg-gray-50 rounded-lg space-y-2 border-t mt-4 pt-4">
            <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700">{label}</span>
                <div className="flex items-center space-x-2">
                    <span className="text-gray-600 w-12 text-right font-mono bg-white px-1 py-0.5 rounded border">
                        {label === 'Scale' ? `x${value.toFixed(2)}` : label === 'Rotation' ? `${Math.round(value)}°` : `${value.toFixed(1)}`}
                    </span>
                    {label !== 'Rotation' && (
                         <button onClick={handleReset} className="text-xs bg-gray-200 hover:bg-gray-300 rounded px-2 py-1">Reset</button>
                    )}
                </div>
            </div>
            <div className="relative h-6 flex items-center">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={handleChange}
                    onMouseDown={onInteractionStart}
                    onMouseUp={onSliderInteractionEnd}
                    onTouchStart={onInteractionStart}
                    onTouchEnd={onSliderInteractionEnd}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                 {marks && (
                  <div className="absolute w-full top-1/2 -translate-y-1/2 pointer-events-none h-2 flex items-center">
                     {marks.map(mark => (
                       <div key={mark} className="absolute h-2 w-px bg-gray-400" style={{ left: `${(mark / max) * 100}%` }}></div>
                     ))}
                  </div>
                )}
            </div>
        </div>
    );
};


const ActionPanel: React.FC<ActionPanelProps> = ({ 
    onDuplicate, onDelete, onDeselectAll, onSave, selectedCount,
    activeSlider, onToggleSlider, onRotate, onScale, onCornerRadiusChange,
    onSliderInteractionStart, onSliderInteractionEnd,
    onGroup, onUngroup, canGroup, canUngroup,
    isMultiSelectMode, onToggleMultiSelectMode,
    canApplyCornerRadius, maxCornerRadius
}) => {
    const isSelectionEmpty = selectedCount === 0;

    return (
        <div className="space-y-4">
             <div className="border-b pb-2">
                <p className="text-sm text-gray-600 font-semibold">Selected: {selectedCount} items</p>
             </div>
            <div className="flex flex-wrap gap-2">
                <ActionButton label="Duplicate (Ctrl+D)" onClick={onDuplicate} disabled={isSelectionEmpty}>
                    <DuplicateIcon className="w-5 h-5" />
                </ActionButton>
                <ActionButton label="Multi-select" onClick={onToggleMultiSelectMode} disabled={false} isActive={isMultiSelectMode}>
                    <MultiSelectIcon className="w-5 h-5" />
                </ActionButton>
                <ActionButton label="Group (Ctrl+G)" onClick={onGroup} disabled={!canGroup}>
                    <GroupIcon className="w-5 h-5" />
                </ActionButton>
                <ActionButton label="Ungroup (Ctrl+Shift+G)" onClick={onUngroup} disabled={!canUngroup}>
                    <UngroupIcon className="w-5 h-5" />
                </ActionButton>
                <ActionButton label="Rotate" onClick={() => onToggleSlider('rotate')} disabled={isSelectionEmpty} isActive={activeSlider === 'rotate'}>
                    <RotateCwIcon className="w-5 h-5" />
                </ActionButton>
                <ActionButton label="Scale" onClick={() => onToggleSlider('scale')} disabled={isSelectionEmpty} isActive={activeSlider === 'scale'}>
                    <ExpandIcon className="w-5 h-5" />
                </ActionButton>
                 <ActionButton label="Corner Radius" onClick={() => onToggleSlider('cornerRadius')} disabled={isSelectionEmpty || !canApplyCornerRadius} isActive={activeSlider === 'cornerRadius'}>
                    <CornerRadiusIcon className="w-5 h-5" />
                </ActionButton>
                <ActionButton label="Delete (Del)" onClick={onDelete} disabled={isSelectionEmpty}>
                    <TrashIcon className="w-5 h-5" />
                </ActionButton>
                <ActionButton label="Deselect All (Esc)" onClick={onDeselectAll} disabled={isSelectionEmpty}>
                    <DeselectIcon className="w-5 h-5" />
                </ActionButton>
                 <ActionButton label="Save SVG" onClick={onSave} disabled={false}>
                    <SaveIcon className="w-5 h-5" />
                </ActionButton>
            </div>

            {activeSlider === 'rotate' && (
                <TransformSlider
                    label="Rotation"
                    min={0}
                    max={360}
                    step={1}
                    initialValue={0}
                    onChange={onRotate}
                    onInteractionStart={onSliderInteractionStart}
                    onSliderInteractionEnd={onSliderInteractionEnd}
                    marks={[0, 45, 90, 180, 270, 360]}
                    snapThreshold={5}
                />
            )}
             {activeSlider === 'scale' && (
                <TransformSlider
                    label="Scale"
                    min={0.1}
                    max={4}
                    step={0.01}
                    initialValue={1}
                    onChange={onScale}
                    onInteractionStart={onSliderInteractionStart}
                    onSliderInteractionEnd={onSliderInteractionEnd}
                />
            )}
            {activeSlider === 'cornerRadius' && (
                <TransformSlider
                    label="Corner Radius"
                    min={0}
                    max={maxCornerRadius}
                    step={0.5}
                    initialValue={0}
                    onChange={onCornerRadiusChange}
                    onInteractionStart={onSliderInteractionStart}
                    onSliderInteractionEnd={onSliderInteractionEnd}
                />
            )}
        </div>
    );
};

export default ActionPanel;