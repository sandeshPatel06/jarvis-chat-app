import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, Animated } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Chat } from '@/types';
import { useStore } from '@/store';
import { useRouter } from 'expo-router';
import { formatLastSeen } from '@/utils/date';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { BlurView } from 'expo-blur';

interface ChatHeaderProps {
    chat: Chat;
    typingUser: string | null;
    onOptionsPress: () => void;
    onPinnedPress: () => void;
    onSMSPress?: () => void;
    style?: ViewStyle;
}

export const ChatHeader = ({ chat, typingUser, onOptionsPress, onPinnedPress, onSMSPress, style }: ChatHeaderProps) => {
    const { colors, theme } = useAppTheme();
    const router = useRouter();
    const startCall = useStore((state) => state.startCall);
    const insets = useSafeAreaInsets();

    const handleVideoCall = () => {
        startCall(chat.id, true);
        router.push(`/call/${chat.id}`);
    };

    const handleAudioCall = () => {
        startCall(chat.id, false);
        router.push(`/call/${chat.id}`);
    };

    return (
        <BlurView
            intensity={theme === 'dark' ? 30 : 60}
            tint={theme === 'dark' ? 'dark' : 'light'}
            style={[
                styles.headerContainer,
                { paddingTop: insets.top + 8 },
                style
            ]}
        >
            <View style={styles.headerContent}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <FontAwesome
                        name="chevron-left"
                        size={18}
                        color={colors.primary}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.profileContainer}
                    activeOpacity={0.7}
                    onPress={() => {
                        const profileId = chat.user_id || (typeof chat.id === 'number' ? chat.id : null);
                        if (profileId) {
                            router.push(`/user/${profileId}`);
                        }
                    }}
                >
                    <View style={styles.avatarWrapper}>
                        <Avatar
                            source={chat.avatar}
                            size={40}
                            style={styles.headerAvatar}
                        />
                        {chat.is_online && (
                            <View style={[styles.onlineIndicator, { borderColor: colors.background }]} />
                        )}
                    </View>

                    <View style={styles.headerInfo}>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.headerName,
                                { color: colors.text },
                            ]}
                        >
                            {chat.name}
                        </Text>
                        <Text
                            style={[
                                styles.headerStatus,
                                { color: typingUser ? colors.primary : colors.tabIconDefault },
                            ]}
                        >
                            {typingUser
                                ? 'typing...'
                                : chat.is_online
                                    ? 'Online'
                                    : formatLastSeen(chat.last_seen)}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.actionsContainer}>
                    <TouchableOpacity 
                        onPress={handleAudioCall} 
                        style={[styles.iconButton, { backgroundColor: `${colors.primary}15` }]}
                    >
                        <MaterialCommunityIcons name="phone" size={20} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={handleVideoCall} 
                        style={[styles.iconButton, { backgroundColor: `${colors.primary}15`, marginHorizontal: 6 }]}
                    >
                        <MaterialCommunityIcons name="video" size={20} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={onPinnedPress} 
                        style={[styles.iconButton, { backgroundColor: `${colors.secondary}10` }]}
                    >
                        <MaterialCommunityIcons name="pin-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={onOptionsPress} 
                        style={[styles.iconButton, { marginLeft: 6 }]}
                    >
                        <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>
        </BlurView>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(150,150,150,0.1)',
        overflow: 'hidden',
        zIndex: 100,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 10,
    },
    backButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarWrapper: {
        position: 'relative',
    },
    headerAvatar: {
        borderRadius: 20,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
    },
    headerInfo: {
        marginLeft: 10,
        justifyContent: 'center',
    },
    headerName: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: -0.2,
    },
    headerStatus: {
        fontSize: 11,
        marginTop: 1,
        fontWeight: '500',
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
