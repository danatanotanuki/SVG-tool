import React, { useState } from 'react';

interface BackgroundPanelProps {
    onImageChange: (image: { src: string; opacity: number } | null) => void;
}

const BackgroundPanel: React.FC<BackgroundPanelProps> = ({ onImageChange }) => {
    const [opacity, setOpacity] = useState(0.5);
    const [imageSrc, setImageSrc] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const src = event.target?.result as string;
                setImageSrc(src);
                onImageChange({ src, opacity });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newOpacity = parseFloat(e.target.value);
        setOpacity(newOpacity);
        if (imageSrc) {
            onImageChange({ src: imageSrc, opacity: newOpacity });
        }
    };
    
    const handleClearImage = () => {
        setImageSrc(null);
        onImageChange(null);
    }

    return (
        <div className="space-y-4">
            <div className="border-b pb-2">
                 <p className="text-sm text-gray-600 font-semibold">Tracing Image</p>
            </div>
            <div className="space-y-3 pt-2">
                <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {imageSrc && (
                    <>
                        <div className="flex items-center space-x-2">
                            <label htmlFor="opacity" className="text-sm font-medium text-gray-600">Opacity</label>
                            <input
                                id="opacity"
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={opacity}
                                onChange={handleOpacityChange}
                                className="w-full"
                            />
                        </div>
                        <button onClick={handleClearImage} className="w-full text-sm text-red-500 hover:text-red-700">
                            Clear Image
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default BackgroundPanel;
