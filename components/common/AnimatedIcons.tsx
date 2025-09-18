import React from 'react';

// A simple base for all icons
const IconBase: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "w-10 h-10" }) => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {children}
    </svg>
);

export const IdleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconBase className={className}>
        <circle cx="24" cy="24" r="4" fill="currentColor">
            <animate attributeName="r" values="4;8;4" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
        </circle>
    </IconBase>
);


export const DeconstructionIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconBase className={className}>
        <path d="M14 14h8v8h-8z M26 14h8v8h-8z M14 26h8v8h-8z M26 26h8v8h-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="90 24 24" dur="3s" repeatCount="indefinite" />
        </path>
    </IconBase>
);

export const KnowledgeBaseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconBase className={className}>
        <path d="M36 18c0 6.627-5.373 12-12 12s-12-5.373-12-12" stroke="currentColor" strokeWidth="2" />
        <path d="M12 18v12c0 6.627 5.373 12 12 12s12-5.373 12-12V18H12z" fill="currentColor" opacity="0.3" />
        <path d="M12 6v12h24V6c0-6.627-5.373-12-12-12S12-.627 12 6z" stroke="currentColor" strokeWidth="2" />
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 -2; 0 0" dur="2s" repeatCount="indefinite" />
    </IconBase>
);

export const VectorIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconBase className={className}>
        <circle cx="24" cy="24" r="3" fill="currentColor" />
        <line x1="24" y1="24" x2="40" y2="8" stroke="currentColor" strokeWidth="2">
             <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="4s" repeatCount="indefinite" />
        </line>
        <line x1="24" y1="24" x2="32" y2="40" stroke="currentColor" strokeWidth="2">
             <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="4s" repeatCount="indefinite" />
        </line>
         <line x1="24" y1="24" x2="8" y2="32" stroke="currentColor" strokeWidth="2">
             <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="4s" repeatCount="indefinite" />
        </line>
    </IconBase>
);

export const DataMiningIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconBase className={className}>
        <circle cx="20" cy="20" r="10" stroke="currentColor" strokeWidth="2" />
        <line x1="28" y1="28" x2="38" y2="38" stroke="currentColor" strokeWidth="2" />
        <path d="M14 24h12M14 20h12M14 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <animate attributeName="x" from="14" to="20" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
        </path>
    </IconBase>
);

export const SynthesisIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconBase className={className}>
        <circle cx="24" cy="24" r="4" fill="currentColor" />
        <path d="M8 8 L 20 20 M40 8 L 28 20 M8 40 L 20 28 M40 40 L 28 28" stroke="currentColor" strokeWidth="2">
             <animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite" />
        </path>
    </IconBase>
);

export const ReasoningIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconBase className={className}>
        <path d="M35.31,14.69a12,12,0,1,0-1.89,17.21" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10"/>
        <path d="M31.2,12.8v8.4h-8.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M24 20a4 4 0 1 0-4-4" stroke="currentColor" opacity="0.6" strokeWidth="2">
             <animateTransform attributeName="transform" type="rotate" from="0 22 18" to="360 22 18" dur="3s" repeatCount="indefinite" />
        </path>
    </IconBase>
);

export const EngineeringIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconBase className={className}>
        <path d="M10 10 L 38 10 M10 18 L 38 18 M10 26 L 30 26 M10 34 L 25 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <animate attributeName="stroke-dasharray" values="0 48; 48 0" dur="2s" begin="0s" repeatCount="indefinite" />
        </path>
         <path d="M10 10 L 10 38" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <animate attributeName="stroke-dasharray" values="0 38; 38 0" dur="2s" begin="1s" repeatCount="indefinite" />
        </path>
    </IconBase>
);

export const ReportIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconBase className={className}>
        <path d="M12 4h18a2 2 0 0 1 2 2v36a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="2" />
        <path d="M16 12h16 M16 20h16 M16 28h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" />
        </path>
    </IconBase>
);

export const CompleteIcon: React.FC<{ className?: string }> = ({ className }) => (
    <IconBase className={className}>
         <path d="M10 24 l 8 8 l 20 -20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="100" strokeDashoffset="100">
            <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
         </path>
    </IconBase>
);
