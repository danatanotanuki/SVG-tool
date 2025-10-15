
import React from 'react';
import { DuplicateIcon, TrashIcon, DeselectIcon, SaveIcon } from './icons/Icons';

interface ActionPanelProps {
    onDuplicate: () => void;
    onDelete: () => void;
    onDeselectAll: () => void;
    onSave: () => void;
    selectedCount: number;
}

const ActionButton: React.FC<{
    label: string;
    onClick: () => void;
    disabled: boolean;
    children: React.ReactNode;
}> = ({ label, onClick, disabled, children }) => (
    <button
        title={label}
        onClick={onClick}
        disabled={disabled}
        className="p-2 rounded-md transition-colors duration-200 text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
    >
        {children}
    </button>
);


const ActionPanel: React.FC<ActionPanelProps> = ({ onDuplicate, onDelete, onDeselectAll, onSave, selectedCount }) => {
    const isDisabled = selectedCount === 0;

    return (
        <div className="space-y-4">
             <div className="border-b pb-2">
                <p className="text-sm text-gray-600 font-semibold">Selected: {selectedCount} items</p>
             </div>
            <div className="flex items-center space-x-2">
                <ActionButton label="Duplicate (Ctrl+D)" onClick={onDuplicate} disabled={isDisabled}>
                    <DuplicateIcon className="w-5 h-5" />
                </ActionButton>
                <ActionButton label="Delete (Del)" onClick={onDelete} disabled={isDisabled}>
                    <TrashIcon className="w-5 h-5" />
                </ActionButton>
                <ActionButton label="Deselect All" onClick={onDeselectAll} disabled={isDisabled}>
                    <DeselectIcon className="w-5 h-5" />
                </ActionButton>
                 <ActionButton label="Save SVG" onClick={onSave} disabled={false}>
                    <SaveIcon className="w-5 h-5" />
                </ActionButton>
            </div>
        </div>
    );
};

export default ActionPanel;
