import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Text, Rect, Circle, Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';
import type { CanvasTemplate, CanvasElement } from './types';

interface StudioCanvasProps {
    template: CanvasTemplate;
    containerWidth: number;
    productImage?: string | null;
    selectedElementId?: string | null;
    onChange?: (newElements: CanvasElement[]) => void;
    onElementClick?: (id: string, text?: string) => void;
    onTextUpdate?: (id: string, newText: string) => void;
    onDeselect?: () => void;
}

export function StudioCanvas({
    template,
    containerWidth,
    productImage,
    selectedElementId,
    onChange,
    onElementClick,
    onTextUpdate,
    onDeselect
}: StudioCanvasProps) {
    const stageRef = useRef<any>(null);
    const trRef = useRef<any>(null);
    const [elements, setElements] = useState<CanvasElement[]>(template.elements);
    const scale = containerWidth / template.width;

    // Custom hook to load external images
    const [loadedProductImg] = useImage(productImage || '');
    const [bgImage] = useImage(template.background.src || '');

    useEffect(() => {
        // Sync external props with internal state
        setElements(template.elements);
    }, [template.elements]);

    useEffect(() => {
        if (selectedElementId && trRef.current) {
            // we need to attach transformer manually
            const node = stageRef.current.findOne(`#${selectedElementId}`);
            if (node) {
                trRef.current.nodes([node]);
                trRef.current.getLayer().batchDraw();
            }
        }
    }, [selectedElementId, elements]);

    const handleDragEnd = (e: any, id: string) => {
        const updated = elements.map(el => {
            if (el.id === id) {
                return {
                    ...el,
                    x: e.target.x(),
                    y: e.target.y(),
                };
            }
            return el;
        });
        setElements(updated);
        onChange?.(updated);
    };

    const handleTransformEnd = (e: any, id: string) => {
        const node = stageRef.current.findOne(`#${id}`);
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        node.scaleX(1);
        node.scaleY(1);

        const updated = elements.map(el => {
            if (el.id === id) {
                return {
                    ...el,
                    x: node.x(),
                    y: node.y(),
                    rotation: node.rotation(),
                    width: Math.max(5, (el.width || 0) * scaleX),
                    height: Math.max(5, (el.height || 0) * scaleY),
                };
            }
            return el;
        });
        setElements(updated);
        onChange?.(updated);
    };

    const handleClick = (e: any, element: CanvasElement) => {
        e.cancelBubble = true; // prevent deselect
        if (element.isLocked) return;
        if (onElementClick) {
            onElementClick(element.id, element.text);
        }
    };

    const checkDeselect = (e: any) => {
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty && onDeselect) {
            onDeselect();
        }
    };

    return (
        <div className="bg-muted/30 rounded-lg overflow-hidden border flex items-center justify-center">
            <Stage
                ref={stageRef}
                width={template.width * scale}
                height={template.height * scale}
                scaleX={scale}
                scaleY={scale}
                onMouseDown={checkDeselect}
                onTouchStart={checkDeselect}
            >
                <Layer>
                    {/* Background */}
                    {template.background.type === 'gradient' && template.background.gradientSteps && (
                        <Rect
                            x={0}
                            y={0}
                            width={template.width}
                            height={template.height}
                            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                            fillLinearGradientEndPoint={{ x: template.width, y: template.height }}
                            fillLinearGradientColorStops={
                                template.background.gradientSteps.flatMap(step => [step.offset, step.color])
                            }
                        />
                    )}
                    {template.background.type === 'image' && bgImage && (
                        <KonvaImage
                            image={bgImage}
                            x={0}
                            y={0}
                            width={template.width}
                            height={template.height}
                        />
                    )}

                    {/* Render Elements by Z-Index */}
                    {[...elements]
                        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                        .map((el) => {

                            // 1. Shapes
                            if (el.type === 'shape') {
                                if (el.id === 'hero-product-placeholder' && productImage && loadedProductImg) {
                                    // Replace placeholder with the actual loaded image
                                    const imgAspect = loadedProductImg.width / loadedProductImg.height;
                                    const targetHeight = el.height || 600;
                                    const targetWidth = targetHeight * imgAspect;

                                    return (
                                        <KonvaImage
                                            key={el.id}
                                            id={el.id}
                                            image={loadedProductImg}
                                            x={el.x}
                                            y={el.y}
                                            width={targetWidth}
                                            height={targetHeight}
                                            draggable={!el.isLocked}
                                            onDragEnd={(e) => handleDragEnd(e, el.id)}
                                            onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                                            onClick={(e) => handleClick(e, el)}
                                            onTap={(e) => handleClick(e, el)}
                                        />
                                    );
                                }

                                if (el.shapeType === 'circle') {
                                    return (
                                        <Circle
                                            key={el.id}
                                            id={el.id}
                                            x={el.x}
                                            y={el.y}
                                            radius={(el.width || 100) / 2}
                                            fill={el.fill}
                                            opacity={el.opacity || 1}
                                            draggable={!el.isLocked}
                                            onDragEnd={(e) => handleDragEnd(e, el.id)}
                                            onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                                            onClick={(e) => handleClick(e, el)}
                                            onTap={(e) => handleClick(e, el)}
                                            shadowColor={el.shadowColor}
                                            shadowBlur={el.shadowBlur}
                                            shadowOffset={el.shadowOffset}
                                        />
                                    );
                                }

                                if (el.shapeType === 'rect') {
                                    return (
                                        <Rect
                                            key={el.id}
                                            id={el.id}
                                            x={el.x}
                                            y={el.y}
                                            width={el.width}
                                            height={el.height}
                                            fill={el.fill}
                                            cornerRadius={el.cornerRadius}
                                            opacity={el.opacity || 1}
                                            draggable={!el.isLocked}
                                            onDragEnd={(e) => handleDragEnd(e, el.id)}
                                            onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                                            onClick={(e) => handleClick(e, el)}
                                            onTap={(e) => handleClick(e, el)}
                                            shadowColor={el.shadowColor}
                                            shadowBlur={el.shadowBlur}
                                            shadowOffset={el.shadowOffset}
                                        />
                                    );
                                }
                            }

                            // 2. Texts
                            if (el.type === 'text') {
                                return (
                                    <Text
                                        key={el.id}
                                        id={el.id}
                                        x={el.x}
                                        y={el.y}
                                        width={el.width}
                                        text={el.text}
                                        fontSize={el.fontSize}
                                        fontFamily={el.fontFamily || 'sans-serif'}
                                        fontStyle={el.fontStyle || 'normal'}
                                        fill={el.fill}
                                        align={el.align}
                                        opacity={el.opacity || 1}
                                        draggable={!el.isLocked}
                                        onDragEnd={(e) => handleDragEnd(e, el.id)}
                                        onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                                        onClick={(e) => handleClick(e, el)}
                                        onTap={(e) => handleClick(e, el)}
                                        shadowColor={el.shadowColor}
                                        shadowBlur={el.shadowBlur}
                                        shadowOffset={el.shadowOffset}
                                    />
                                );
                            }

                            return null;
                        })}

                    {selectedElementId && (
                        <Transformer
                            ref={trRef}
                            boundBoxFunc={(oldBox, newBox) => {
                                // limit resize
                                if (newBox.width < 5 || newBox.height < 5) {
                                    return oldBox;
                                }
                                return newBox;
                            }}
                        />
                    )}
                </Layer>
            </Stage>
        </div>
    );
}
