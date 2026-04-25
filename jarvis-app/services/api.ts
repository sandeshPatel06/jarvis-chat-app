import { Platform } from 'react-native';
import { getInfoAsync } from 'expo-file-system/legacy';
import { addNetworkUsage } from '@/utils/usageTracker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
    throw new Error('Missing environment variable: EXPO_PUBLIC_BACKEND_URL');
}

const API_URL = `${BACKEND_URL}/api`;

const log = (message: string, data?: any) => {
};

const fetchWithTracking = async (url: string, options: any = {}) => {
    // Estimate bytes sent
    let sentBytes = 0;
    if (options.body) {
        if (typeof options.body === 'string') {
            sentBytes = options.body.length;
        } else if (options.body instanceof FormData) {
            // Very rough estimate for FormData
            sentBytes = 1024 * 5; // Assumed overhead if we can't easily measure
        }
    }
    // Add header estimate
    sentBytes += 500;

    const response = await fetch(url, options);
    
    // Estimate bytes received
    let receivedBytes = 0;
    try {
        const cloned = response.clone();
        const text = await cloned.text();
        receivedBytes = text.length;
    } catch {
        receivedBytes = 1024; // fallback
    }
    // Add header estimate
    receivedBytes += 500;

    // Async record usage
    addNetworkUsage(sentBytes, receivedBytes).catch(() => {});

    return response;
};

