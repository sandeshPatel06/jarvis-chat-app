import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';
import { StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, View, Text, Linking, AppState } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useStore } from '@/store';
import { api } from '@/services/api';
import { formatLastSeen } from '@/utils/date';
import { useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import * as Contacts from 'expo-contacts';
import { Avatar } from '@/components/ui/Avatar';
import { LinearGradient } from 'expo-linear-gradient';

interface Contact {
    id: string;
    username: string;
    profile_picture?: string;
    bio?: string;
    is_online?: boolean;
    phone?: string;
    has_account?: boolean; // true if user has Jarvis account, false if just a phone contact
    last_seen?: string | Date;
}

export default function PeopleScreen() {
    const { colors, isDark } = useAppTheme();
    const router = useRouter();
    const token = useStore((state) => state.token);
    const showAlert = useStore((state) => state.showAlert);
    
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
    const [searchQuery, setSearchQuery] = useState('');

    // Helper function to normalize phone numbers (remove country codes, spaces, dashes, etc.)
    const normalizePhone = useCallback((phone: string): string => {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.length > 10) {
            cleaned = cleaned.slice(-10);
        }
        return cleaned;
    }, []);

    const fetchContacts = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);

            // Check permissions
            const { status } = await Contacts.requestPermissionsAsync();
            setPermissionStatus(status as any);

            if (status !== 'granted') {
                setLoading(false);
                return;
            }

            // Get device contacts
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
            });

            if (data.length === 0) {
                setContacts([]);
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

            // Map contacts with Jarvis account status
            const mappedContacts: Contact[] = data
                .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
                .map(contact => {
                    // Search for a match in all numbers of this contact
                    const matchedJarvisUser = jarvisUsers.find((u: any) => {
                        const userPhone = normalizePhone(u.phone_number || '');
                        return (contact.phoneNumbers || []).some(p => normalizePhone(p.number || '') === userPhone);
                    });

                    const primaryPhone = contact.phoneNumbers![0].number || '';

                    if (matchedJarvisUser) {
                        return {
                            id: matchedJarvisUser.id.toString(),
                            username: matchedJarvisUser.username,
                            phone: primaryPhone,
                            has_account: true,
                            profile_picture: matchedJarvisUser.profile_picture,
                            bio: matchedJarvisUser.bio,
                            is_online: matchedJarvisUser.is_online || false,
                            last_seen: matchedJarvisUser.last_seen,
                        };
                    } else {
                        return {
                            id: contact.id,
                            username: contact.name || 'Unknown',
                            phone: primaryPhone,
                            has_account: false,
                        };
                    }
                });

            // Deduplicate contacts by ID & type
            const seen = new Set<string>();
            const dedupedContacts = mappedContacts.filter(c => {
                const key = c.has_account ? `jarvis_${c.id}` : `contact_${c.id}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            // Sort: Jarvis users first, then alphabetically by name
            dedupedContacts.sort((a, b) => {
                if (a.has_account && !b.has_account) return -1;
                if (!a.has_account && b.has_account) return 1;
                return a.username.localeCompare(b.username);
            });

            setContacts(dedupedContacts);
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
            showAlert('Error', 'Failed to load contacts');
        } finally {
            setLoading(false);
        }
    }, [token, showAlert, normalizePhone]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && permissionStatus === 'denied') {
                fetchContacts();
            }
        });
        return () => subscription.remove();
    }, [fetchContacts, permissionStatus]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchContacts(true);
        setRefreshing(false);
    };

    const handleOpenSettings = async () => {
        try {
            await Linking.openSettings();
        } catch {
            showAlert('Error', 'Could not open settings. Please enable manually.');
        }
    };

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

    const fetchChats = useStore(useCallback((state: any) => state.fetchChats, []));
    const chats = useStore(useCallback((state: any) => state.chats, []));

    const handleChatWithContact = async (contact: Contact) => {
        try {
            // Find existing conversation using user_id or phone matching to avoid duplicate conversations
            const existingChat = chats.find((c: any) => 
                (c.user_id && String(c.user_id) === String(contact.id)) ||
                (c.phoneNumber && contact.phone && normalizePhone(c.phoneNumber) === normalizePhone(contact.phone))
            );
            
            if (existingChat) {
                router.push(`/chat/${existingChat.id}`);
                return;
            }

            if (!token) return;
            
            setLoading(true);
            const newChat = await api.chat.createConversation(token, contact.username);
            
            // Refresh chats
            await fetchChats();
            
            router.push(`/chat/${newChat.id}`);
        } catch (error) {
            console.error('Failed to handle chat with contact:', error);
            showAlert('Error', 'Could not open conversation. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const filteredContacts = useMemo(() => {
        const query = searchQuery.toLowerCase();
        if (!query) return contacts;
        return contacts.filter((contact) => {
            const nameMatch = contact.username.toLowerCase().includes(query);
            const phoneMatch = contact.phone ? contact.phone.includes(query) : false;
            return nameMatch || phoneMatch;
        });
    }, [contacts, searchQuery]);

    const renderContact = ({ item }: { item: Contact }) => {
        const hasJarvisAccount = item.has_account === true;

        return (
            <TouchableOpacity
                activeOpacity={hasJarvisAccount ? 0.6 : 1}
                style={styles.contactItem}
                onPress={() => hasJarvisAccount ? handleChatWithContact(item) : {}}
            >
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
                            onPress={() => handleChatWithContact(item)}
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
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>
            {permissionStatus === 'denied' ? (
                <View style={styles.emptyContainer}>
                    <View style={[styles.permissionIconContainer, { backgroundColor: colors.card }]}>
                        <MaterialCommunityIcons name="contacts" size={48} color={colors.primary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>Contacts Permission Required</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        Enable contacts permission in your device settings to find friends who are already on Jarvis Chat.
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleOpenSettings}
                    >
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
                    {/* Search Bar Container */}
                    <View style={styles.header}>
                        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (filteredContacts.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <FontAwesome name="users" size={54} color={colors.textSecondary} style={{ opacity: 0.25, marginBottom: 16 }} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                {searchQuery ? 'No contacts found' : 'No contacts yet'}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredContacts}
                            renderItem={renderContact}
                            keyExtractor={(item) => (item.has_account ? `jarvis_${item.id}` : `contact_${item.id}`)}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            ItemSeparatorComponent={() => (
                                <View style={[
                                    styles.separator,
                                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }
                                ]} />
                            )}
                        />
                    ))}
                </>
            )}
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerComponent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 4,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.6,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 10,
    },
    searchContainer: {
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
        paddingTop: 8,
        paddingBottom: 120, // Extra space for tab bar
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
