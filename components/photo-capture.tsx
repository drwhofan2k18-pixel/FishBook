import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { captureError } from '@/lib/crash-reporting';
import { colors } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

interface PhotoCaptureProps {
  onPhotoTaken: (uri: string) => void;
  onRetake?: () => void;
  photoUri?: string | null;
}

export default function PhotoCapture({ onPhotoTaken, onRetake, photoUri }: PhotoCaptureProps) {

  const { colors } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    if (!permission?.granted && !permission?.canAskAgain) {
      // Permission denied permanently
    }
  }, [permission]);

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo: CameraCapturedPicture = await cameraRef.current.takePictureAsync();
      if (photo?.uri) {
        onPhotoTaken(photo.uri);
      }
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), { context: 'photo-capture' });
    }
  };

  // Permission not determined yet
  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Ionicons name="camera-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.placeholderText}>Camera initializing...</Text>
        </View>
      </View>
    );
  }

  // Permission not granted
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Ionicons name="close-circle-outline" size={48} color={colors.danger} />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            FishBook needs camera access to identify and log your catches.
          </Text>
          <View style={styles.permissionButtons}>
            {permission.canAskAgain && (
              <TouchableOpacity style={styles.permitButton} onPress={requestPermission} accessibilityLabel="Grant camera access" accessibilityRole="button">
                <Text style={styles.permitButtonText}>Grant Access</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => Linking.openSettings()}
              accessibilityLabel="Open device settings"
              accessibilityRole="button"
            >
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Show preview if photo taken
  if (photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        <View style={styles.previewActions}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => {
              onRetake?.();
            }}
            accessibilityLabel="Retake photo"
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={20} color={colors.danger} />
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Camera viewfinder
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={() => setIsCameraReady(true)}
      >
        {/* Viewfinder overlay guides */}
        <View style={styles.viewfinder}>
          <View style={styles.viewfinderTop} />
          <View style={styles.viewfinderMiddle}>
            <View style={styles.viewfinderSide} />
            <View style={styles.viewfinderFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.viewfinderSide} />
          </View>
          <View style={styles.viewfinderBottom}>
            <Text style={styles.guideText}>Hold steady · Get full fish in frame</Text>
          </View>
        </View>
      </CameraView>

      {/* Capture button */}
      <View style={styles.captureButtonContainer}>
        <TouchableOpacity
          style={[styles.captureButton, !isCameraReady && styles.captureButtonDisabled]}
          onPress={takePicture}
          disabled={!isCameraReady}
        >
          <View style={styles.captureInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.textPrimary,
  },
  camera: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.divider,
    padding: 24,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 12,
  },
  permissionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  permissionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  permitButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  permitButtonText: {
    color: colors.textOnPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
  settingsButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  settingsButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  preview: {
    flex: 1,
  },
  previewActions: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  retakeText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  viewfinder: {
    flex: 1,
  },
  viewfinderTop: {
    flex: 1,
  },
  viewfinderMiddle: {
    flexDirection: 'row',
  },
  viewfinderSide: {
    flex: 1,
  },
  viewfinderFrame: {
    width: 240,
    height: 160,
    position: 'relative',
  },
  viewfinderBottom: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideText: {
    color: colors.textOnPrimary,
    fontSize: 13,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.white,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  captureButtonContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  captureButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background,
  },
});
