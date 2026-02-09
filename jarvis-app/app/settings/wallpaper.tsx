import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 60) / 3;

const SOLID_COLORS = [
    '#FFFFFF', // Default
    '#E3F2FD', // Light Blue
    '#E8F5E9', // Light Green
    '#FFF3E0', // Light Orange
    '#F3E5F5', // Light Purple
    '#ECEFF1', // Light Gray
    '#263238', // Dark Slate
    '#000000', // Black
    '#1A237E', // Navy
];

const PRESET_PHOTOS = [
    { id: '1', uri: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&q=80' }, // Gradient
    { id: '2', uri: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80' }, // Abstract
    { id: '3', uri: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80' }, // Space
    { id: '4', uri: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400&q=80' }, // Rain
    { id: '5', uri: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80' }, // Nature
    { id: '6', uri: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80' }, // Colorful
];

export default function WallpaperSettingsScreen() {
    const { colors } = useAppTheme();
    const router = useRouter();
    const user = useStore((state) => state.user);
    const updateSettings = useStore((state) => state.updateSettings);
    const showAlert = useStore((state) => state.showAlert);

    // Determine current selection type
    const currentWallpaper = user?.chat_wallpaper || 'default';
    const isKnownPreset = PRESET_PHOTOS.some(p => p.uri === currentWallpaper) || SOLID_COLORS.includes(currentWallpaper) || currentWallpaper === 'default';
    const isCustom = !isKnownPreset && !!currentWallpaper;

    const handleSelectColor = (color: string) => {
        router.push(`/settings/wallpaper-preview?uri=${encodeURIComponent(color)}`);
    };

    const handleSelectPreset = (uri: string) => {
        router.push(`/settings/wallpaper-preview?uri=${encodeURIComponent(uri)}`);
    };

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showAlert('Permission needed', 'Please allow access to your photos to set a custom wallpaper.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [9, 16],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            router.push(`/settings/wallpaper-preview?uri=${encodeURIComponent(result.assets[0].uri)}`);
        }
    };

    const handleReset = () => {
        updateSettings({ chat_wallpaper: 'default' });
    };

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Chat Wallpaper</Text>
                <TouchableOpacity onPress={handleReset}>
                    <Text style={{ color: colors.primary, fontSize: 16 }}>Reset</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Custom Photo Section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Custom</Text>
                <View style={styles.grid}>
                    {/* Add Button */}
                    <TouchableOpacity
                        style={[styles.photoItem, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={handlePickImage}
                    >
                        <FontAwesome name="plus" size={24} color={colors.primary} />
                        <Text style={{ marginTop: 8, fontSize: 12, color: colors.text, fontWeight: '600' }}>Add Photo</Text>
                    </TouchableOpacity>

                    {/* Active Custom Wallpaper */}
                    {isCustom && (
                        <TouchableOpacity
                            style={[styles.photoItem, styles.selectedItem]}
                            activeOpacity={1}
                        >
                            <Image source={{ uri: currentWallpaper }} style={styles.photo} />
                            <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                                <FontAwesome name="check" size={14} color="white" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Solid Colors */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Solid Colors</Text>
                <View style={styles.grid}>
                    {SOLID_COLORS.map((color) => (
                        <TouchableOpacity
                            key={color}
                            style={[
                                styles.colorItem,
                                { backgroundColor: color, borderColor: colors.border },
                                currentWallpaper === color && styles.selectedItem
                            ]}
                            onPress={() => handleSelectColor(color)}
                        >
                            {currentWallpaper === color && (
                                <View style={styles.checkIcon}>
                                    <FontAwesome name="check" size={16} color={color === '#FFFFFF' || color === '#E3F2FD' || color === '#E8F5E9' || color === '#FFF3E0' || color === '#F3E5F5' || color === '#ECEFF1' ? '#000' : '#FFF'} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Preset Photos */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Themes</Text>
                <View style={styles.grid}>
                    {PRESET_PHOTOS.map((photo) => (
                        <TouchableOpacity
                            key={photo.id}
                            style={[styles.photoItem, currentWallpaper === photo.uri && styles.selectedItem]}
                            onPress={() => handleSelectPreset(photo.uri)}
                        >
                            <Image source={{ uri: photo.uri }} style={styles.photo} />
                            {currentWallpaper === photo.uri && (
                                <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                                    <FontAwesome name="check" size={14} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>
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
        paddingBottom: 15,
        borderBottomWidth: 0.5,
    },
    backButton: {
        padding: 5,
        width: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    content: {
        padding: 20,
        paddingBottom: 50,
    },
    customButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 30,
        gap: 12,
    },
    customButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 15,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 30,
    },
    colorItem: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoItem: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH * 1.5, // Portrait aspect ratio for photos
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    selectedItem: {
        borderColor: '#4FACFE', // Primary Active Blue
        borderWidth: 3,
    },
    checkIcon: {
        position: 'absolute',
        zIndex: 1,
        borderRadius: 12,
        padding: 4,
    }
});
