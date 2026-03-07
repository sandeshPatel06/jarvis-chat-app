import React, { useState, useCallback } from 'react';
import { Image, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
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
    const { colors, isDark } = useAppTheme();


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
        } catch (error: any) {
            console.error('Update error:', error);
            showToast('error', 'Update Failed', 'Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    }, [token, image, name, about, updateUser, showToast]);

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerRight}>
                    {saving ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>
                            Save
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.avatarContainer}>
                        <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.avatarWrapper}>
                            <View style={[styles.avatarBorder, { borderColor: isDark ? colors.cardBorder : colors.primary + '30' }]}>
                                {image ? (
                                    <Image
                                        source={{ uri: image }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <Avatar
                                        source={user?.profile_picture}
                                        size={140}
                                        style={styles.avatar}
                                    />
                                )}
                            </View>
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                style={[styles.cameraButton, { borderColor: isDark ? colors.background : 'white' }]}
                            >
                                <FontAwesome name="camera" size={16} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <SettingCard style={styles.card}>
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: colors.primary }]}>Username</Text>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary }]}>
                                <FontAwesome name="user" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Enter your name"
                                    placeholderTextColor={colors.textSecondary + '80'}
                                />
                            </View>
                            <Text style={[styles.hint, { color: colors.textSecondary }]}>This name will be visible to your contacts.</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.itemSeparator }]} />

                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: colors.primary }]}>About</Text>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary }]}>
                                <FontAwesome name="info-circle" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={about}
                                    onChangeText={setAbout}
                                    placeholder="Tell us about yourself"
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    multiline
                                />
                            </View>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.itemSeparator }]} />

                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: colors.primary }]}>Phone Number</Text>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary, opacity: 0.6 }]}>
                                <FontAwesome name="phone" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                <Text style={[styles.input, { color: colors.text }]}>{user?.phone_number || 'Not verified'}</Text>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 0.5,
    },
    backButton: {
        padding: 5,
        width: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        flex: 1,
        textAlign: 'center',
    },
    headerRight: {
        width: 40,
        alignItems: 'flex-end',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    avatarContainer: {
        alignItems: 'center',
        marginVertical: 40,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatarBorder: {
        padding: 4,
        borderRadius: 80,
        borderWidth: 2,
    },
    avatar: {
        width: 140,
        height: 140,
        borderRadius: 70,
    },
    cameraButton: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 40,
        height: 40,
        borderRadius: 20,
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
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    inputIcon: {
        marginRight: 12,
        opacity: 0.6,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        paddingVertical: 4,
    },
    hint: {
        fontSize: 12,
        marginTop: 8,
        marginLeft: 4,
        fontWeight: '500',
        opacity: 0.7,
    },
    divider: {
        height: 1,
        marginVertical: 24,
        opacity: 0.1,
    }
});
