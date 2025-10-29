
import React, { useState } from 'react';

interface SvgImportPanelProps {
    onImport: (svgString: string) => void;
}

const SvgImportPanel: React.FC<SvgImportPanelProps> = ({ onImport }) => {
    const [svgCode, setSvgCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                setSvgCode(result);
            };
            reader.readAsText(file);
        }
    };

    const handleImportClick = () => {
        if (!svgCode.trim()) {
            alert('Please provide SVG content to import.');
            return;
        }
        setIsLoading(true);
        // Use a timeout to allow the UI to update before the potentially blocking import logic runs
        setTimeout(() => {
            try {
                onImport(svgCode);
            } finally {
                setIsLoading(false);
            }
        }, 50);
    };

    return (
        <div className="space-y-4">
            <div className="border-b pb-2">
                <p className="text-sm text-gray-600 font-semibold">Import SVG</p>
            </div>
            <div className="space-y-3 pt-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload SVG File
                    </label>
                    <input
                        type="file"
                        accept=".svg, image/svg+xml"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>
                <div>
                    <label htmlFor="svg-code-textarea" className="block text-sm font-medium text-gray-700 mb-2">
                        Or Paste SVG Code
                    </label>
                    <textarea
                        id="svg-code-textarea"
                        rows={6}
                        value={svgCode}
                        onChange={(e) => setSvgCode(e.target.value)}
                        placeholder='<svg width="100" height="100">...'
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <button
                    onClick={handleImportClick}
                    disabled={isLoading}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Importing...' : 'Import'}
                </button>
            </div>
        </div>
    );
};

export default SvgImportPanel;
