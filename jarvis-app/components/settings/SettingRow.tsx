import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';

interface SettingRowProps {
    title: string;
    subtitle?: string;
    value?: string;
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
    color?: string;
    onPress?: () => void;
    isSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    isSelected?: boolean;
    isLast?: boolean;
    showChevron?: boolean;
}

const SettingRow = memo(({
    title,
    subtitle,
    value,
    icon,
    color,
    onPress,
    isSwitch,
    switchValue,
    onSwitchChange,
    isSelected,
    isLast,
    showChevron = true
}: SettingRowProps) => {
    const { colors, isDark } = useAppTheme();

    const Content = (
        <View style={[
            styles.row,
            !isLast && { borderBottomColor: colors.cardBorder, borderBottomWidth: 0.5 }
        ]}>
            {icon && (
                <View style={[styles.iconBox, { backgroundColor: (color || colors.primary) + '12' }]}>
                    <MaterialCommunityIcons name={icon} size={20} color={color || colors.primary} />
                </View>
            )}

            <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
                {(subtitle || value) && (
                    <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                        {subtitle || value}
                    </Text>
                )}
            </View>

            {isSwitch ? (
                <Switch
                    value={switchValue}
                    onValueChange={onSwitchChange}
                    trackColor={{ false: isDark ? '#3A3A3C' : '#D1D1D6', true: colors.primary }}
                    thumbColor={Platform.OS === 'ios' ? undefined : 'white'}
                />
            ) : isSelected !== undefined ? (
                <MaterialCommunityIcons 
                    name={isSelected ? "checkbox-marked-circle" : "circle-outline"} 
                    size={24} 
                    color={isSelected ? colors.primary : colors.textSecondary + '40'} 
                />
            ) : (
                showChevron && (
                    <MaterialCommunityIcons 
                        name="chevron-right" 
                        size={20} 
                        color={colors.textSecondary} 
                        style={styles.chevron} 
                    />
                )
            )}
        </View>
    );

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            disabled={isSwitch && !onPress}
            style={styles.touchable}
        >
            {Content}
        </TouchableOpacity>
    );
});

SettingRow.displayName = 'SettingRow';

const styles = StyleSheet.create({
    touchable: {
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    rowMain: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    rowValue: {
        fontSize: 13,
        marginTop: 3,
        fontWeight: '600',
    },
    chevron: {
        opacity: 0.4,
        marginLeft: 8,
    }
});

export default SettingRow;
