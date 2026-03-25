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
        article: { icon: LinkIcon, label: 'Article or webpage' },
        text: { icon: FileText, label: 'Notes or text' },
        pdf: { icon: File, label: 'PDF document' },
        file: { icon: File, label: 'File upload' },
    };

    const { icon: Icon, label } = config[type];

    return (
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border-2 border-emerald-500/20 animate-fade-in text-xs font-bold shadow-sm shadow-emerald-500/10 transition-all">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Icon size={14} className="stroke-[2.5px]" />
            <span className="tracking-tight">{label} detected</span>
            <button 
                onClick={onDismiss}
                className="ml-1 hover:bg-emerald-200/50 rounded-full p-0.5 transition-colors"
                aria-label="Dismiss"
            >
                <X size={12} />
            </button>
        </div>
    );
};

export default DetectionTag;
