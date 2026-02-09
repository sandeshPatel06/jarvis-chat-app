import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert, Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAppTheme } from '@/hooks/useAppTheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';



interface ImageEditorProps {
    imageUri: string;
    onSave: (editedUri: string) => void;
    onCancel: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ imageUri, onSave, onCancel }) => {
    const { colors } = useAppTheme();
    const [currentUri, setCurrentUri] = useState(imageUri);
    const [processing, setProcessing] = useState(false);
    const [rotation, setRotation] = useState(0);

    const handleRotate = async () => {
        try {
            setProcessing(true);
            const newRotation = (rotation + 90) % 360;
            const result = await ImageManipulator.manipulateAsync(
                currentUri,
                [{ rotate: 90 }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );
            setCurrentUri(result.uri);
            setRotation(newRotation);
        } catch (error) {
            console.error('Rotate error:', error);
            Alert.alert('Error', 'Failed to rotate image');
        } finally {
            setProcessing(false);
        }
    };

    const handleFlip = async (direction: 'horizontal' | 'vertical') => {
        try {
            setProcessing(true);
            const result = await ImageManipulator.manipulateAsync(
                currentUri,
                [{ flip: direction === 'horizontal' ? ImageManipulator.FlipType.Horizontal : ImageManipulator.FlipType.Vertical }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );
            setCurrentUri(result.uri);
        } catch (error) {
            console.error('Flip error:', error);
            Alert.alert('Error', 'Failed to flip image');
        } finally {
            setProcessing(false);
        }
    };



    const handleCompress = async () => {
        try {
            setProcessing(true);
            const result = await ImageManipulator.manipulateAsync(
                currentUri,
                [],
                { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
            );
            setCurrentUri(result.uri);
            Alert.alert('Success', 'Image compressed to reduce file size');
        } catch (error) {
            console.error('Compress error:', error);
            Alert.alert('Error', 'Failed to compress image');
        } finally {
            setProcessing(false);
        }
    };

    const handleSave = () => {
        onSave(currentUri);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Image Preview */}
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: currentUri }}
                    style={styles.image}
                    resizeMode="contain"
                />
                {processing && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                )}
            </View>

            {/* Tools */}
            <View style={[styles.toolsContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <Text style={[styles.toolsTitle, { color: colors.text }]}>Edit Image</Text>

                <View style={styles.toolsRow}>
                    <TouchableOpacity
                        style={[styles.toolButton, { backgroundColor: colors.background }]}
                        onPress={handleRotate}
                        disabled={processing}
                    >
                        <FontAwesome name="rotate-right" size={24} color={colors.text} />
                        <Text style={[styles.toolText, { color: colors.text }]}>Rotate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.toolButton, { backgroundColor: colors.background }]}
                        onPress={() => handleFlip('horizontal')}
                        disabled={processing}
                    >
                        <FontAwesome name="arrows-h" size={24} color={colors.text} />
                        <Text style={[styles.toolText, { color: colors.text }]}>Flip H</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.toolButton, { backgroundColor: colors.background }]}
                        onPress={() => handleFlip('vertical')}
                        disabled={processing}
                    >
                        <FontAwesome name="arrows-v" size={24} color={colors.text} />
                        <Text style={[styles.toolText, { color: colors.text }]}>Flip V</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.toolButton, { backgroundColor: colors.background }]}
                        onPress={handleCompress}
                        disabled={processing}
                    >
                        <FontAwesome name="compress" size={24} color={colors.text} />
                        <Text style={[styles.toolText, { color: colors.text }]}>Compress</Text>
                    </TouchableOpacity>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton, { borderColor: colors.border }]}
                        onPress={onCancel}
                    >
                        <Text style={[styles.actionText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.saveButton, { backgroundColor: colors.primary }]}
                        onPress={handleSave}
                        disabled={processing}
                    >
                        <Text style={[styles.actionText, { color: '#fff' }]}>Save</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    toolsContainer: {
        padding: 20,
        borderTopWidth: 1,
    },
    toolsTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15,
    },
    toolsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    toolButton: {
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        minWidth: 70,
    },
    toolText: {
        fontSize: 12,
        marginTop: 4,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        borderWidth: 1,
    },
    saveButton: {
        // backgroundColor set dynamically
    },
    actionText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
