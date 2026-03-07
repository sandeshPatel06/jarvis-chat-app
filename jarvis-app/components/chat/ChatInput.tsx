import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Image, Alert, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { getInfoAsync } from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import { Message } from '@/types';
import * as Haptics from 'expo-haptics';
import { ImageEditor } from './ImageEditor';

interface ChatInputProps {
    text: string;
    setText: (text: string) => void;
    handleSend: () => void;
    editingMessageId: string | null;
    setEditingMessageId: (id: string | null) => void;
    replyingToMessage: Message | null;
    setReplyingToMessage: (msg: Message | null) => void;
    insets: { bottom: number };
    keyboardVisible: boolean;
    chatId: string; // Added chatId
}

export const ChatInput = ({
    text,
    setText,
    handleSend,
    editingMessageId,
    setEditingMessageId,
    replyingToMessage,
    setReplyingToMessage,
    insets,
    keyboardVisible,
    chatId,
}: ChatInputProps) => {
    const { colors } = useAppTheme();
    const sendFileMessage = useStore(state => state.sendFileMessage);
    const [uploading, setUploading] = React.useState(false);
    const [showAttachMenu, setShowAttachMenu] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState<any>(null);
    const [showImageEditor, setShowImageEditor] = React.useState(false);
    const [isRecordingVoice, setIsRecordingVoice] = React.useState(false);

    const isExpoGo = Constants.appOwnership === 'expo';

    // Warn about Expo Go limitations on mount
    React.useEffect(() => {
        if (isExpoGo) {
            console.warn('Running in Expo Go. File sharing may have limited functionality. For full features, use a development build.');
        }
    }, [isExpoGo]);


    // Handle image selection with ImagePicker (shows app chooser)
    const handleImagePicker = async () => {
        setShowAttachMenu(false);
        try {
            // Request permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant photo library access to select images.',
                    [{ text: 'OK' }]
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
                allowsMultipleSelection: false,
            });

            if (result.canceled) return;

            const asset = result.assets[0];

            // Convert to file format expected by upload
            const file = {
                uri: asset.uri,
                name: asset.fileName || `image_${Date.now()}.jpg`,
                mimeType: asset.mimeType || 'image/jpeg',
                size: asset.fileSize,
            };

            // Validate file
            try {
                const fileInfo = await getInfoAsync(file.uri);

                if (!fileInfo.exists) {
                    Alert.alert('File Not Found', 'Unable to access the selected image.');
                    return;
                }

                const maxSize = 50 * 1024 * 1024;
                if (fileInfo.size && fileInfo.size > maxSize) {
                    Alert.alert(
                        'File Too Large',
                        `Maximum size is 50MB. Your file is ${(fileInfo.size / 1024 / 1024).toFixed(2)}MB.`
                    );
                    return;
                }

                console.log('Image selected:', file);
                setSelectedFile(file);

            } catch (error) {
                console.error('File validation error:', error);
                Alert.alert('File Access Error', 'Unable to validate the selected image.');
            }

        } catch (error) {
            console.error('Image picker error', error);
            Alert.alert('Selection Failed', 'Failed to select image. Please try again.');
        }
    };

    // Handle video selection with ImagePicker (shows app chooser)
    const handleVideoPicker = async () => {
        setShowAttachMenu(false);
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant photo library access to select videos.',
                    [{ text: 'OK' }]
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                allowsEditing: false,
                quality: 0.8,
                allowsMultipleSelection: false,
            });

            if (result.canceled) return;

            const asset = result.assets[0];

            const file = {
                uri: asset.uri,
                name: asset.fileName || `video_${Date.now()}.mp4`,
                mimeType: asset.mimeType || 'video/mp4',
                size: asset.fileSize,
            };

            // Validate file
            try {
                const fileInfo = await getInfoAsync(file.uri);

                if (!fileInfo.exists) {
                    Alert.alert('File Not Found', 'Unable to access the selected video.');
                    return;
                }

                const maxSize = 50 * 1024 * 1024;
                if (fileInfo.size && fileInfo.size > maxSize) {
                    Alert.alert(
                        'File Too Large',
                        `Maximum size is 50MB. Your file is ${(fileInfo.size / 1024 / 1024).toFixed(2)}MB.`
                    );
                    return;
                }

                console.log('Video selected:', file);
                setSelectedFile(file);

            } catch (error) {
                console.error('File validation error:', error);
                Alert.alert('File Access Error', 'Unable to validate the selected video.');
            }

        } catch (error) {
            console.error('Video picker error', error);
            Alert.alert('Selection Failed', 'Failed to select video. Please try again.');
        }
    };

    // Handle camera capture
    const handleCameraPicker = async () => {
        setShowAttachMenu(false);
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant camera access to take photos.',
                    [{ text: 'OK' }]
                );
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });

            if (result.canceled) return;

            const asset = result.assets[0];

            const file = {
                uri: asset.uri,
                name: asset.fileName || `camera_${Date.now()}.jpg`,
                mimeType: asset.mimeType || 'image/jpeg',
                size: asset.fileSize,
            };

            // Validate file
            try {
                const fileInfo = await getInfoAsync(file.uri);

                if (!fileInfo.exists) {
                    Alert.alert('File Not Found', 'Unable to access the captured image.');
                    return;
                }

                // No need to check size strictly for camera here usually, but good practice
                console.log('Camera image selected:', file);
                setSelectedFile(file);

            } catch (error) {
                console.error('File validation error:', error);
                // If getInfoAsync fails on camera URI, we might still try to use it if it looks valid
                setSelectedFile(file);
            }

        } catch (error) {
            console.error('Camera picker error', error);
            Alert.alert('Selection Failed', 'Failed to take photo. Please try again.');
        }
    };

    // Handle document selection with DocumentPicker (for non-media files)
    const handleAttachment = async (type: string = '*/*') => {
        setShowAttachMenu(false);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: type,
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (result.canceled) return;

            const file = result.assets[0];

            // Validate file exists and is accessible
            try {
                const fileInfo = await getInfoAsync(file.uri);

                if (!fileInfo.exists) {
                    Alert.alert(
                        'File Not Found',
                        'Unable to access the selected file. Please try again.',
                        [{ text: 'OK' }]
                    );
                    return;
                }

                // Check file size (50MB limit)
                const maxSize = 50 * 1024 * 1024; // 50MB
                if (fileInfo.size && fileInfo.size > maxSize) {
                    Alert.alert(
                        'File Too Large',
                        `The selected file is too large. Maximum size is 50MB. Your file is ${(fileInfo.size / 1024 / 1024).toFixed(2)}MB.`,
                        [{ text: 'OK' }]
                    );
                    return;
                }

                console.log('File selected:', {
                    name: file.name,
                    size: fileInfo.size,
                    uri: file.uri,
                    type: file.mimeType
                });

            } catch (fileCheckError) {
                console.error('File validation error:', fileCheckError);
                Alert.alert(
                    'File Access Error',
                    'Unable to validate the selected file. Please ensure you have granted necessary permissions.',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Show preview instead of sending immediately
            setSelectedFile(file);

        } catch (error) {
            console.error('File pick error', error);
            Alert.alert(
                'Selection Failed',
                'Failed to select file. Please try again.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleSendFile = async () => {
        if (!selectedFile) return;

        try {
            setUploading(true);
            await sendFileMessage(chatId, selectedFile, text, replyingToMessage?.id);
            setSelectedFile(null);
            setText('');
            setReplyingToMessage(null);
        } catch (error: any) {
            console.error('Send file error', error);
            Alert.alert(
                'Upload Failed',
                error.message || 'Failed to send file. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setUploading(false);
        }
    };

    const handleCancelFile = () => {
        setSelectedFile(null);
    };

    const handleImageEditorSave = (editedUri: string) => {
        // Update the selected file with the edited URI
        setSelectedFile({
            ...selectedFile,
            uri: editedUri,
        });
        setShowImageEditor(false);
    };

    const handleImageEditorCancel = () => {
        setShowImageEditor(false);
    };

    return (
        <View style={{ backgroundColor: colors.background, paddingBottom: !keyboardVisible ? Math.max(insets.bottom, 20) : 10, zIndex: 10 }}>
            <Modal
                transparent={true}
                visible={showAttachMenu}
                animationType="fade"
                onRequestClose={() => setShowAttachMenu(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowAttachMenu(false)}>
                    <View style={[styles.attachMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TouchableOpacity onPress={handleCameraPicker} style={styles.menuItem}>
                            <FontAwesome name="camera" size={20} color={colors.text} style={{ width: 25 }} />
                            <Text style={[styles.menuText, { color: colors.text }]}>Camera</Text>
                        </TouchableOpacity>
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        <TouchableOpacity onPress={handleImagePicker} style={styles.menuItem}>
                            <FontAwesome name="image" size={20} color={colors.text} style={{ width: 25 }} />
                            <Text style={[styles.menuText, { color: colors.text }]}>Gallery</Text>
                        </TouchableOpacity>
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        <TouchableOpacity onPress={handleVideoPicker} style={styles.menuItem}>
                            <FontAwesome name="video-camera" size={20} color={colors.text} style={{ width: 25 }} />
                            <Text style={[styles.menuText, { color: colors.text }]}>Video</Text>
                        </TouchableOpacity>
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        <TouchableOpacity onPress={() => handleAttachment('*/*')} style={styles.menuItem}>
                            <FontAwesome name="file-text-o" size={20} color={colors.text} style={{ width: 25 }} />
                            <Text style={[styles.menuText, { color: colors.text }]}>Document</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
            {replyingToMessage && (
                <View style={[styles.replyPreview, { backgroundColor: colors.inputBackground, marginHorizontal: 15, borderRadius: 15 }]}>
                    <View style={[styles.replyBar, { backgroundColor: colors.primary }]} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Replying to {replyingToMessage.sender === 'me' ? 'Yourself' : 'Them'}</Text>
                        <Text numberOfLines={1} style={{ color: colors.text }}>{replyingToMessage.text}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setReplyingToMessage(null)}>
                        <FontAwesome name="times" size={16} color={colors.text} />
                    </TouchableOpacity>
                </View>
            )}
            {selectedFile && (
                <View style={[styles.filePreview, { backgroundColor: colors.inputBackground }]}>
                    {selectedFile.mimeType?.startsWith('image/') ? (
                        <>
                            <Image
                                source={{ uri: selectedFile.uri }}
                                style={styles.previewImage}
                                resizeMode="cover"
                            />
                            {/* Edit button now positioned differently in styles or could be an overlay on the small image */}
                        </>
                    ) : (
                        <View style={{ width: 60, height: 60, borderRadius: 12, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                            <FontAwesome name="file-text-o" size={24} color={colors.text} />
                        </View>
                    )}

                    <View style={styles.fileInfo}>
                        <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                            {selectedFile.name}
                        </Text>
                        <Text style={[styles.fileSize, { color: colors.tabIconDefault }]}>
                            {(selectedFile.size / 1024).toFixed(2)} KB
                        </Text>
                    </View>

                    {selectedFile.mimeType?.startsWith('image/') && (
                        <TouchableOpacity
                            onPress={() => setShowImageEditor(true)}
                            style={{ padding: 8, marginRight: 4 }}
                        >
                            <FontAwesome name="edit" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={handleCancelFile} style={styles.cancelFileButton}>
                        <FontAwesome name="times-circle" size={22} color={colors.tabIconDefault} />
                    </TouchableOpacity>
                </View>
            )}
            <View
                style={[
                    styles.inputContainer,
                    {
                        paddingTop: 10,
                        paddingHorizontal: 15,
                    },
                ]}
            >
                <TouchableOpacity
                    style={[
                        styles.attachButton,
                        { backgroundColor: colors.messageBubbleThem },
                    ]}
                    onPress={() => {
                        if (editingMessageId) {
                            setEditingMessageId(null);
                            setText('');
                        } else {
                            setShowAttachMenu(!showAttachMenu);
                        }
                    }}
                >
                    {uploading ? (
                        <ActivityIndicator color={colors.text} size="small" />
                    ) : (
                        <FontAwesome
                            name={editingMessageId ? "times" : "plus"}
                            size={20}
                            color={colors.text}
                        />
                    )}
                </TouchableOpacity>

                <TextInput
                    style={[
                        styles.input,
                        {
                            backgroundColor: colors.inputBackground,
                            color: colors.text,
                            borderColor: 'transparent',
                            borderWidth: 0,
                        },
                    ]}
                    value={text}
                    onChangeText={setText}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.tabIconDefault}
                    multiline
                    maxLength={1000}
                />

                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        if (selectedFile) {
                            handleSendFile();
                        } else {
                            handleSend();
                        }
                    }}
                    disabled={!selectedFile && !text.trim()}
                    style={styles.sendButtonContainer}
                >
                    <LinearGradient
                        colors={[colors.primary, colors.secondary]}
                        style={styles.sendButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <FontAwesome
                            name={editingMessageId ? "check" : "paper-plane"}
                            size={18}
                            color="white"
                            style={{ marginLeft: editingMessageId ? 0 : -2 }} // Adjust icon center
                        />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Image Editor Modal */}
            <Modal
                visible={showImageEditor && selectedFile?.mimeType?.startsWith('image/')}
                animationType="slide"
                presentationStyle="fullScreen"
            >
                {selectedFile && (
                    <ImageEditor
                        imageUri={selectedFile.uri}
                        onSave={handleImageEditorSave}
                        onCancel={handleImageEditorCancel}
                    />
                )}
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    attachButton: {
        padding: 10,
        borderRadius: 24,
        marginRight: 8,
        marginBottom: 2,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 10, // Center text vertically for single line, allow growth
        paddingBottom: 10,
        marginRight: 8,
        maxHeight: 120,
        fontSize: 16,
        minHeight: 44,
    },
    sendButtonContainer: {
        marginBottom: 2,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    replyPreview: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
        borderBottomWidth: 0,
        marginBottom: 8,
        marginHorizontal: 12,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,

    },
    replyBar: {
        width: 4,
        borderRadius: 2,
        marginRight: 10,
        height: '100%',
    },
    attachMenu: {
        position: 'absolute',
        bottom: 80,
        left: 16,
        borderRadius: 20,
        padding: 8,
        elevation: 8,
        minWidth: 200,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        borderWidth: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.2)', // Slight dim
    },
    separator: {
        height: 1,
        width: '100%',
        marginVertical: 4,
        opacity: 0.1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    menuText: {
        fontSize: 15,
        fontWeight: '500',
        marginLeft: 12,
    },
    filePreview: {
        padding: 8,
        marginBottom: 8,
        marginHorizontal: 12,
        borderRadius: 16,
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    previewImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    fileInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    fileName: {
        fontSize: 14,
        fontWeight: '600',
        maxWidth: '90%',
    },
    fileSize: {
        fontSize: 12,
        marginTop: 2,
    },
    cancelFileButton: {
        padding: 8,
    },
    editButton: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
});
