import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';
import { api } from '@/services/api';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import { useRouter, Stack } from 'expo-router';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, TouchableOpacity, View, Text, Linking, AppState } from 'react-native';
import { formatLastSeen } from '@/utils/date';
import { Avatar } from '@/components/ui/Avatar';
import { LinearGradient } from 'expo-linear-gradient';

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
    const token = useStore((state: any) => state.token);
    const showAlert = useStore((state: any) => state.showAlert);
    const { colors, isDark } = useAppTheme();
    const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const normalizePhone = useCallback((phone: string): string => {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.length > 10) {
            cleaned = cleaned.slice(-10);
        }
        return cleaned;
    }, []);

    const loadContacts = useCallback(async () => {
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            setPermissionStatus(status as any);

            if (status !== 'granted') {
                setLoading(false);
                return;
            }

            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
            });

            if (data.length === 0) {
                setLoading(false);
                return;
            }

            // Extract and normalize all unique phone numbers
            const allPhones = data
                .flatMap(contact => (contact.phoneNumbers || []).map(p => normalizePhone(p.number || '')))
                .filter(Boolean);

            const uniquePhoneNumbers = Array.from(new Set(allPhones));

            // Check which contacts have Jarvis accounts
            let jarvisUsers: any[] = [];
            if (token && uniquePhoneNumbers.length > 0) {
                try {
                    jarvisUsers = await api.chat.checkContacts(token, uniquePhoneNumbers);
                } catch (error) {
                    console.error('Failed to check Jarvis users:', error);
                }
            }

            // Map contacts with Jarvis account status and deduplicate
            const contactMap = new Map<string, Contact>();

            data.forEach(contact => {
                if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) return;

                // Search for a match in all numbers of this contact
                const matchedJarvisUser = jarvisUsers.find((u: any) => {
                    const userPhone = normalizePhone(u.phone_number || '');
                    return (contact.phoneNumbers || []).some(p => normalizePhone(p.number || '') === userPhone);
                });

                const primaryPhone = contact.phoneNumbers[0].number || '';

                if (matchedJarvisUser) {
                    const jid = matchedJarvisUser.id.toString();
                    if (!contactMap.has(`jarvis_${jid}`)) {
                        contactMap.set(`jarvis_${jid}`, {
                            id: jid,
                            username: matchedJarvisUser.username,
                            phone: primaryPhone,
                            has_account: true,
                            profile_picture: matchedJarvisUser.profile_picture,
                            bio: matchedJarvisUser.bio,
                            is_online: matchedJarvisUser.is_online || false,
                            last_seen: matchedJarvisUser.last_seen,
                        });
                    }
                } else {
                    if (!contactMap.has(`contact_${contact.id}`)) {
                        contactMap.set(`contact_${contact.id}`, {
                            id: contact.id,
                            username: contact.name || 'Unknown',
                            phone: primaryPhone,
                            has_account: false,
                        });
                    }
                }
            });

            const dedupedList = Array.from(contactMap.values());
            
            // Sort: Jarvis users first, then alphabetically by name
            dedupedList.sort((a, b) => {
                if (a.has_account && !b.has_account) return -1;
                if (!a.has_account && b.has_account) return 1;
                return a.username.localeCompare(b.username);
            });

            setContacts(dedupedList);
        } catch (error) {
            console.error('Error loading contacts:', error);
        } finally {
            setLoading(false);
        }
    }, [token, normalizePhone]);

    useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && permissionStatus === 'denied') {
                loadContacts();
            }
        });
        return () => subscription.remove();
    }, [loadContacts, permissionStatus]);

    const handleOpenSettings = async () => {
        try {
            await Linking.openSettings();
        } catch (err) {
            showAlert('Error', 'Could not open settings. Please enable manually.');
        }
    };

    const handleSelectContact = useCallback(async (contact: Contact) => {
        if (!token || !contact.has_account) return;

        // Try to find an existing 1-1 chat with this user
        const existingChat = useStore.getState().chats.find(chat => 
            (chat.user_id && String(chat.user_id) === String(contact.id)) || 
            (chat.phoneNumber && contact.phone && normalizePhone(chat.phoneNumber) === normalizePhone(contact.phone))
        );

        if (existingChat) {
            router.replace(`/chat/${existingChat.id}`);
            return;
        }

        try {
            setLoading(true);
            const conversation = await api.chat.createConversation(token, contact.username);
            
            // Fetch chats to ensure it's in the store
            await useStore.getState().fetchChats();
            
            router.replace(`/chat/${conversation.id}`);
        } catch (error) {
            console.error(error);
            showAlert('Error', 'Failed to start chat');
        } finally {
            setLoading(false);
        }
    }, [token, router, showAlert, normalizePhone]);

    const handleInvite = async (contact: Contact) => {
        try {
            const isAvailable = await SMS.isAvailableAsync();
            if (!isAvailable) {
                showAlert('SMS Not Available', 'SMS is not available on this device');
                return;
            }

            const appLink = process.env.EXPO_PUBLIC_APP_DOWNLOAD_LINK || 'https://jarvis-chat.app/download';
            const message = `Hey! Join me on Jarvis Chat - an amazing messaging app! Download it here: ${appLink}`;

            const phoneNumbers = contact.phone ? [contact.phone] : [];
            await SMS.sendSMSAsync(phoneNumbers, message);
        } catch (error) {
            console.error('SMS invite error:', error);
            showAlert('Error', 'Failed to send invite');
        }
    };

    const filteredContacts = useMemo(() => {
        const query = searchQuery.toLowerCase();
        if (!query) return contacts;
        return contacts.filter(c => {
            const nameMatch = c.username.toLowerCase().includes(query);
            const phoneMatch = c.phone ? c.phone.toLowerCase().includes(query) : false;
            return nameMatch || phoneMatch;
        });
    }, [contacts, searchQuery]);

    if (loading) {
        return (
            <ScreenWrapper style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <FontAwesome name="arrow-left" size={18} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>New Chat</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={18} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>New Chat</Text>
                <View style={{ width: 40 }} />
            </View>

            {permissionStatus === 'denied' ? (
                <View style={styles.emptyContainer}>
                    <View style={[styles.permissionIconContainer, { backgroundColor: colors.card }]}>
                        <MaterialCommunityIcons name="contacts" size={48} color={colors.primary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>Contacts Permission Required</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        Enable contacts permission in your device settings to find friends who are already on Jarvis Chat.
                    </Text>
                    <TouchableOpacity activeOpacity={0.85} onPress={handleOpenSettings}>
                        <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            style={styles.permissionButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.permissionButtonText}>Open Settings</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <View style={[styles.searchInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search contacts..."
                                placeholderTextColor={colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.8}>
                                    <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {filteredContacts.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <FontAwesome name="users" size={54} color={colors.textSecondary} style={{ opacity: 0.25, marginBottom: 16 }} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                {searchQuery ? 'No contacts found' : 'No contacts yet'}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredContacts}
                            keyExtractor={(item) => (item.has_account ? `jarvis_${item.id}` : `contact_${item.id}`)}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            ItemSeparatorComponent={() => (
                                <View style={[
                                    styles.separator,
                                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }
                                ]} />
                            )}
                            renderItem={({ item }) => {
                                const hasJarvisAccount = item.has_account === true;

                                return (
                                    <View style={styles.contactItem}>
                                        <View style={styles.avatarWrapper}>
                                            <Avatar
                                                source={item.profile_picture}
                                                size={52}
                                                online={item.is_online && hasJarvisAccount}
                                                style={styles.avatar}
                                            />
                                        </View>
                                        
                                        <View style={styles.contactInfo}>
                                            <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>
                                                {item.username}
                                            </Text>
                                            <Text style={[styles.contactBio, { color: colors.textSecondary }]} numberOfLines={1}>
                                                {hasJarvisAccount
                                                    ? (item.is_online ? 'Online' : formatLastSeen(item.last_seen))
                                                    : (item.phone || 'No phone number')}
                                            </Text>
                                        </View>

                                        <View style={styles.actionContainer}>
                                            {hasJarvisAccount ? (
                                                <TouchableOpacity
                                                    onPress={() => handleSelectContact(item)}
                                                    activeOpacity={0.8}
                                                >
                                                    <LinearGradient
                                                        colors={[colors.primary, colors.secondary]}
                                                        style={styles.chatAction}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 1 }}
                                                    >
                                                        <MaterialCommunityIcons name="message-text" size={18} color="#fff" />
                                                    </LinearGradient>
                                                </TouchableOpacity>
                                            ) : (
                                                <TouchableOpacity
                                                    onPress={() => handleInvite(item)}
                                                    activeOpacity={0.8}
                                                >
                                                    <View style={[styles.chatAction, { backgroundColor: colors.primary + '15' }]}>
                                                        <MaterialCommunityIcons name="account-plus-outline" size={18} color={colors.primary} />
                                                    </View>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    )}
                </>
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
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
        height: 60,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    searchContainer: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 12,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 44,
        borderRadius: 16,
        borderWidth: 1,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        paddingVertical: 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        textAlign: 'center',
        opacity: 0.6,
    },
    listContent: {
        paddingHorizontal: 12,
        paddingTop: 4,
        paddingBottom: 40,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    separator: {
        height: 1,
        marginHorizontal: 24,
        marginVertical: 2,
    },
    avatarWrapper: {
        marginRight: 14,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    contactInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    contactName: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    contactBio: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 3,
        opacity: 0.7,
    },
    actionContainer: {
        marginLeft: 10,
    },
    chatAction: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    // Permission styling
    permissionIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
        paddingHorizontal: 10,
    },
    permissionButton: {
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    permissionButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '700',
    },
});
