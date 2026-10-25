// Reads text from a photo ENTIRELY ON THE PHONE (Google ML Kit, offline).
// The image is never uploaded anywhere.
import * as ImagePicker from 'expo-image-picker';
import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';

export async function pickPrescriptionImage(source) {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('CAMERA_DENIED');
    const res = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    return res.canceled ? null : res.assets?.[0]?.uri || null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
  return res.canceled ? null : res.assets?.[0]?.uri || null;
}

// Runs Latin (English) and Devanagari (Hindi/Marathi) recognition and merges the lines.
export async function readTextFromImage(uri) {
  const scripts = TextRecognitionScript
    ? [TextRecognitionScript.LATIN, TextRecognitionScript.DEVANAGARI]
    : [undefined];
  const lines = [];
  for (const script of scripts) {
    try {
      const result = script ? await TextRecognition.recognize(uri, script) : await TextRecognition.recognize(uri);
      (result?.text || '').split(/\r?\n/).forEach((l) => l.trim() && lines.push(l.trim()));
    } catch (e) {
      // one script failing must not stop the other
    }
  }
  return lines;
}
