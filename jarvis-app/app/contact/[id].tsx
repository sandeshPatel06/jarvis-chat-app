import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function ContactProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>(); // This is Chat ID
    const router = useRouter();
    const chats = useStore((state) => state.chats);
    const chat = chats.find((c) => c.id === id);

    const { colors } = useAppTheme();

    if (!chat) {
        return (
            <ScreenWrapper style={styles.container}>
                <Text style={{ color: colors.text }}>Contact not found</Text>
            </ScreenWrapper>
        );
    }

    // Mock data if not available in chat object
    const phoneNumber = '+1 234 567 890';
    const bio = 'Available';

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header with Back Button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileSection}>
                    <Image
                        source={chat.avatar ? { uri: chat.avatar } : require('@/assets/images/default-avatar.png')}
                        style={styles.avatar}
                    />
                    <Text style={[styles.name, { color: colors.text }]}>{chat.name}</Text>
                    <Text style={[styles.number, { color: colors.text }]}>{phoneNumber}</Text>
                </View>

                {/* Actions Row */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.inputBackground }]} onPress={() => router.back()}>
                        <FontAwesome name="comment" size={24} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Message</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.inputBackground }]}>
                        <FontAwesome name="phone" size={24} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Audio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.inputBackground }]}>
                        <FontAwesome name="video-camera" size={24} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Video</Text>
                    </TouchableOpacity>
                </View>

                {/* Info Section */}
                <View style={[styles.section, { backgroundColor: colors.inputBackground }]}>
                    <View style={styles.item}>
                        <Text style={[styles.label, { color: colors.text }]}>About</Text>
                        <Text style={[styles.value, { color: colors.text }]}>{bio}</Text>
                    </View>
                    <View style={[styles.separator, { backgroundColor: colors.itemSeparator }]} />
                    <View style={styles.item}>
                        <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
                        <Text style={[styles.value, { color: colors.text }]}>{phoneNumber}</Text>
                        <Text style={styles.subValue}>Mobile</Text>
                    </View>
                </View>

                {/* Operations */}
                <View style={[styles.section, { backgroundColor: colors.inputBackground }]}>
                    <TouchableOpacity style={styles.item}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <FontAwesome name="ban" size={20} color="#ff4444" style={{ marginRight: 15 }} />
                            <Text style={{ color: '#ff4444', fontSize: 16 }}>Block {chat.name}</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={[styles.separator, { backgroundColor: colors.itemSeparator }]} />
                    <TouchableOpacity style={styles.item}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <FontAwesome name="thumbs-down" size={20} color="#ff4444" style={{ marginRight: 15 }} />
                            <Text style={{ color: '#ff4444', fontSize: 16 }}>Report {chat.name}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    profileSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 15,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    number: {
        fontSize: 16,
        opacity: 0.6,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    actionButton: {
        width: 100,
        paddingVertical: 15,
        borderRadius: 15,
        alignItems: 'center',
        gap: 5,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        marginHorizontal: 15,
        borderRadius: 15,
        marginBottom: 20,
        overflow: 'hidden',
    },
    item: {
        padding: 15,
    },
    label: {
        fontSize: 14,
        opacity: 0.7,
        marginBottom: 5,
    },
    value: {
        fontSize: 16,
        fontWeight: '500',
    },
    subValue: {
        fontSize: 12,
        color: 'gray',
        marginTop: 2,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 15,
    }
});
