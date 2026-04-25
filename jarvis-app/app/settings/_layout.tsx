import { Stack } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function SettingsLayout() {
    const { colors } = useAppTheme();

    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerStyle: {
                    backgroundColor: colors.background,
                },
                headerTintColor: colors.text,
                headerTitleStyle: {
                    fontWeight: '800',
                },
                headerShadowVisible: false,
                headerBackTitleVisible: false,
            }}
        />
    );
}
