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

interface PhotoCaptureProps {
  onPhotoTaken: (uri: string) => void;
  onRetake?: () => void;
  photoUri?: string | null;
}

export default function PhotoCapture({ onPhotoTaken, onRetake, photoUri }: PhotoCaptureProps) {
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
      console.error('Failed to take picture:', err);
    }
  };

  // Permission not determined yet
  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Ionicons name="camera-outline" size={48} color="#C7C7CC" />
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
          <Ionicons name="close-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            FishBook needs camera access to identify and log your catches.
          </Text>
          <View style={styles.permissionButtons}>
            {permission.canAskAgain && (
              <TouchableOpacity style={styles.permitButton} onPress={requestPermission}>
                <Text style={styles.permitButtonText}>Grant Access</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => Linking.openSettings()}
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
          >
            <Ionicons name="refresh" size={20} color="#FF3B30" />
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
    backgroundColor: '#1C1C1E',
  },
  camera: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
    padding: 24,
  },
  placeholderText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 12,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 12,
  },
  permissionText: {
    fontSize: 14,
    color: '#8E8E93',
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
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  permitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  settingsButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  settingsButtonText: {
    color: '#007AFF',
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  retakeText: {
    color: '#FF3B30',
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
    color: '#FFFFFF',
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
    borderColor: '#FFFFFF',
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
    borderColor: '#FFFFFF',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
  },
});
