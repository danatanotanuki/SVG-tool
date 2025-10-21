import React from 'react';
import { MousePointerIcon, RectangleIcon, CircleIcon, PolygonIcon } from './icons/Icons';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b pb-3 mb-5">
                    <h2 className="text-2xl font-bold text-gray-800">How to Use SVG Draw Tool</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>
                
                <div className="space-y-6 text-gray-700">
                    <Section title="Tools">
                        <ToolItem icon={<MousePointerIcon />} name="Select Tool (V)" description="Select, move, resize, and rotate shapes. Click on a shape to select it. Hold Ctrl (or Cmd on Mac) and click to select multiple shapes. Use the 'Multi-select Mode' in the Action Panel to select multiple shapes without holding Ctrl/Cmd." />
                        <ToolItem icon={<RectangleIcon />} name="Rectangle Tool (R)" description="Click and drag on the canvas to draw a rectangle." />
                        <ToolItem icon={<CircleIcon />} name="Circle Tool (C)" description="Click and drag on the canvas to draw a circle from its center." />
                        <ToolItem icon={<PolygonIcon />} name="Polygon Tool (P)" description="Click on the canvas to place vertices. Press 'Enter' to complete the shape (must have at least 3 vertices). Press 'Escape' to cancel drawing." />
                    </Section>

                    <Section title="Editing Shapes">
                         <p>Once a shape is selected with the <strong>Select Tool</strong>:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li><strong>Move:</strong> Click and drag any part of a selected shape or group to move it. (Note: Movement is disabled in Multi-select Mode).</li>
                            <li><strong>Resize:</strong> Drag the square handles on the sides of the selection box to change its width or height.</li>
                            <li><strong>Multi-select Mode:</strong> Click the 'Multi-select' button in the Action Panel to enter a mode where you can click to add or remove shapes from a temporary selection.</li>
                            <li><strong>Group (Ctrl+G):</strong> While in Multi-select Mode with 2 or more shapes selected, click the 'Group' button to combine them into a single, persistent object. This will automatically exit Multi-select Mode.</li>
                            <li><strong>Ungroup (Ctrl+Shift+G):</strong> Select a group and click the 'Ungroup' button to break it back into its individual component shapes.</li>
                            <li><strong>Duplicate:</strong> Click the duplicate button in the right-hand panel or press 'Ctrl+D'.</li>
                            <li><strong>Delete:</strong> Click the trash icon in the right-hand panel or press the 'Delete' or 'Backspace' key.</li>
                        </ul>
                    </Section>
                    
                    <Section title="General Features">
                        <p><strong>Undo/Redo:</strong> Use the undo and redo buttons in the header, or press 'Ctrl+Z' and 'Ctrl+Y' to step through your action history.</p>
                        <p><strong>Deselect All:</strong> To clear your selection, use the "Deselect All" button in the Action Panel or press 'Escape'. This will also exit Multi-select Mode.</p>
                    </Section>

                    <Section title="Panels">
                        <p><strong>Action Panel:</strong> Quickly duplicate, delete, group, ungroup or deselect the currently selected shape(s). Also contains the Multi-select Mode toggle.</p>
                        <p><strong>Properties Panel:</strong> When a shape is selected, you can change its fill color, stroke color, and stroke width. If no shape is selected, this panel sets the default style for new shapes. These changes apply to all selected shapes.</p>
                        <p><strong>Layers Panel:</strong> Create new layers, delete layers, reorder them, and toggle their visibility. Your drawings are added to the currently active layer.</p>
                        <p><strong>Background Panel:</strong> Load a local image as a tracing reference. You can adjust its opacity.</p>
                    </Section>

                     <Section title="Exporting">
                        <p>Click the "Save" button in the header to download your entire visible drawing as an SVG file.</p>
                    </Section>
                </div>
            </div>
        </div>
    );
};

// Helper components for styling
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section>
        <h3 className="text-xl font-semibold mb-3 text-gray-700">{title}</h3>
        <div className="space-y-2">{children}</div>
    </section>
);

const ToolItem: React.FC<{ icon: React.ReactElement<{ className?: string }>; name: string; description: string }> = ({ icon, name, description }) => (
    <div className="flex items-start space-x-4">
        <span className="text-blue-500 mt-1">{React.cloneElement(icon, { className: "w-6 h-6" })}</span>
        <div>
            <h4 className="font-semibold">{name}</h4>
            <p className="text-sm">{description}</p>
        </div>
    </div>
);

export default HelpModal;