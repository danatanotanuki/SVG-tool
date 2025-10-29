
import React, { useState, useEffect } from 'react';

interface SaveSvgModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string) => void;
}

const SaveSvgModal: React.FC<SaveSvgModalProps> = ({ isOpen, onClose, onSave }) => {
    const [title, setTitle] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setTitle('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(title);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b pb-3 mb-5">
                    <h2 className="text-xl font-bold text-gray-800">Set SVG Title</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>
                
                <div className="space-y-4">
                    <p className="text-gray-600">Enter a title for your SVG. This will be added as a `<title>` tag for accessibility.</p>
                    <div>
                        <label htmlFor="svg-title" className="block text-sm font-medium text-gray-700 mb-1">SVG Title (optional)</label>
                        <input
                            type="text"
                            id="svg-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., A collection of various shapes"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded transition-colors duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                    >
                        Save SVG
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveSvgModal;