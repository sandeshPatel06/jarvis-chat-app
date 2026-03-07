import { Platform } from 'react-native';
import { getInfoAsync } from 'expo-file-system/legacy';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
    throw new Error('Missing environment variable: EXPO_PUBLIC_BACKEND_URL');
}

const API_URL = `${BACKEND_URL}/api`;

const log = (message: string, data?: any) => {
    if (__DEV__) {
        console.log(`[API] ${message}`, data || '');
    }
};

export const api = {
    auth: {
        requestOTP: async (identifier: string) => {
            const url = `${API_URL}/auth/request-otp/`;
            try {
                log(`POST ${url}`, { identifier });
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier }),
                });
                const json = await response.json();
                log('Request OTP response', { status: response.status, json });
                if (!response.ok) throw new Error(json.error || 'Failed to request OTP');
                return json;
            } catch (error) {
                log('Request OTP error', error);
                throw error;
            }
        },
        verifyOTP: async (data: { session_id: string; otp_code: string }) => {
            const url = `${API_URL}/auth/verify-otp/`;
            try {
                log(`POST ${url}`, data);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const json = await response.json();
                log('Verify OTP response', { status: response.status, json });
                if (!response.ok) throw new Error(json.error || 'Verification failed');
                return json;
            } catch (error) {
                log('Verify OTP error', error);
                throw error;
            }
        },
        completeSignup: async (data: any) => {
            const url = `${API_URL}/auth/complete-signup/`;
            try {
                log(`POST ${url}`, data);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const json = await response.json();
                log('Complete Signup response', { status: response.status, json });
                if (!response.ok) throw new Error(json.error || 'Signup failed');
                return json;
            } catch (error) {
                log('Complete Signup error', error);
                throw error;
            }
        },
        login: async (data: any) => {
            const url = `${API_URL}/auth/login/`;
            try {
                log(`POST ${url}`, data);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        identifier: data.email || data.phone || data.identifier,
                        password: data.password
                    }),
                });
                const json = await response.json();
                log('Login response', { status: response.status, json });
                if (!response.ok) throw new Error(json.error || 'Login failed');
                return json;
            } catch (error) {
                log('Login error', error);
                throw error;
            }
        },
        updateProfile: async (token: string, data: any) => {
            const url = `${API_URL}/auth/profile/`;
            try {
                const isFormData = data instanceof FormData;
                log(`PATCH ${url}`, isFormData ? 'FormData' : data);
                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Token ${token}`,
                        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
                    },
                    body: isFormData ? data : JSON.stringify(data),
                });
                const json = await response.json();
                log('Profile update response', { status: response.status, json });
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Update failed');
                return json;
            } catch (error) {
                log('Profile update error', error);
                throw error;
            }
        },
        updateFCMToken: async (token: string, fcmToken: string) => {
            const url = `${API_URL}/auth/fcm-token/`;
            try {
                log(`POST ${url}`, { fcm_token: fcmToken });
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ fcm_token: fcmToken }),
                });
                const json = await response.json();
                log('Update FCM Token response', { status: response.status, json });
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to update FCM token');
                return json;
            } catch (error) {
                log('Update FCM Token error', error);
                throw error;
            }
        },
        deleteAccount: async (token: string) => {
            const url = `${API_URL}/auth/profile/`;
            try {
                log(`DELETE ${url}`);
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Token ${token}` },
                });
                if (response.status === 204) return true;
                const json = await response.json();
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Delete failed');
                return json;
            } catch (error) {
                log('Delete account error', error);
                throw error;
            }
        },
        getUserProfile: async (token: string, userId: number) => {
            const url = `${API_URL}/auth/users/${userId}/`;
            try {
                log(`GET ${url}`);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const json = await response.json();
                log('Get user profile response', { status: response.status, json });
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to fetch user profile');
                return json;
            } catch (error) {
                log('Get user profile error', error);
                throw error;
            }
        },
        blockUser: async (token: string, userId: number) => {
            const url = `${API_URL}/auth/block/`;
            try {
                log(`POST ${url}`, { userId });
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ user_id: userId }),
                });
                const json = await response.json();
                log('Block user response', { status: response.status, json });
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to block user');
                return json;
            } catch (error) {
                log('Block user error', error);
                throw error;
            }
        },
        unblockUser: async (token: string, userId: number) => {
            const url = `${API_URL}/auth/block/`;
            try {
                log(`DELETE ${url}`, { userId });
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ user_id: userId }),
                });
                const json = await response.json();
                log('Unblock user response', { status: response.status, json });
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to unblock user');
                return json;
            } catch (error) {
                log('Unblock user error', error);
                throw error;
            }
        },
        getBlockedUsers: async (token: string) => {
            const url = `${API_URL}/auth/block/`;
            try {
                log(`GET ${url}`);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const json = await response.json();
                log('Get blocked users response', { status: response.status, count: json.length });
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to fetch blocked users');
                return json;
            } catch (error) {
                log('Get blocked users error', error);
                return [];
            }
        },
    },
    contacts: {
        getContacts: async (token: string) => {
            const url = `${API_URL}/contacts/`;
            try {
                log(`GET ${url}`);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const json = await response.json();
                log('Get contacts response', { status: response.status, count: json.length });
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to fetch contacts');
                return json;
            } catch (error) {
                log('Get contacts error', error);
                return [];
            }
        },
    },
    chat: {
        restoreChats: async (token: string, conversationIds: number[], restoreDate?: string) => {
            const url = `${API_URL}/chat/restore/`;
            try {
                log(`POST ${url}`, { conversationIds, restoreDate });
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        conversation_ids: conversationIds,
                        restore_messages_before: restoreDate
                    })
                });
                const json = await response.json();
                log('Restore chats response', { status: response.status, json });
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to restore chats');
                return json;
            } catch (error) {
                log('Restore chats error', error);
                throw error;
            }
        },
        getConversations: async (token: string, deleted: boolean = false) => {
            const url = `${API_URL}/chat/conversations/?deleted=${deleted}`;
            try {
                log(`GET ${url}`);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const json = await response.json();
                log(`Conversations fetched from ${url}`, { count: json.length });
                if (!response.ok) throw new Error('Failed to fetch conversations');
                return json;
            } catch (error) {
                log(`Fetch conversations error from ${url}`, error);
                console.error(error);
                return [];
            }
        },
        getMessages: async (token: string, conversationId: string, limit: number = 20, offset: number = 0) => {
            const url = `${API_URL}/chat/messages/${conversationId}/?limit=${limit}&offset=${offset}`;
            try {
                log(`GET ${url}`);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const json = await response.json();

                // Keep backward compatibility if backend returns dict with 'results'
                const results = Array.isArray(json) ? json : (json.results || []);

                log(`Messages fetched from ${url}`, { count: results.length });
                if (!response.ok) throw new Error('Failed to fetch messages');
                return results;
            } catch (error) {
                log(`Fetch messages error from ${url}`, error);
                console.error(error);
                return [];
            }
        },
        checkContacts: async (token: string, phoneNumbers: string[]) => {
            const url = `${API_URL}/auth/check-contacts/`;
            try {
                log(`POST ${url}`, { count: phoneNumbers.length });
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ phone_numbers: phoneNumbers }),
                });
                const json = await response.json();
                log(`Contacts checked from ${url}`, { matches: json.length });
                if (!response.ok) throw new Error('Failed to check contacts');
                return json;
            } catch (error) {
                log(`Check contacts error from ${url}`, error);
                console.error(error);
                return [];
            }
        },
        createConversation: async (token: string, recipientUsername: string) => {
            const url = `${API_URL}/chat/conversations/`;
            try {
                log(`POST ${url}`, { recipient: recipientUsername });
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ recipient: recipientUsername }),
                });
                const json = await response.json();
                log(`Conversation created`, { id: json.id });
                if (!response.ok) throw new Error('Failed to create conversation');
                return json;
            } catch (error) {
                log(`Create conversation error`, error);
                throw error;
            }
        },
        deleteConversation: async (token: string, conversationId: string) => {
            const url = `${API_URL}/chat/conversations/${conversationId}/`;
            try {
                log(`DELETE ${url}`);
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.status === 204) {
                    log(`Conversation deleted`, { id: conversationId });
                    return true;
                }

                const text = await response.text();
                try {
                    const json = JSON.parse(text);
                    log(`Delete conversation response`, { status: response.status, json });
                    if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to delete conversation');
                    return json;
                } catch (e) {
                    log(`Delete conversation non-JSON response`, { status: response.status, text });
                    throw new Error(`Server returned non-JSON response: ${response.status}`);
                }
            } catch (error) {
                log(`Delete conversation error`, error);
                throw error;
            }
        },
        clearMessages: async (token: string, conversationId: string) => {
            const url = `${API_URL}/chat/conversations/${conversationId}/clear/`;
            try {
                log(`POST ${url}`);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.status === 204 || response.status === 200) {
                    log(`Messages cleared`, { conversationId });
                    return true;
                }

                const json = await response.json();
                log(`Clear messages response`, { status: response.status, json });
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to clear messages');
                return json;
            } catch (error) {
                log(`Delete conversation error`, error);
                throw error;
            }
        },

        // Helper function to normalize file URIs for platform compatibility
        normalizeFileUri: (uri: string): string => {
            if (Platform.OS === 'android') {
                // Android may use content:// URIs, keep as-is
                return uri;
            } else if (Platform.OS === 'ios') {
                // iOS uses file:// URIs
                return uri.startsWith('file://') ? uri : `file://${uri}`;
            }
            return uri;
        },

        uploadFile: async (token: string, conversationId: string | null, recipientUsername: string | null, file: any, text: string = '', replyToId?: string) => {
            const url = `${API_URL}/chat/messages/upload/`;
            const formData = new FormData();

            if (conversationId) formData.append('conversation_id', conversationId);
            if (recipientUsername) formData.append('recipient_username', recipientUsername);
            formData.append('text', text);
            if (replyToId) formData.append('reply_to_id', replyToId);

            if (file) {
                // Validate file before upload
                try {
                    const fileInfo = await getInfoAsync(file.uri);

                    if (!fileInfo.exists) {
                        throw new Error('File not found. It may have been moved or deleted.');
                    }

                    log('File validation passed', {
                        exists: fileInfo.exists,
                        size: fileInfo.size,
                        uri: file.uri
                    });
                } catch (validationError: any) {
                    log('File validation failed', validationError);
                    throw new Error(validationError.message || 'Unable to access file');
                }

                // Normalize URI for platform compatibility
                const normalizedUri = api.chat.normalizeFileUri(file.uri);

                // Expo Document Picker result structure
                formData.append('file', {
                    uri: normalizedUri,
                    name: file.name || 'file',
                    type: file.mimeType || 'application/octet-stream'
                } as any);

                // Send file_type and file_name separately for backend
                if (file.mimeType) {
                    formData.append('file_type', file.mimeType);
                }
                if (file.name) {
                    formData.append('file_name', file.name);
                }

                log('File being uploaded', {
                    name: file.name,
                    type: file.mimeType,
                    originalUri: file.uri,
                    normalizedUri: normalizedUri,
                    platform: Platform.OS
                });
            }

            try {
                log(`POST ${url} (Multipart)`, { conversationId, hasFile: !!file });
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        // Do NOT set Content-Type for multipart/form-data - let fetch set it with boundary
                    },
                    body: formData,
                });

                const json = await response.json();
                log('Upload response', { status: response.status, json });

                if (!response.ok) {
                    const errorMessage = json.detail || json.error || JSON.stringify(json) || 'Upload failed';
                    throw new Error(errorMessage);
                }

                return json;
            } catch (error: any) {
                log('Upload error', error);

                // Provide more specific error messages
                if (error.message?.includes('Network request failed')) {
                    throw new Error('Network error. Please check your internet connection.');
                } else if (error.message?.includes('File not found')) {
                    throw new Error('File not found. Please try selecting the file again.');
                }

                throw error;
            }
        },
        getCalls: async (token: string, limit: number = 20, offset: number = 0) => {
            const url = `${API_URL}/calls/?limit=${limit}&offset=${offset}`;
            try {
                log(`GET ${url}`);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const json = await response.json();

                // Handle pagination (results array vs flat array)
                const results = Array.isArray(json) ? json : (json.results || []);

                log(`Calls fetched from ${url}`, { count: results.length });
                if (!response.ok) throw new Error('Failed to fetch calls');
                return results;
            } catch (error) {
                log(`Fetch calls error from ${url}`, error);
                console.error(error);
                return [];
            }
        },
        logCall: async (token: string, data: any) => {
            const url = `${API_URL}/calls/`;
            try {
                log(`POST ${url}`, data);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });
                const json = await response.json();
                log('Log call response', { status: response.status, json });
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Log call failed');
                return json;
            } catch (error) {
                log('Log call error', error);
                // Don't throw, just log error to avoid disrupting UX
                console.error(error);
                return null;
            }
        }
    }
};
