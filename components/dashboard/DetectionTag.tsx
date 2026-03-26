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
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-500/10 animate-fade-in text-[12px] font-medium shadow-sm transition-all">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <Icon size={13} strokeWidth={2} />
            <span className="opacity-80">{label} detected</span>
            <button 
                onClick={onDismiss}
                className="ml-1 hover:bg-indigo-100 rounded-lg p-0.5 transition-all text-indigo-400 hover:text-indigo-600"
                aria-label="Dismiss"
            >
                <X size={12} strokeWidth={2} />
            </button>
        </div>
    );
};

export default DetectionTag;
