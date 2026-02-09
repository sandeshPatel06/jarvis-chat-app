import { useAppTheme } from '@/hooks/useAppTheme';
import React, { useEffect } from 'react';
import { ViewStyle, View, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store';

// setLayoutAnimationEnabledExperimental is needed for some older Android devices/versions
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

interface ScreenWrapperProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    edges?: Edge[];
    backgroundColor?: string;
    withExtraTopPadding?: boolean;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
    children,
    style,
    edges = ['top', 'left', 'right', 'bottom'], // Default to all edges
    backgroundColor,
    withExtraTopPadding = true
}) => {
    const insets = useSafeAreaInsets();
    const { colors } = useAppTheme();
    const animationsEnabled = useStore((state) => state.animationsEnabled);

    useEffect(() => {
        if (animationsEnabled) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
    }, [animationsEnabled]);

    // Calculate padding based on edges
    const totalTopPadding = (edges.includes('top') ? insets.top : 0) + (withExtraTopPadding ? 40 : 0);

    const containerStyle: ViewStyle = {
        flex: 1,
        backgroundColor: backgroundColor || colors.background,
        paddingTop: totalTopPadding,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        paddingLeft: edges.includes('left') ? insets.left : 0,
        paddingRight: edges.includes('right') ? insets.right : 0,
    };

    return (
        <View style={[containerStyle, style]}>
            {children}
        </View>
    );
};


