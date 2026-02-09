import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAppTheme } from '@/hooks/useAppTheme';

interface SettingRowProps {
    title: string;
    subtitle?: string;
    value?: string;
    icon?: keyof typeof FontAwesome.glyphMap;
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
            !isLast && { borderBottomColor: colors.itemSeparator, borderBottomWidth: 0.5 }
        ]}>
            {icon && (
                <View style={[styles.iconBox, { backgroundColor: (color || colors.primary) + '15' }]}>
                    <FontAwesome name={icon} size={18} color={color || colors.primary} />
                </View>
            )}

            <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
                {subtitle && <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{subtitle}</Text>}
                {value && <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{value}</Text>}
            </View>

            {isSwitch ? (
                <Switch
                    value={switchValue}
                    onValueChange={onSwitchChange}
                    trackColor={{ false: isDark ? '#3A3A3C' : '#D1D1D6', true: colors.primary }}
                    thumbColor={Platform.OS === 'ios' ? undefined : 'white'}
                />
            ) : isSelected !== undefined ? (
                isSelected ? (
                    <FontAwesome name="check-circle" size={22} color={colors.primary} />
                ) : (
                    <View style={[styles.unselectedCircle, { borderColor: colors.tabIconDefault + '40' }]} />
                )
            ) : (
                showChevron && <FontAwesome name="chevron-right" size={14} color={colors.tabIconDefault} style={styles.chevron} />
            )}
        </View>
    );

    if (isSwitch || isSelected !== undefined) {
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={onPress}
                disabled={isSwitch && !onPress}
            >
                {Content}
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
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
        paddingHorizontal: 16,
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    rowMain: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    rowValue: {
        fontSize: 13,
        marginTop: 2,
        fontWeight: '500',
    },
    chevron: {
        opacity: 0.2,
        marginLeft: 8,
    },
    unselectedCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
    }
});

export default SettingRow;
