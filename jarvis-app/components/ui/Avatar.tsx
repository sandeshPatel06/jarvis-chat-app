import React, { useState, useEffect } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, Text } from 'react-native';
import { getMediaUrl } from '@/utils/media';

interface AvatarProps {
    source: string | null | undefined;
    size?: number;
    style?: StyleProp<ImageStyle>;
    online?: boolean;
    name?: string; // For fallback initials if no image
}

export const Avatar = ({ source, size = 50, style, online, name }: AvatarProps) => {
    const [imageError, setImageError] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        setImageError(false);
        const url = getMediaUrl(source);
        setImageUrl(url);
    }, [source]);

    const handleImageError = () => {
        setImageError(true);
    };

    const borderRadius = size / 2;

    return (
        <View style={[styles.container, { width: size, height: size }, style]}>
            <Image
                source={
                    !imageError && imageUrl
                        ? { uri: imageUrl }
                        : require('@/assets/images/default-avatar.png')
                }
                style={[
                    styles.image,
                    {
                        width: size,
                        height: size,
                        borderRadius: borderRadius,
                    }
                ]}
                onError={handleImageError}
            />
            {online && (
                <View
                    style={[
                        styles.onlineIndicator,
                        {
                            width: size * 0.26,
                            height: size * 0.26,
                            borderRadius: (size * 0.26) / 2,
                            bottom: 2,
                            right: 2,
                        }
                    ]}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    image: {
        backgroundColor: '#e1e1e1',
    },
    onlineIndicator: {
        position: 'absolute',
        backgroundColor: '#4ade80',
        borderWidth: 2,
        borderColor: 'white', // Should be dynamic based on theme, but for now white/card color
    },
});
