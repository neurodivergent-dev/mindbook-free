// Bu dosya, güvenli şifreleme modülünün nasıl kullanılacağını gösterir
import { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { encryptDataSecurely, decryptDataSecurely, testSecureEncryption } from './secureEncryption';
import { clearEncryptionKeyCache } from './secureKeyService';
import { useAuth } from '../context/AuthContext';

/**
 * Güvenli şifreleme kullanımı örneği
 */
export default function EncryptionDemo() {
  const [isEncryptionWorking, setIsEncryptionWorking] = useState<boolean | null>(null);
  const [encryptedText, setEncryptedText] = useState<string | null>(null);
  const [decryptedData, setDecryptedData] = useState<any>(null);
  const { logout } = useAuth();

  // Şifrelemeyi test et
  useEffect(() => {
    const testEncryption = async () => {
      try {
        const result = await testSecureEncryption();
        setIsEncryptionWorking(result);
      } catch (error) {
        console.error('Test error:', error);
        setIsEncryptionWorking(false);
      }
    };

    testEncryption();
  }, []);

  // Veri şifreleme örneği
  const encryptSomeData = async () => {
    try {
      const data = {
        secretMessage: 'Bu bir gizli mesajdır',
        userId: 12345,
        timestamp: new Date().toISOString(),
      };

      const encrypted = await encryptDataSecurely(data);
      setEncryptedText(encrypted);

      Alert.alert('Başarılı', 'Veri şifrelendi');
    } catch (error) {
      Alert.alert('Hata', 'Şifreleme başarısız');
    }
  };

  // Veri çözme örneği
  const decryptTheData = async () => {
    if (!encryptedText) {
      Alert.alert('Hata', 'Önce veri şifrelemelisin');
      return;
    }

    try {
      const decrypted = await decryptDataSecurely(encryptedText);
      setDecryptedData(decrypted);

      Alert.alert('Başarılı', 'Veri çözüldü');
    } catch (error) {
      Alert.alert('Hata', 'Veri çözme başarısız');
    }
  };

  // Çıkış yaparken önbelleği temizleme örneği
  const handleLogout = async () => {
    // Önbelleği temizle
    clearEncryptionKeyCache();

    // Oturumu sonlandır
    await logout();

    Alert.alert('Bilgi', 'Çıkış yapıldı ve şifreleme anahtarı önbelleği temizlendi');
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Güvenli Şifreleme Demo</Text>

      <Text style={{ marginBottom: 10 }}>
        Şifreleme çalışıyor mu:{' '}
        {isEncryptionWorking === null
          ? 'Test ediliyor...'
          : isEncryptionWorking
          ? 'Evet ✅'
          : 'Hayır ❌'}
      </Text>

      <Button title="Veri Şifrele" onPress={encryptSomeData} />

      {encryptedText && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ marginBottom: 10 }}>Şifrelenmiş veri:</Text>
          <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{encryptedText}</Text>

          <Button title="Şifreyi Çöz" onPress={decryptTheData} style={{ marginTop: 10 }} />
        </View>
      )}

      {decryptedData && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ marginBottom: 10 }}>Çözülmüş veri:</Text>
          <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
            {JSON.stringify(decryptedData, null, 2)}
          </Text>
        </View>
      )}

      <View style={{ marginTop: 40 }}>
        <Button title="Çıkış Yap ve Önbelleği Temizle" onPress={handleLogout} color="#ff3b30" />
      </View>
    </View>
  );
}
