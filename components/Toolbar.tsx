import React from 'react';
import type { Tool } from '../types';
import { ToolType } from '../types';
import { MousePointerIcon, RectangleIcon, CircleIcon, PolygonIcon } from './icons/Icons';

interface ToolbarProps {
    activeTool: Tool;
    onToolSelect: (tool: Tool) => void;
}

const ToolButton: React.FC<{
    label: string;
    tool: Tool;
    activeTool: Tool;
    onClick: (tool: Tool) => void;
    children: React.ReactNode;
}> = ({ label, tool, activeTool, onClick, children }) => (
    <button
        title={`${label} (${tool.charAt(0).toUpperCase()})`}
        onClick={() => onClick(tool)}
        className={`p-3 rounded-lg transition-colors duration-200 ${
            activeTool === tool ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
        }`}
    >
        {children}
    </button>
);

const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onToolSelect }) => {
    return (
        <aside className="w-16 bg-white shadow-lg p-2 flex flex-col items-center space-y-3 z-10">
            <ToolButton label="Select" tool={ToolType.SELECT} activeTool={activeTool} onClick={onToolSelect}>
                <MousePointerIcon className="w-6 h-6" />
            </ToolButton>
            <ToolButton label="Rectangle" tool={ToolType.RECTANGLE} activeTool={activeTool} onClick={onToolSelect}>
                <RectangleIcon className="w-6 h-6" />
            </ToolButton>
            <ToolButton label="Circle" tool={ToolType.CIRCLE} activeTool={activeTool} onClick={onToolSelect}>
                <CircleIcon className="w-6 h-6" />
            </ToolButton>
            <ToolButton label="Polygon" tool={ToolType.POLYGON} activeTool={activeTool} onClick={onToolSelect}>
                <PolygonIcon className="w-6 h-6" />
            </ToolButton>
        </aside>
    );
};

export default Toolbar;
