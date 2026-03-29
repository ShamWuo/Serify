import React from 'react';
import { Youtube, Link as LinkIcon, FileText, File, X } from 'lucide-react';

export type DetectedType = 'youtube' | 'article' | 'text' | 'pdf' | 'file';

interface DetectionTagProps {
    type: DetectedType;
    onDismiss: () => void;
}

const DetectionTag: React.FC<DetectionTagProps> = ({ type, onDismiss }) => {
    const config = {
        youtube: { icon: Youtube, label: 'YouTube video' },
        article: { icon: LinkIcon, label: 'Article' },
        text: { icon: FileText, label: 'Text notes' },
        pdf: { icon: File, label: 'Document' },
        file: { icon: File, label: 'File' },
    };

    const { icon: Icon, label } = config[type];

    return (
        <div className="washi-tape washi-solid animate-fade-in group/tag transition-all hover:-translate-y-0.5">
            <div className="w-1.5 h-1.5 bg-current opacity-80" />
            <Icon size={12} strokeWidth={2.5} />
            <span className="text-[10px] font-mono tracking-wider">{label} detected</span>
            <button 
                onClick={onDismiss}
                className="ml-1 opacity-40 hover:opacity-100 transition-all p-0.5"
                aria-label="Dismiss"
            >
                <X size={10} strokeWidth={3} />
            </button>
        </div>
    );
};

export default DetectionTag;
