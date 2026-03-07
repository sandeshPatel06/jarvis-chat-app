import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useAppTheme } from '@/hooks/useAppTheme';
import { api } from '@/services/api';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import { useRouter, Stack } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { formatLastSeen } from '@/utils/date';
import { Avatar } from '@/components/ui/Avatar';

interface Contact {
    id: string;
    username: string;
    profile_picture?: string;
    bio?: string;
    is_online?: boolean;
    phone?: string;
    has_account?: boolean;
    last_seen?: string | Date;
}

export default function SelectContactScreen() {
    const router = useRouter();
    const token = useStore(useCallback((state: any) => state.token, []));
    const showAlert = useStore(useCallback((state: any) => state.showAlert, []));
    const { colors } = useAppTheme();
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');



    const loadContacts = useCallback(async () => {
        try {
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
            });

            if (data.length === 0) {
                setLoading(false);
                return;
            }

            // Helper function to normalize phone numbers (remove country codes, spaces, dashes, etc.)
            const normalizePhone = (phone: string): string => {
                // Remove all non-numeric characters
                let cleaned = phone.replace(/\D/g, '');
                // Remove common country codes (91 for India, 1 for US, etc.)
                // Keep last 10 digits for matching
                if (cleaned.length > 10) {
                    cleaned = cleaned.slice(-10);
                }
                return cleaned;
            };

            // Extract and normalize phone numbers
            const phoneNumbers = data
                .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
                .map(contact => normalizePhone(contact.phoneNumbers![0].number || ''));

            // Check which contacts have Jarvis accounts
            let jarvisUsers: any[] = [];
            if (token && phoneNumbers.length > 0) {
                try {
                    jarvisUsers = await api.chat.checkContacts(token, phoneNumbers);
                    console.log('[SelectContact] Jarvis users found:', jarvisUsers.length);
                } catch (error) {
                    console.error('Failed to check Jarvis users:', error);
                }
            }

            // Map contacts with Jarvis account status and deduplicate
            const contactMap = new Map<string, Contact>();

            data.forEach(contact => {
                if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) return;

                const phone = contact.phoneNumbers[0].number || '';
                const normalizedPhone = normalizePhone(phone);

                // Find matching Jarvis user by normalized phone number
                const jarvisUser = jarvisUsers.find((u: any) => {
                    const userPhone = normalizePhone(u.phone_number || '');
                    return userPhone === normalizedPhone;
                });

                if (jarvisUser) {
                    const jid = jarvisUser.id.toString();
                    // If we already have this Jarvis user (possible if multiple local contacts share a number), skip
                    if (!contactMap.has(jid)) {
                        contactMap.set(jid, {
                            id: jid,
                            username: jarvisUser.username,
                            phone: phone,
                            has_account: true,
                            profile_picture: jarvisUser.profile_picture,
                            bio: jarvisUser.bio,
                            is_online: jarvisUser.is_online || false,
                            last_seen: jarvisUser.last_seen,
                        });
                    }
                } else {
                    // Non-Jarvis contact - use device contact ID which is guaranteed unique by the system
                    // But wait, if two contacts in phonebook have same number but different names,
                    // they will have different contact.id. This is fine.
                    if (!contactMap.has(contact.id)) {
                        contactMap.set(contact.id, {
                            id: contact.id,
                            username: contact.name || 'Unknown',
                            phone: phone,
                            has_account: false,
                        });
                    }
                }
            });

            setContacts(Array.from(contactMap.values()));
        } catch (error) {
            console.error('Error loading contacts:', error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        (async () => {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status === 'granted') {
                setPermissionGranted(true);
                loadContacts();
            } else {
                setLoading(false);
            }
        })();
    }, [loadContacts]);

    const handleSelectContact = useCallback(async (contact: Contact) => {
        if (!token || !contact.has_account) return;

        const existingChat = useStore.getState().chats.find(chat => chat.name === contact.username);

        if (existingChat) {
            router.replace(`/chat/${existingChat.id}`);
            return;
        }

        try {
            setLoading(true);
            const conversation = await api.chat.createConversation(token, contact.username);
            await useStore.getState().fetchChats();
            router.replace(`/chat/${conversation.id}`);
        } catch (error) {
            console.error(error);
            showAlert('Error', 'Failed to start chat');
        } finally {
            setLoading(false);
        }
    }, [token, router, showAlert]);

    const handleInvite = async (contact: Contact) => {
        try {
            const isAvailable = await SMS.isAvailableAsync();
            if (!isAvailable) {
                showAlert('SMS Not Available', 'SMS is not available on this device');
                return;
            }

            const appLink = process.env.EXPO_PUBLIC_APP_DOWNLOAD_LINK || 'https://jarvis-chat.app/download';
            const message = `Hey! Join me on Jarvis Chat - an amazing messaging app! Download it here: ${appLink}`;

            // Auto-fill phone number if available
            const phoneNumbers = contact.phone ? [contact.phone] : [];
            await SMS.sendSMSAsync(phoneNumbers, message);
        } catch (error) {
            console.error('SMS invite error:', error);
            showAlert('Error', 'Failed to send invite');
        }
    };

    if (loading) {
        return (
            <ScreenWrapper style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!permissionGranted) {
        return (
            <ScreenWrapper style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <FontAwesome name="arrow-left" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>New Chat</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.emptyContainer}>
                    <FontAwesome name="address-book" size={60} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        Contacts permission is required to find people to chat with
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>New Chat</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <FontAwesome name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search contacts..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <FontAwesome name="times-circle" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {contacts.filter(c => c.username.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <View style={styles.emptyContainer}>
                    <FontAwesome name="users" size={60} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {searchQuery ? 'No contacts found' : 'No contacts yet'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={contacts.filter(c => c.username.toLowerCase().includes(searchQuery.toLowerCase()))}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                        const hasJarvisAccount = item.has_account === true;

                        return (
                            <View style={[styles.contactItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Avatar
                                    source={item.profile_picture}
                                    size={50}
                                    online={item.is_online && hasJarvisAccount}
                                    style={styles.avatar}
                                />
                                <View style={styles.contactInfo}>
                                    <Text style={[styles.contactName, { color: colors.text }]}>{item.username}</Text>
                                    <Text style={[styles.contactBio, { color: colors.textSecondary }]} numberOfLines={1}>
                                        {hasJarvisAccount
                                            ? (item.is_online
                                                ? 'Online'
                                                : formatLastSeen(item.last_seen))
                                            : (item.phone || 'No phone number')}
                                    </Text>
                                </View>
                                {item.is_online && hasJarvisAccount && (
                                    <View style={[styles.onlineIndicator, { backgroundColor: colors.success }]} />
                                )}

                                {hasJarvisAccount ? (
                                    // Show Chat button for Jarvis users
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: colors.primary }]}
                                        onPress={() => handleSelectContact(item)}
                                    >
                                        <MaterialCommunityIcons name="message" size={20} color="#fff" />
                                    </TouchableOpacity>
                                ) : (
                                    // Show Invite button for non-Jarvis users
                                    <TouchableOpacity
                                        style={[styles.inviteButton, { backgroundColor: colors.primary + '15' }]}
                                        onPress={() => handleInvite(item)}
                                    >
                                        <MaterialCommunityIcons name="message-text-outline" size={20} color={colors.primary} />
                                        <Text style={[styles.inviteText, { color: colors.primary }]}>Invite</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    }}
                    contentContainerStyle={styles.listContent}
                />
            )}
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
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderWidth: 1,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 20,
        textAlign: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    contactInfo: {
        flex: 1,
        marginLeft: 15,
    },
    contactName: {
        fontSize: 17,
        fontWeight: '600',
    },
    contactBio: {
        fontSize: 14,
        marginTop: 2,
    },
    onlineIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    actionButton: {
        width: 50,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inviteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 5,
    },
    inviteText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
