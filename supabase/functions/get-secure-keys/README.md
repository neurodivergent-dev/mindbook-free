# Secure Keys Edge Function

Bu Edge Function, encryption anahtarı gibi hassas bilgileri güvenli bir şekilde istemci uygulamasına sağlamak için kullanılır.

## Amaç

- Encryption key'i client-side kodunda saklamaktan kaçınmak
- Sadece yetkili kullanıcıların güvenli anahtarlara erişmesini sağlamak
- Anahtarların uygulama APK/IPA'sında depolanmasını önlemek

## Kullanım

1. Supabase projenizin dashboard'una gidin
2. Edge Functions bölümünde `get-secure-keys` için aşağıdaki çevre değişkenlerini ayarlayın:
   - `ENCRYPTION_KEY`: Veri şifrelemesi için kullanılan anahtar

## Deployment

Bu Edge Function'ı Supabase'e deploy etmek için:

```bash
cd supabase/functions
supabase functions deploy get-secure-keys --project-ref your-project-ref
```

## İstemci Tarafı Entegrasyonu

Client tarafında encryption key'i almak için `secureKeyService.ts` modülünü kullanın:

```typescript
import { getEncryptionKey } from '../utils/secureKeyService';

// Asenkron olarak encryption key'i almak
const encryptionKey = await getEncryptionKey();

// Şimdi bu anahtar ile verilerinizi şifreleyebilirsiniz
```

## Güvenlik Notları

- Bu Edge Function yalnızca yetkili kullanıcıların isteklerine yanıt verir
- İstek başlığında geçerli bir JWT token gereklidir
- Encryption key'i cache'lenir, ancak güvenlik için logout sırasında temizlenmelidir
