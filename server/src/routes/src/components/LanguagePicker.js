import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useSaathi } from '../context/SaathiContext';
import { SUPPORTED_LANGUAGES } from '../i18n/aiTranslator';
import { C } from '../theme';

// Compact language button + list. Add languages in SUPPORTED_LANGUAGES only.
export default function LanguagePicker({ compact = true }) {
  const { language, setLanguage, t } = useSaathi();
  const [open, setOpen] = useState(false);
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} accessibilityRole="button"
        accessibilityLabel={t('Language')}
        style={{ paddingHorizontal: 10, paddingVertical: compact ? 8 : 12, borderRadius: 10, backgroundColor: C.mint }}>
        <Text style={{ color: C.navy, fontWeight: '800', fontSize: compact ? 13 : 16 }}>🌐 {current.native}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, maxHeight: '75%', padding: 8 }}>
            <FlatList
              data={SUPPORTED_LANGUAGES}
              keyExtractor={(l) => l.code}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={async () => { await setLanguage(item.code); setOpen(false); }}
                  style={{ padding: 14, borderRadius: 10, backgroundColor: language === item.code ? C.mint : 'transparent' }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: C.navy }}>{item.native}</Text>
                  <Text style={{ fontSize: 13, color: C.grey }}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
