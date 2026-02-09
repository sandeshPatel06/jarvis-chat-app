import Colors from '@/constants/Colors';
import { useStore } from '@/store';
import { useColorScheme } from 'react-native';

export function useAppTheme() {
    const { theme: userTheme } = useStore();
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