export const api = {
    auth: {
        requestOTP: async (identifier: string) => {
            const url = `${API_URL}/auth/request-otp/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier }),
                });
                const json = await response.json();
                if (!response.ok) throw new Error(json.error || 'Failed to request OTP');
                return json;
            } catch (error) {
                throw error;
            }
        },
        verifyOTP: async (data: { session_id: string; otp_code: string }) => {
            const url = `${API_URL}/auth/verify-otp/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const json = await response.json();
                if (!response.ok) throw new Error(json.error || 'Verification failed');
                return json;
            } catch (error) {
                throw error;
            }
        },
        completeSignup: async (data: any) => {
            const url = `${API_URL}/auth/complete-signup/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const json = await response.json();
                if (!response.ok) throw new Error(json.error || 'Signup failed');
                return json;
            } catch (error) {
                throw error;
            }
        },
        login: async (data: any) => {
            const url = `${API_URL}/auth/login/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        identifier: data.email || data.phone || data.identifier,
                        password: data.password
                    }),
                });
                const json = await response.json();
                if (!response.ok) throw new Error(json.error || 'Login failed');
                return json;
            } catch (error) {
                throw error;
            }
        },
        updateProfile: async (token: string, data: any) => {
            const url = `${API_URL}/auth/profile/`;
            try {
                const isFormData = data instanceof FormData;
                const response = await fetchWithTracking(url, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Token ${token}`,
                        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
                    },
                    body: isFormData ? data : JSON.stringify(data),
                });
                const json = await response.json();
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Update failed');
                return json;
            } catch (error) {
                throw error;
            }
        },
        updateFCMToken: async (token: string, fcmToken: string) => {
            const url = `${API_URL}/auth/fcm-token/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ fcm_token: fcmToken }),
                });
                const json = await response.json();
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to update FCM token');
                return json;
            } catch (error) {
                throw error;
            }
        },
        deleteAccount: async (token: string) => {
            const url = `${API_URL}/auth/profile/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Token ${token}` },
                });
                if (response.status === 204) return true;
                const json = await response.json();
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Delete failed');
                return json;
            } catch (error) {
                throw error;
            }
        },
        getUserProfile: async (token: string, userId: number) => {
            const url = `${API_URL}/auth/users/${userId}/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const json = await response.json();
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to fetch user profile');
                return json;
            } catch (error) {
                throw error;
            }
        },
        blockUser: async (token: string, userId: number) => {
            const url = `${API_URL}/auth/block/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ user_id: userId }),
                });
                const json = await response.json();
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to block user');
                return json;
            } catch (error) {
                throw error;
            }
        },
        unblockUser: async (token: string, userId: number) => {
            const url = `${API_URL}/auth/block/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ user_id: userId }),
                });
                const json = await response.json();
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to unblock user');
                return json;
            } catch (error) {
                throw error;
            }
        },
        getBlockedUsers: async (token: string) => {
            const url = `${API_URL}/auth/block/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const json = await response.json();
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to fetch blocked users');
                return json;
            } catch (error) {
                return [];
            }
        },
    },
    contacts: {
        getContacts: async (token: string) => {
            const url = `${API_URL}/contacts/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const json = await response.json();
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to fetch contacts');
                return json;
            } catch (error) {
                return [];
            }
        },
    },
    chat: {
        markMessagesAsRead: async (token: string, conversationId: string) => {
            const url = `${API_URL}/chat/conversations/${conversationId}/read/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (response.status === 204 || response.status === 200) return true;
                const json = await response.json();
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to mark as read');
                return json;
            } catch (error) {
                throw error;
            }
        },
        restoreChats: async (token: string, conversationIds: number[], restoreDate?: string) => {
            const url = `${API_URL}/chat/restore/`;
            try {
                const response = await fetchWithTracking(url, {
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
                if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to restore chats');
                return json;
            } catch (error) {
                throw error;
            }
        },
        getConversations: async (token: string, deleted: boolean = false) => {
            const url = `${API_URL}/chat/conversations/?deleted=${deleted}`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const json = await response.json();
                if (!response.ok) throw new Error('Failed to fetch conversations');
                return json;
            } catch (error) {
                return [];
            }
        },
        getMessages: async (token: string, conversationId: string, limit: number = 20, offset: number = 0) => {
            const url = `${API_URL}/chat/messages/${conversationId}/?limit=${limit}&offset=${offset}`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const json = await response.json();

                // Keep backward compatibility if backend returns dict with 'results'
                const results = Array.isArray(json) ? json : (json.results || []);

                if (!response.ok) throw new Error('Failed to fetch messages');
                return results;
            } catch (error) {
                return [];
            }
        },
        checkContacts: async (token: string, phoneNumbers: string[]) => {
            const url = `${API_URL}/auth/check-contacts/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ phone_numbers: phoneNumbers }),
                });
                const json = await response.json();
                if (!response.ok) throw new Error('Failed to check contacts');
                return json;
            } catch (error) {
                return [];
            }
        },
        createConversation: async (token: string, recipientUsername: string) => {
            const url = `${API_URL}/chat/conversations/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ recipient: recipientUsername }),
                });
                const json = await response.json();
                if (!response.ok) throw new Error('Failed to create conversation');
                return json;
            } catch (error) {
                throw error;
            }
        },
        deleteConversation: async (token: string, conversationId: string) => {
            const url = `${API_URL}/chat/conversations/${conversationId}/`;
            try {
                const response = await fetchWithTracking(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.status === 204) {
                    return true;
                }

                const text = await response.text();
                try {
                    const json = JSON.parse(text);
                    if (!response.ok) throw new Error(JSON.stringify(json) || 'Failed to delete conversation');
                    return json;
                } catch {
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
                const response = await fetchWithTracking(url, {
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

        uploadFile: async (token: string, conversationId: string | null, recipientUsername: string | null, file: any, text: string = '', replyToId?: string, duration?: number) => {
            const url = `${API_URL}/chat/messages/upload/`;
            const formData = new FormData();

            if (conversationId) formData.append('conversation_id', conversationId);
            if (recipientUsername) formData.append('recipient_username', recipientUsername);
            formData.append('text', text);
            if (replyToId) formData.append('reply_to_id', replyToId);
            if (duration) formData.append('duration', duration.toString());

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
                const fileName = file.name || (file.uri ? file.uri.split('/').pop() : 'file');
                const fileType = file.mimeType || (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' : 'application/octet-stream');
                
                formData.append('file', {
                    uri: normalizedUri,
                    name: fileName,
                    type: fileType
                } as any);

                // Send file_type and file_name separately for backend
                formData.append('file_type', fileType);
                formData.append('file_name', fileName);

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
                const response = await fetchWithTracking(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        // Do NOT set Content-Type for multipart/form-data - let fetch set it with boundary
                    },
                    body: formData,
                });

                const responseText = await response.text();
                let json: any = {};
                try {
                    json = responseText ? JSON.parse(responseText) : {};
                } catch (e) {
                    console.warn('[API] Response was not valid JSON', responseText);
                    if (response.status >= 200 && response.status < 300) {
                        json = { status: 'success', id: `temp_${Date.now()}` };
                    } else {
                        throw new Error(`Server error: ${response.status}`);
                    }
                }

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
                const response = await fetchWithTracking(url, {
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
                const response = await fetchWithTracking(url, {
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
        },
        deleteCall: async (token: string, callId: number) => {
            const url = `${API_URL}/calls/${callId}/`;
            try {
                log(`DELETE ${url}`);
                const response = await fetchWithTracking(url, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Token ${token}` },
                });
                if (response.status === 204) return true;
                throw new Error('Failed to delete call');
            } catch (error) {
                log('Delete call error', error);
                throw error;
            }
        },
        clearCallHistory: async (token: string) => {
            const url = `${API_URL}/calls/clear/`;
            try {
                log(`DELETE ${url}`);
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Token ${token}` },
                });
                if (response.status === 204) return true;
                throw new Error('Failed to clear call history');
            } catch (error) {
                log('Clear call history error', error);
                throw error;
            }
        },
        bulkDeleteCalls: async (token: string, callIds: number[]) => {
            const url = `${API_URL}/calls/bulk-delete/`;
            try {
                log(`POST ${url}`, { callIds });
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ call_ids: callIds }),
                });
                if (response.status === 204) return true;
                throw new Error('Failed to bulk delete calls');
            } catch (error) {
                log('Bulk delete calls error', error);
                throw error;
            }
        }
    }
};
