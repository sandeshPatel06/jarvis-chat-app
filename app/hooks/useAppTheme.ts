import Colors from '@/constants/Colors';
import { useStore } from '@/store';
import { useColorScheme } from 'react-native';

export function useAppTheme() {
    const userTheme = useStore((state) => state.theme);
    const systemScheme = useColorScheme();

    const effectiveTheme = userTheme === 'system'
        ? (systemScheme ?? 'light')
        : userTheme;

    return {
        theme: effectiveTheme,
        colors: Colors[effectiveTheme === 'dark' ? 'dark' : 'light'],
        isDark: effectiveTheme === 'dark' || (userTheme === 'system' && systemScheme === 'dark')
    };
}
