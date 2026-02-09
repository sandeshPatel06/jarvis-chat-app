import React, { useCallback } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Image, Dimensions, StatusBar, Text, Linking } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import * as Sharing from 'expo-sharing';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';


interface MediaViewerProps {
    visible: boolean;
    mediaUri: string | null;
    mediaType: 'image' | 'video' | 'pdf' | 'document' | null;
    fileName?: string;
    onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export const MediaViewer: React.FC<MediaViewerProps> = ({ visible, mediaUri, mediaType, fileName, onClose }) => {
    const { colors } = useAppTheme();
    const showAlert = useStore(useCallback((state: any) => state.showAlert, []));
    const player = useVideoPlayer(mediaUri || '', (p) => {
        p.loop = false;
        if (visible && mediaType === 'video') {
            p.play();
        }
    });

    React.useEffect(() => {
        if (!visible) {
            player.pause();
            // Reset orientation when closing
            ScreenOrientation.unlockAsync().catch(console.error);
        } else {
            if (mediaType === 'video' || mediaType === 'image') {
                // Allow rotation for images and videos
                ScreenOrientation.unlockAsync().catch(console.error);
            } else {
                // Lock to portrait for documents
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(console.error);
            }

            if (mediaType === 'video') {
                player.play();
            }
        }
    }, [visible, player, mediaType]);

    const handleOpenExternal = () => {
        if (mediaUri) {
            Linking.openURL(mediaUri).catch(err => console.error('Failed to open:', err));
        }
    };

    const handleShare = async () => {
        if (mediaUri) {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(mediaUri, {
                    dialogTitle: fileName || 'Share Media',
                    mimeType: mediaType === 'pdf' ? 'application/pdf' : undefined,
                }).catch(err => console.error('Sharing failed:', err));
            } else {
                console.warn('Sharing is not available on this platform');
            }
        }
    };

    const handleSave = async () => {
        if (!mediaUri) return;

        try {
            // Request permission
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                showAlert('Permission Denied', 'We need permission to save media to your gallery');
                return;
            }

            // Determine file extension
            let ext = '.jpg';
            if (mediaType === 'video') ext = '.mp4';
            else if (mediaType === 'pdf') ext = '.pdf';

            // Download and save the media
            let uriToSave = '';

            if (mediaUri.startsWith('file://')) {
                uriToSave = mediaUri;
            } else {
                // @ts-ignore
                // eslint-disable-next-line import/namespace
                const fileUri = FileSystem.cacheDirectory + 'temp_media_' + Date.now() + ext;
                const downloadResult = await FileSystem.downloadAsync(mediaUri, fileUri);

                if (downloadResult.status !== 200) {
                    throw new Error('Download failed with status: ' + downloadResult.status);
                }
                uriToSave = downloadResult.uri;
            }

            await MediaLibrary.saveToLibraryAsync(uriToSave);
            showAlert('Success', 'Media saved to gallery!');
        } catch (error) {
            console.error('Failed to save to gallery:', error);
            showAlert('Error', 'Failed to save media to gallery');
        }
    };

    if (!mediaUri || !mediaType) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.container}>
                <StatusBar hidden />

                {/* Header with filename and buttons */}
                <View style={styles.header}>
                    {fileName && (
                        <Text style={styles.fileName} numberOfLines={1}>
                            {fileName}
                        </Text>
                    )}
                    <View style={styles.headerButtons}>
                        <TouchableOpacity style={styles.headerButton} onPress={handleSave}>
                            <MaterialCommunityIcons name="download" size={24} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
                            <MaterialCommunityIcons name="share-variant" size={24} color="white" />
                        </TouchableOpacity>
                        {(mediaType === 'pdf' || mediaType === 'document') && (
                            <TouchableOpacity style={styles.headerButton} onPress={handleOpenExternal}>
                                <MaterialCommunityIcons name="open-in-new" size={24} color="white" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={28} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Media Content */}
                <View style={styles.mediaContainer}>
                    {mediaType === 'image' ? (
                        <Image
                            source={{ uri: mediaUri }}
                            style={styles.image}
                            resizeMode="contain"
                        />
                    ) : mediaType === 'video' ? (
                        <VideoView
                            style={styles.video}
                            player={player}
                            allowsFullscreen
                            allowsPictureInPicture
                        />
                    ) : mediaType === 'pdf' ? (
                        <WebView
                            source={{ uri: `https://docs.google.com/viewer?url=${encodeURIComponent(mediaUri)}&embedded=true` }}
                            style={styles.webview}
                            startInLoadingState
                        />
                    ) : (
                        <View style={styles.documentContainer}>
                            <MaterialCommunityIcons name="file-document" size={80} color="white" />
                            <Text style={styles.documentText}>
                                {fileName || 'Document'}
                            </Text>
                            <TouchableOpacity style={[styles.openButton, { backgroundColor: colors.primary }]} onPress={handleOpenExternal}>
                                <Text style={styles.openButtonText}>Open with External App</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Background overlay - tapping closes viewer */}
                <TouchableOpacity
                    style={styles.backgroundOverlay}
                    activeOpacity={1}
                    onPress={onClose}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    fileName: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 16,
    },
    headerButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flex: 1,
    },
    headerButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        padding: 8,
    },
    mediaContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    image: {
        width: width,
        height: height - 100,
    },
    video: {
        width: width,
        height: height * 0.7,
    },
    webview: {
        flex: 1,
        width: width,
        backgroundColor: 'transparent',
    },
    documentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    documentText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 30,
        textAlign: 'center',
    },
    openButton: {
        // backgroundColor: '#007AFF', // This line is removed as per the instruction to apply themed colors
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    openButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
