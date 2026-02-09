import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

interface SettingCardProps {
    children: React.ReactNode;
    style?: any;
}

const SettingCard = memo(({ children, style }: SettingCardProps) => {
    const { colors } = useAppTheme();

    return (
        <View style={[
            styles.card,
            {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                borderWidth: 1,
            },
            style
        ]}>
            {children}
        </View>
    );
});

SettingCard.displayName = 'SettingCard';

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        overflow: 'hidden',
    },
});

export default SettingCard;
