import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Swipeable } from 'react-native-gesture-handler';
import { Message } from '@/types';
import { useAppTheme } from '@/hooks/useAppTheme';
import { MediaViewer } from './MediaViewer';

import { getMediaUrl } from '@/utils/media';

interface MessageItemProps {
    item: Message;
    onLongPress: (message: Message) => void;
    onSwipeReply?: (message: Message) => void;
    onSwipeForward?: (message: Message) => void;
}

export const MessageItemComponent = ({ item, onLongPress, onSwipeReply, onSwipeForward }: MessageItemProps) => {
    const { colors } = useAppTheme();
    const isMe = item.sender === 'me';
    const reactions = item.reactions || [];
    const swipeableRef = React.useRef<Swipeable>(null);
    const [imageError, setImageError] = React.useState(false);
    const [viewerVisible, setViewerVisible] = React.useState(false);

    const handleMediaPress = () => {
        if (item.file && item.file_type) {
            if (item.file_type.startsWith('image/') || item.file_type.startsWith('video/')) {
                setViewerVisible(true);
            }
        }
    };

    const getMediaType = (): 'image' | 'video' | null => {
        if (!item.file_type) return null;
        if (item.file_type.startsWith('image/')) return 'image';
        if (item.file_type.startsWith('video/')) return 'video';
        return null;
    };

    const handleImageError = (e: any) => {
        console.log('Image load error:', e.nativeEvent.error);
        setImageError(true);
    };

    const getImageSource = () => {
        if (!item.file || imageError) {
            if ((item as any).remoteFile) {
                const remoteUrl = getMediaUrl((item as any).remoteFile);
                if (remoteUrl) return { uri: remoteUrl };
            }
            return null;
        }
        const uri = typeof item.file === 'string' ? item.file : (item.file as any).uri;
        if (uri) return { uri };
        return null;
    };


    const renderLeftActions = (progress: any, dragX: any) => {
        return (
            <View style={styles.swipeLeftAction}>
                <MaterialCommunityIcons name="reply" size={20} color={colors.primary} />
            </View>
        );
    };

    const handleSwipeOpen = (direction: 'left' | 'right') => {
        if (direction === 'left' && onSwipeReply) {
            onSwipeReply(item);
            swipeableRef.current?.close();
        } else if (direction === 'right' && onSwipeForward) {
            onSwipeForward(item);
            swipeableRef.current?.close();
        }
    };

    const renderRightActions = (progress: any, dragX: any) => {
        return (
            <View style={styles.swipeRightAction}>
                <MaterialCommunityIcons name="share-variant" size={20} color={colors.primary} />
            </View>
        );
    };

    if (item.deleted_at) {
        return (
            <View style={[styles.messageContainer, { alignSelf: 'center', marginVertical: 8 }]}>
                <View style={[styles.deletedMessageBubble, { backgroundColor: colors.backgroundSecondary }]}>
                    <MaterialCommunityIcons name="delete-outline" size={14} color={colors.tabIconDefault} style={{ marginRight: 4 }} />
                    <Text style={{ fontStyle: 'italic', color: colors.tabIconDefault, fontSize: 11 }}>
                        Message deleted
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <Swipeable
            ref={swipeableRef}
            renderLeftActions={renderLeftActions}
            renderRightActions={renderRightActions}
            onSwipeableOpen={(direction) => handleSwipeOpen(direction)}
            overshootLeft={false}
            overshootRight={false}
            friction={2}
            leftThreshold={60}
            rightThreshold={60}
            containerStyle={{ paddingVertical: 1 }} // Slight vertical spacing for swipeable
        >
            <View
                style={[
                    styles.messageContainer,
                    isMe ? styles.myMessageContainer : styles.theirMessageContainer,
                ]}
            >
                {!isMe && (
                    <View style={styles.avatarContainer}>
                        {/* Placeholder for user avatar - could be replaced with actual user image if available */}
                        <View style={[styles.avatarStats, { backgroundColor: colors.card }]}>
                            <Text style={{ fontSize: 10, color: colors.text, fontWeight: 'bold' }}>
                                {item.sender ? item.sender.substring(0, 1).toUpperCase() : '?'}
                            </Text>
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    onLongPress={() => onLongPress(item)}
                    delayLongPress={300}
                    activeOpacity={0.9}
                    style={{ flex: 1, alignItems: isMe ? 'flex-end' : 'flex-start' }}
                >
                    {!isMe ? (
                        <View style={[styles.bubbleWrapper, { justifyContent: 'flex-start' }]}>
                            <View
                                style={[
                                    styles.messageBubbleThem,
                                    { backgroundColor: colors.card, borderBottomLeftRadius: 4 }
                                ]}
                            >
                                {item.reply_to && (
                                    <View style={[styles.replyContainer, { backgroundColor: colors.background, borderLeftColor: colors.primary }]}>
                                        <View style={[styles.replyBar, { backgroundColor: colors.primary }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text numberOfLines={1} style={[styles.replySender, { color: colors.primary }]}>{item.reply_to.sender}</Text>
                                            <Text numberOfLines={1} style={[styles.replyText, { color: colors.text }]}>{item.reply_to.text}</Text>
                                        </View>
                                    </View>
                                )}

                                {item.file && (
                                    <View style={{ marginBottom: item.text ? 8 : 0 }}>
                                        {item.file_type?.startsWith('image/') ? (
                                            <TouchableOpacity
                                                onPress={handleMediaPress}
                                                onLongPress={() => onLongPress(item)}
                                                delayLongPress={200}
                                                activeOpacity={0.95}
                                                style={styles.mediaContainer}
                                            >
                                                {getImageSource() && (
                                                    <Image
                                                        source={getImageSource()!}
                                                        style={styles.messageImage}
                                                        resizeMode="cover"
                                                        onError={handleImageError}
                                                    />
                                                )}
                                            </TouchableOpacity>
                                        ) : item.file_type?.startsWith('video/') ? (
                                            <TouchableOpacity
                                                onPress={handleMediaPress}
                                                style={[styles.videoPreview, styles.mediaContainer]}
                                                onLongPress={() => onLongPress(item)}
                                                delayLongPress={200}
                                                activeOpacity={0.95}
                                            >
                                                <View style={styles.videoThumbnail}>
                                                    {/* Better video placeholder */}
                                                    <View style={[styles.playButtonCircle, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                                                        <MaterialCommunityIcons name="play" size={24} color="white" />
                                                    </View>
                                                </View>
                                                <LinearGradient
                                                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                                                    style={styles.videoInfoOverlay}
                                                >
                                                    <Text style={styles.videoDurationText}>0:30</Text> {/* Placeholder duration */}
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={[styles.documentPreview, { backgroundColor: colors.backgroundSecondary }]}>
                                                <View style={[styles.fileIconBubble, { backgroundColor: colors.background }]}>
                                                    <MaterialCommunityIcons
                                                        name={item.file_type === 'application/pdf' ? "file-pdf-box" : "file-document-outline"}
                                                        size={24}
                                                        color={item.file_type === 'application/pdf' ? "#FF5252" : colors.text}
                                                    />
                                                </View>
                                                <View style={styles.fileInfo}>
                                                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                                                        {item.file_name || 'Document'}
                                                    </Text>
                                                    <Text style={[styles.fileType, { color: colors.tabIconDefault }]}>
                                                        {item.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {item.text ? (
                                    <Text style={[styles.messageText, { color: colors.text }]}>
                                        {item.text}
                                    </Text>
                                ) : null}

                                <View style={styles.metaRow}>
                                    <Text style={[styles.timestamp, { color: colors.tabIconDefault }]}>
                                        {item.timestamp.toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Text>
                                </View>
                            </View>
                            {reactions.length > 0 && (
                                <View style={[styles.reactionBadge, { borderColor: colors.background }]}>
                                    <Text style={{ fontSize: 10 }}>{reactions[0]}</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={[styles.bubbleWrapper, { justifyContent: 'flex-end' }]}>
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]} // Keep gradient for 'me'
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[styles.messageBubbleMe, { borderBottomRightRadius: 4 }]}
                            >
                                {item.reply_to && (
                                    <View style={[styles.replyContainer, { backgroundColor: 'rgba(0,0,0,0.1)', borderLeftColor: 'white' }]}>
                                        <View style={[styles.replyBar, { backgroundColor: 'white' }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text numberOfLines={1} style={[styles.replySender, { color: 'white' }]}>{item.reply_to.sender}</Text>
                                            <Text numberOfLines={1} style={[styles.replyText, { color: 'rgba(255,255,255,0.8)' }]}>{item.reply_to.text}</Text>
                                        </View>
                                    </View>
                                )}

                                {item.file && (
                                    <View style={{ marginBottom: item.text ? 8 : 0 }}>
                                        {item.file_type?.startsWith('image/') ? (
                                            <TouchableOpacity
                                                onPress={handleMediaPress}
                                                onLongPress={() => onLongPress(item)}
                                                delayLongPress={200}
                                                activeOpacity={0.95}
                                                style={styles.mediaContainer}
                                            >
                                                {getImageSource() && (
                                                    <Image
                                                        source={getImageSource()!}
                                                        style={styles.messageImage}
                                                        resizeMode="cover"
                                                        onError={handleImageError}
                                                    />
                                                )}
                                            </TouchableOpacity>
                                        ) : item.file_type?.startsWith('video/') ? (
                                            <TouchableOpacity
                                                onPress={handleMediaPress}
                                                style={[styles.videoPreview, styles.mediaContainer]}
                                                onLongPress={() => onLongPress(item)}
                                                delayLongPress={200}
                                                activeOpacity={0.95}
                                            >
                                                <View style={styles.videoThumbnail}>
                                                    <View style={[styles.playButtonCircle, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                                                        <MaterialCommunityIcons name="play" size={24} color="white" />
                                                    </View>
                                                </View>
                                                <LinearGradient
                                                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                                                    style={styles.videoInfoOverlay}
                                                >
                                                    <Text style={styles.videoDurationText}>0:30</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={[styles.documentPreview, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                                                <View style={[styles.fileIconBubble, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                                    <MaterialCommunityIcons
                                                        name={item.file_type === 'application/pdf' ? "file-pdf-box" : "file-document-outline"}
                                                        size={24}
                                                        color="white"
                                                    />
                                                </View>
                                                <View style={styles.fileInfo}>
                                                    <Text style={[styles.fileName, { color: "white" }]} numberOfLines={1}>
                                                        {item.file_name || 'Document'}
                                                    </Text>
                                                    <Text style={[styles.fileType, { color: "rgba(255,255,255,0.7)" }]}>
                                                        {item.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {item.text ? (
                                    <Text
                                        style={[
                                            styles.messageText,
                                            { color: 'white' },
                                        ]}
                                    >
                                        {item.text}
                                    </Text>
                                ) : null}

                                <View style={styles.metaRowMe}>
                                    <Text
                                        style={{
                                            fontSize: 10,
                                            color: 'rgba(255,255,255,0.7)',
                                            marginRight: 4,
                                        }}
                                    >
                                        {item.timestamp.toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name={item.isRead ? 'check-all' : (item.isDelivered ? 'check-all' : 'check')} // Assume check-all for delivered too for simplicity if not distinct
                                        size={14}
                                        color={
                                            item.isRead
                                                ? '#FFF' // Blue or distinct color if viewed? For white text, keep white
                                                : 'rgba(255,255,255,0.5)'
                                        }
                                    />
                                </View>
                            </LinearGradient>
                            {reactions.length > 0 && (
                                <View style={[styles.reactionBadge, { left: -6 }]}>
                                    <Text style={{ fontSize: 10 }}>{reactions[0]}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <MediaViewer
                visible={viewerVisible}
                mediaUri={typeof item.file === 'string' ? item.file : (item.file as any)?.uri || null}
                mediaType={getMediaType()}
                onClose={() => setViewerVisible(false)}
            />
        </Swipeable>
    );
};

const styles = StyleSheet.create({
    swipeLeftAction: {
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingLeft: 15,
        width: 60,
        height: '100%',
    },
    swipeRightAction: {
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 15,
        width: 60,
        height: '100%',
    },
    messageContainer: {
        marginBottom: 8,
        maxWidth: '100%',
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    myMessageContainer: { justifyContent: 'flex-end' },
    theirMessageContainer: { justifyContent: 'flex-start' },

    avatarContainer: {
        width: 28,
        height: 28,
        marginRight: 8,
        marginBottom: 2,
    },
    avatarStats: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },

    bubbleWrapper: {
        position: 'relative',
        maxWidth: '82%',
    },

    messageBubbleThem: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 18,
        minWidth: 60,
        shadowColor: "rgba(0,0,0,0.05)",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 1,
        elevation: 1,
    },
    messageBubbleMe: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 18,
        minWidth: 60,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 2,
        opacity: 0.7,
    },
    metaRowMe: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 2,
    },
    timestamp: {
        fontSize: 10,
    },
    deletedMessageBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        paddingHorizontal: 16,
        borderRadius: 16,
    },

    reactionBadge: {
        position: 'absolute',
        bottom: -6,
        backgroundColor: 'white',
        borderRadius: 12,
        paddingHorizontal: 5,
        paddingVertical: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 1,
        elevation: 2,
        borderWidth: 1.5,
        borderColor: 'white',
        minWidth: 20,
        alignItems: 'center',
        zIndex: 10,
    },
    replyContainer: {
        flexDirection: 'row',
        padding: 6,
        paddingLeft: 8,
        borderRadius: 6,
        marginBottom: 6,
        overflow: 'hidden',
        borderLeftWidth: 2,
    },
    replyBar: {
        display: 'none', // Using borderLeft instead for cleaner look
    },
    replySender: {
        fontWeight: '600',
        fontSize: 11,
        marginBottom: 1,
    },
    replyText: {
        fontSize: 11,
    },
    mediaContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 4,
    },
    messageImage: {
        width: 220,
        height: 160,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    videoPreview: {
        width: 220,
        height: 160,
        borderRadius: 12, // Match image
        overflow: 'hidden',
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
    },
    videoThumbnail: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButtonCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
    },
    videoInfoOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        justifyContent: 'flex-end',
        padding: 8,
    },
    videoDurationText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    documentPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 10,
        maxWidth: 240,
    },
    fileIconBubble: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    fileName: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    fileType: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 1,
    },
    fileInfo: {
        flex: 1,
        justifyContent: 'center',
    },
});

export const MessageItem = React.memo(MessageItemComponent);
