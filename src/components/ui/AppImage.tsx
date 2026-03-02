'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface AppImageProps {
    src: string | null | undefined;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    priority?: boolean;
    quality?: number;
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
    fill?: boolean;
    sizes?: string;
    onClick?: () => void;
    fallbackSrc?: string;
    [key: string]: any;
}

function AppImage({
    src,
    alt,
    width,
    height,
    className = '',
    priority = false,
    quality = 75,
    placeholder = 'empty',
    blurDataURL,
    fill = false,
    sizes,
    onClick,
    fallbackSrc = 'https://picsum.photos/seed/error/600/400',
    ...props
}: AppImageProps) {
    // Ensure src is never an empty string
    const initialSrc = src === '' || !src ? fallbackSrc : src;
    const [imageSrc, setImageSrc] = useState(initialSrc);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const nextSrc = src === '' || !src ? fallbackSrc : src;
        setImageSrc(nextSrc);
        setHasError(false);
        setIsLoading(true);
    }, [src, fallbackSrc]);

    const handleError = () => {
        if (!hasError && imageSrc !== fallbackSrc) {
            setImageSrc(fallbackSrc);
            setHasError(true);
        }
        setIsLoading(false);
    };

    const handleLoad = () => {
        setIsLoading(false);
        setHasError(false);
    };

    const commonClassName = `${className} ${isLoading ? 'bg-muted animate-pulse' : ''} ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`;

    // Detection for external vs local
    const isExternal = typeof imageSrc === 'string' && (imageSrc.startsWith('http://') || imageSrc.startsWith('https://'));
    const isLocal = typeof imageSrc === 'string' && (imageSrc.startsWith('/') || imageSrc.startsWith('./') || imageSrc.startsWith('data:'));

    // If src is still somehow empty or null after effect, don't render to avoid crash
    if (!imageSrc) return null;

    if (isExternal && !isLocal) {
        const imgStyle: React.CSSProperties = {};
        if (width) imgStyle.width = width;
        if (height) imgStyle.height = height;

        if (fill) {
            return (
                <div className={`relative ${className}`} style={{ width: width || '100%', height: height || '100%' }}>
                    <img
                        src={imageSrc}
                        alt={alt}
                        className={`${commonClassName} absolute inset-0 w-full h-full object-cover`}
                        onError={handleError}
                        onLoad={handleLoad}
                        onClick={onClick}
                        style={imgStyle}
                        {...props}
                    />
                </div>
            );
        }

        return (
            <img
                src={imageSrc}
                alt={alt}
                className={commonClassName}
                onError={handleError}
                onLoad={handleLoad}
                onClick={onClick}
                style={imgStyle}
                {...props}
            />
        );
    }

    const imageProps = {
        src: imageSrc,
        alt,
        className: commonClassName,
        priority,
        quality,
        placeholder,
        blurDataURL,
        unoptimized: true,
        onError: handleError,
        onLoad: handleLoad,
        onClick,
        ...props,
    };

    if (fill) {
        return (
            <div className={`relative ${className}`}>
                <Image
                    {...imageProps}
                    fill
                    sizes={sizes || '100vw'}
                    style={{ objectFit: 'cover' }}
                />
            </div>
        );
    }

    return (
        <Image
            {...imageProps}
            width={width || 400}
            height={height || 300}
        />
    );
}

export default AppImage;
