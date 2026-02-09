import React, { useState, useEffect, useCallback } from 'react';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useAppTheme } from '@/hooks/useAppTheme';
import { StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useStore } from '@/store';
import { api } from '@/services/api';
import { formatLastSeen } from '@/utils/date';
import { useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import * as Contacts from 'expo-contacts';
import { Avatar } from '@/components/ui/Avatar';

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
    const { colors } = useAppTheme();
    const router = useRouter();
    const token = useStore((state) => state.token);
    const showAlert = useStore((state) => state.showAlert);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');



    const fetchContacts = useCallback(async () => {
        try {
            setLoading(true);

            // Request contacts permission
            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== 'granted') {
                showAlert('Permission Denied', 'We need contacts permission to show your contacts');
                setLoading(false);
                return;
            }

            // Get device contacts
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
                    console.log('[People] Jarvis users found:', jarvisUsers.length);
                } catch (error) {
                    console.error('Failed to check Jarvis users:', error);
                }
            }

            // Map contacts with Jarvis account status
            const mappedContacts: Contact[] = data
                .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
                .map(contact => {
                    const phone = contact.phoneNumbers![0].number || '';
                    const normalizedPhone = normalizePhone(phone);

                    // Find matching Jarvis user by normalized phone number
                    const jarvisUser = jarvisUsers.find((u: any) => {
                        const userPhone = normalizePhone(u.phone_number || '');
                        return userPhone === normalizedPhone;
                    });

                    if (jarvisUser) {
                        // Contact has Jarvis account - use backend data
                        return {
                            id: jarvisUser.id.toString(),
                            username: jarvisUser.username,
                            phone: phone,
                            has_account: true,
                            profile_picture: jarvisUser.profile_picture,
                            bio: jarvisUser.bio,
                            is_online: jarvisUser.is_online || false,
                            last_seen: jarvisUser.last_seen,
                        };
                    } else {
                        // Contact doesn't have Jarvis account - use device contact data
                        return {
                            id: contact.id,
                            username: contact.name || 'Unknown',
                            phone: phone,
                            has_account: false,
                        };
                    }
                });

            setContacts(mappedContacts);
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
            showAlert('Error', 'Failed to load contacts');
        } finally {
            setLoading(false);
        }
    }, [token, showAlert]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

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
            console.error('SMS invite error:', error);
            showAlert('Error', 'Failed to send invite');
        }
    };

    const handleChatWithContact = (contact: Contact) => {
        // Navigate to chat with this contact
        router.push(`/chat/${contact.id}`);
    };

    const filteredContacts = contacts.filter((contact) => {
        const query = searchQuery.toLowerCase();
        const nameMatch = contact.username.toLowerCase().includes(query);
        const phoneMatch = contact.phone ? contact.phone.includes(query) : false; // Substring match ("unordered")
        return nameMatch || phoneMatch;
    });

    const renderContact = ({ item }: { item: Contact }) => {
        // Check if contact has Jarvis account
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
                        onPress={() => handleChatWithContact(item)}
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
    };

    return (
        <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>
            <View style={styles.header}>
                {/* Title removed to prevent duplication with Tab Header */}
                <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <FontAwesome name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search contacts..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {loading ? (
                <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (filteredContacts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <FontAwesome name="users" size={60} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {searchQuery ? 'No contacts found' : 'No contacts yet'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredContacts}
                    renderItem={renderContact}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ))}
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 34,
        fontWeight: '900',
        marginBottom: 20,
        letterSpacing: -1,
    },
    searchContainer: {
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
