import React, { useState, useCallback } from 'react';
import { Image, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View, Text } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';
import { api } from '@/services/api';
import { useStore } from '@/store';
import SettingCard from '@/components/settings/SettingCard';
import { Avatar } from '@/components/ui/Avatar';

export default function ProfileScreen() {
    const router = useRouter();
    const user = useStore((state) => state.user);
    const token = useStore((state) => state.token);
    const updateUser = useStore((state) => state.updateUser);
    const showToast = useStore((state) => state.showToast);

    const [name, setName] = useState(user?.username || '');
    const [about, setAbout] = useState(user?.bio || 'Available');
    const [saving, setSaving] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const { colors } = useAppTheme();

    const pickImage = useCallback(async () => {
        const result = await import('expo-image-picker').then(m => m.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        }));

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    }, []);

    const handleSave = useCallback(async () => {
        if (!token) return;
        setSaving(true);
        try {
            let updatedUser;

            if (image) {
                const formData = new FormData();
                formData.append('username', name);
                formData.append('bio', about);

                const filename = image.split('/').pop();
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image`;

                formData.append('profile_picture', {
                    uri: image,
                    name: filename || 'profile.jpg',
                    type: type,
                } as any);

                updatedUser = await api.auth.updateProfile(token, formData);
            } else {
                updatedUser = await api.auth.updateProfile(token, {
                    username: name,
                    bio: about
                });
            }

            updateUser(updatedUser);
            showToast('success', 'Profile Updated', 'Your profile has been updated successfully');
            setImage(null);
            router.back();
        } catch (error: any) {
            console.error('Update error:', error);
            showToast('error', 'Update Failed', 'Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    }, [token, image, name, about, updateUser, showToast, router]);

    return (
        <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>
            <Stack.Screen 
                options={{
                    headerTitle: 'Edit Profile',
                    headerRight: () => (
                        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerRight}>
                            {saving ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>
                                    Save
                                </Text>
                            )}
                        </TouchableOpacity>
                    )
                }}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.avatarContainer}>
                        <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.avatarWrapper}>
                            <View style={[styles.avatarBorder, { borderColor: colors.cardBorder }]}>
                                {image ? (
                                    <Image
                                        source={{ uri: image }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <Avatar
                                        source={user?.profile_picture}
                                        size={130}
                                        style={styles.avatar}
                                    />
                                )}
                            </View>
                            <LinearGradient
                                colors={[colors.primary, colors.primary + 'CC']}
                                style={[styles.cameraButton, { borderColor: colors.card }]}
                            >
                                <MaterialCommunityIcons name="camera" size={20} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <SettingCard style={styles.card}>
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
                            <View style={[styles.inputContainer, { backgroundColor: colors.background + '80', borderColor: colors.cardBorder }]}>
                                <MaterialCommunityIcons name="account-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Enter your name"
                                    placeholderTextColor={colors.textSecondary + '60'}
                                />
                            </View>
                            <Text style={[styles.hint, { color: colors.textSecondary }]}>Visible to everyone you chat with.</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Bio / About</Text>
                            <View style={[styles.inputContainer, { backgroundColor: colors.background + '80', borderColor: colors.cardBorder, alignItems: 'flex-start', paddingTop: 14 }]}>
                                <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} style={[styles.inputIcon, { marginTop: 2 }]} />
                                <TextInput
                                    style={[styles.input, { color: colors.text, minHeight: 60 }]}
                                    value={about}
                                    onChangeText={setAbout}
                                    placeholder="Tell us about yourself"
                                    placeholderTextColor={colors.textSecondary + '60'}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
                            <View style={[styles.inputContainer, { backgroundColor: colors.background + '30', borderColor: colors.cardBorder, opacity: 0.7 }]}>
                                <MaterialCommunityIcons name="phone-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                <Text style={[styles.input, { color: colors.textSecondary }]}>{user?.phone_number || 'No phone number'}</Text>
                                <MaterialCommunityIcons name="lock-outline" size={16} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                            </View>
                        </View>
                    </SettingCard>
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerRight: {
        marginRight: 16,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    avatarContainer: {
        alignItems: 'center',
        marginVertical: 32,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatarBorder: {
        padding: 5,
        borderRadius: 44, // Squircle profile
        borderWidth: 1.5,
    },
    avatar: {
        width: 130,
        height: 130,
        borderRadius: 40,
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 44,
        height: 44,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
    },
    card: {
        padding: 24,
    },
    inputSection: {
        marginBottom: 0,
    },
    label: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 10,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
    },
    inputIcon: {
        marginRight: 14,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        paddingVertical: 2,
    },
    hint: {
        fontSize: 12,
        marginTop: 8,
        marginLeft: 4,
        fontWeight: '600',
        opacity: 0.5,
    },
    divider: {
        height: 1,
        marginVertical: 24,
    }
});
