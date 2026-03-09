export type ElementType = 'text' | 'image' | 'shape';

export interface CanvasElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    width?: number;
    height?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    isLocked?: boolean;
    opacity?: number;
    zIndex?: number;
    // Specific properties
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fill?: string;
    align?: 'left' | 'center' | 'right';
    fontStyle?: 'normal' | 'bold' | 'italic';
    // Image props
    src?: string;
    // Shape props
    shapeType?: 'rect' | 'circle' | 'ellipse';
    cornerRadius?: number;
    stroke?: string;
    strokeWidth?: number;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffset?: { x: number, y: number };
    shadowOpacity?: number;
}

export interface CanvasTemplate {
    id: string;
    name: string;
    width: number;
    height: number;
    background: {
        type: 'solid' | 'gradient' | 'image';
        fill?: string;
        gradientSteps?: { offset: number, color: string }[];
        src?: string;
    };
    elements: CanvasElement[];
}

// Initial hardcoded template for testing
export const DEFAULT_TEMPLATES: Record<string, CanvasTemplate> = {
    'modern-promo': {
        id: 'modern-promo',
        name: 'Promo Moderna',
        width: 1080,
        height: 1080,
        background: {
            type: 'gradient',
            gradientSteps: [
                { offset: 0, color: '#FF7A00' },
                { offset: 1, color: '#FF004D' }
            ]
        },
        elements: [
            {
                id: 'bg-shape-1',
                type: 'shape',
                shapeType: 'circle',
                x: 800,
                y: 200,
                width: 600,
                height: 600,
                fill: '#FFFFFF',
                opacity: 0.1,
                isLocked: true,
                zIndex: 1
            },
            {
                id: 'headline',
                type: 'text',
                x: 80,
                y: 120,
                width: 800,
                text: 'GRANDE\nOFERTA',
                fontSize: 120,
                fontFamily: 'Inter',
                fontStyle: 'bold',
                fill: '#FFFFFF',
                align: 'left',
                shadowColor: 'rgba(0,0,0,0.3)',
                shadowBlur: 20,
                shadowOffset: { x: 0, y: 10 },
                zIndex: 10
            },
            {
                id: 'subheadline',
                type: 'text',
                x: 85,
                y: 380,
                width: 600,
                text: 'Aproveite os melhores preços do ano\ncom descontos de até 50%.',
                fontSize: 32,
                fontFamily: 'Inter',
                fontStyle: 'normal',
                fill: '#FFFFFF',
                opacity: 0.9,
                align: 'left',
                zIndex: 10
            },
            {
                id: 'cta-button',
                type: 'shape',
                shapeType: 'rect',
                x: 80,
                y: 480,
                width: 300,
                height: 80,
                cornerRadius: 40,
                fill: '#FFFFFF',
                shadowColor: 'rgba(0,0,0,0.2)',
                shadowBlur: 15,
                shadowOffset: { x: 0, y: 5 },
                zIndex: 10
            },
            {
                id: 'cta-text',
                type: 'text',
                x: 80,
                y: 505,
                width: 300,
                text: 'COMPRAR AGORA',
                fontSize: 24,
                fontFamily: 'Inter',
                fontStyle: 'bold',
                fill: '#FF004D',
                align: 'center',
                zIndex: 11
            },
            {
                id: 'hero-product-placeholder',
                type: 'shape',
                shapeType: 'rect',
                x: 500,
                y: 300,
                width: 500,
                height: 600,
                fill: 'rgba(255,255,255,0.2)',
                cornerRadius: 20,
                zIndex: 5
            },
            {
                id: 'logo-placeholder',
                type: 'text',
                x: 80,
                y: 60,
                text: 'SUA LOGO',
                fontSize: 24,
                fontFamily: 'Inter',
                fontStyle: 'bold',
                fill: '#FFFFFF',
                isLocked: true,
                zIndex: 20
            }
        ]
    },
    'minimalist': {
        id: 'minimalist',
        name: 'Minimalista Clássico',
        width: 1080,
        height: 1080,
        background: {
            type: 'solid',
            fill: '#F8F9FA'
        },
        elements: [
            {
                id: 'headline',
                type: 'text',
                x: 100,
                y: 150,
                width: 880,
                text: 'SIMPLICIDADE',
                fontSize: 80,
                fontFamily: 'Inter',
                fontStyle: 'normal',
                fill: '#212529',
                align: 'center',
                zIndex: 10
            },
            {
                id: 'subheadline',
                type: 'text',
                x: 140,
                y: 260,
                width: 800,
                text: 'Menos é mais. O essencial em foco.',
                fontSize: 28,
                fontFamily: 'Inter',
                fontStyle: 'normal',
                fill: '#6C757D',
                align: 'center',
                zIndex: 10
            },
            {
                id: 'hero-product-placeholder',
                type: 'shape',
                shapeType: 'rect',
                x: 240,
                y: 350,
                width: 600,
                height: 500,
                fill: 'rgba(0,0,0,0.05)',
                cornerRadius: 8,
                zIndex: 5
            },
            {
                id: 'cta-text',
                type: 'text',
                x: 100,
                y: 920,
                width: 880,
                text: 'Descubra agora',
                fontSize: 20,
                fontFamily: 'Inter',
                fontStyle: 'bold',
                fill: '#212529',
                align: 'center',
                zIndex: 11
            },
            {
                id: 'cta-button', // Invisible hit area basically or just underline
                type: 'shape',
                shapeType: 'rect',
                x: 440,
                y: 955,
                width: 200,
                height: 2,
                fill: '#212529',
                zIndex: 10
            }
        ]
    },
    'aggressive-promo': {
        id: 'aggressive-promo',
        name: 'Varejo / Oferta Agressiva',
        width: 1080,
        height: 1080,
        background: {
            type: 'solid',
            fill: '#FFE600'
        },
        elements: [
            {
                id: 'bg-shape-1',
                type: 'shape',
                shapeType: 'rect',
                x: 0,
                y: 750,
                width: 1080,
                height: 330,
                fill: '#000000',
                isLocked: true,
                zIndex: 1
            },
            {
                id: 'headline',
                type: 'text',
                x: 50,
                y: 80,
                width: 980,
                text: 'QUEIMA DE\nESTOQUE',
                fontSize: 140,
                fontFamily: 'Inter',
                fontStyle: 'bold',
                fill: '#000000',
                align: 'center',
                zIndex: 10
            },
            {
                id: 'hero-product-placeholder',
                type: 'shape',
                shapeType: 'rect',
                x: 240,
                y: 350,
                width: 600,
                height: 480,
                fill: 'rgba(0,0,0,0.1)',
                cornerRadius: 0,
                zIndex: 5
            },
            {
                id: 'subheadline',
                type: 'text',
                x: 50,
                y: 800,
                width: 700,
                text: 'SÓ NESTE FINAL DE SEMANA',
                fontSize: 48,
                fontFamily: 'Inter',
                fontStyle: 'bold',
                fill: '#FFFFFF',
                align: 'left',
                zIndex: 10
            },
            {
                id: 'cta-button',
                type: 'shape',
                shapeType: 'rect',
                x: 50,
                y: 900,
                width: 400,
                height: 100,
                cornerRadius: 10,
                fill: '#FFE600',
                zIndex: 10
            },
            {
                id: 'cta-text',
                type: 'text',
                x: 50,
                y: 930,
                width: 400,
                text: 'COMPRAR AGORA',
                fontSize: 32,
                fontFamily: 'Inter',
                fontStyle: 'bold',
                fill: '#000000',
                align: 'center',
                zIndex: 11
            }
        ]
    },
    'elegant': {
        id: 'elegant',
        name: 'Elegante / Premium',
        width: 1080,
        height: 1080,
        background: {
            type: 'solid',
            fill: '#0A0A0A'
        },
        elements: [
            {
                id: 'bg-shape-1',
                type: 'shape',
                shapeType: 'circle',
                x: 540,
                y: 540,
                width: 800,
                height: 800,
                fill: 'transparent',
                stroke: '#D4AF37', // Gold 
                strokeWidth: 2,
                opacity: 0.3,
                isLocked: true,
                zIndex: 1
            },
            {
                id: 'hero-product-placeholder',
                type: 'shape',
                shapeType: 'rect',
                x: 340,
                y: 200,
                width: 400,
                height: 500,
                fill: 'rgba(212,175,55,0.1)',
                cornerRadius: 200, // pill shape
                zIndex: 5
            },
            {
                id: 'headline',
                type: 'text',
                x: 100,
                y: 750,
                width: 880,
                text: 'NOVA COLEÇÃO',
                fontSize: 64,
                fontFamily: 'Outfit',
                fontStyle: 'normal',
                fill: '#D4AF37',
                align: 'center',
                zIndex: 10
            },
            {
                id: 'subheadline',
                type: 'text',
                x: 140,
                y: 840,
                width: 800,
                text: 'A redefinição do luxo.',
                fontSize: 24,
                fontFamily: 'Outfit',
                fontStyle: 'normal',
                fill: '#FFFFFF',
                align: 'center',
                opacity: 0.7,
                zIndex: 10
            },
            {
                id: 'cta-button',
                type: 'shape',
                shapeType: 'rect',
                x: 390,
                y: 920,
                width: 300,
                height: 60,
                cornerRadius: 0,
                fill: 'transparent',
                stroke: '#D4AF37',
                strokeWidth: 1,
                zIndex: 10
            },
            {
                id: 'cta-text',
                type: 'text',
                x: 390,
                y: 940,
                width: 300,
                text: 'EXPLORAR',
                fontSize: 16,
                fontFamily: 'Outfit',
                fontStyle: 'normal',
                fill: '#D4AF37',
                align: 'center',
                zIndex: 11
            }
        ]
    },
    'tech': {
        id: 'tech',
        name: 'Cyber / Tech',
        width: 1080,
        height: 1080,
        background: {
            type: 'gradient',
            gradientSteps: [
                { offset: 0, color: '#0F172A' },
                { offset: 1, color: '#312E81' }
            ]
        },
        elements: [
            {
                id: 'hero-product-placeholder',
                type: 'shape',
                shapeType: 'rect',
                x: 140,
                y: 350,
                width: 800,
                height: 450,
                fill: 'rgba(56,189,248,0.1)',
                cornerRadius: 12,
                stroke: '#38BDF8',
                strokeWidth: 2,
                zIndex: 5,
                shadowColor: '#38BDF8',
                shadowBlur: 30
            },
            {
                id: 'headline',
                type: 'text',
                x: 80,
                y: 120,
                width: 920,
                text: 'O FUTURO\nÉ AGORA',
                fontSize: 110,
                fontFamily: 'Inter',
                fontStyle: 'bold',
                fill: '#F8FAFC',
                align: 'left',
                shadowColor: '#38BDF8',
                shadowBlur: 20,
                zIndex: 10
            },
            {
                id: 'cta-button',
                type: 'shape',
                shapeType: 'rect',
                x: 80,
                y: 860,
                width: 350,
                height: 80,
                cornerRadius: 8,
                fill: '#38BDF8',
                zIndex: 10
            },
            {
                id: 'cta-text',
                type: 'text',
                x: 80,
                y: 885,
                width: 350,
                text: 'UPGRADE JÁ',
                fontSize: 24,
                fontFamily: 'Inter',
                fontStyle: 'bold',
                fill: '#0F172A',
                align: 'center',
                zIndex: 11
            }
        ]
    }
};
