# 1. **Generate a New Encryption Key**

- On the server side, generate a new encryption key for each user.
- Never embed this key in the client; only deliver it securely via API.

---

# 2. **Generate IV from User UUID**

- To generate a user-specific IV, use the first 16 bytes of the UUID:
  ```js
  const iv = CryptoJS.enc.Utf8.parse(userUUID.substring(0, 16));
  ```
- Since the UUID does not change, the IV will be constant but user-specific. (For higher security, a random IV per data item is recommended, but this is also a good level.)

---

# 3. **Key Derivation with PBKDF2**

- Use PBKDF2 to derive a key from a user-specific password (e.g., userUUID + server secret):
  ```js
  const key = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 10000 });
  ```
- You can use the userUUID or another unique value as the salt.

---

# 4. **Migration Plan**

### a) **Preparation**

- Write new encryption functions.
- Create an API endpoint: When the user logs in, return the new key.
- Store the key on the device using Secure Storage.

### b) **Migration Flag**

- Add a flag like "migratedToNewEncryption" for each user (e.g., in Supabase or your own backend).
- On app launch:
  - If the flag is missing: Decrypt data with the old key, re-encrypt with the new key, and save in the new format.
  - If migration is successful, update the flag.

### c) **Clean Up Keys and API Keys**

- After migration is complete, remove old keys and API keys from code and config.
- Do this after two updates to allow users on older versions to complete migration.

---

# 5. **Remove Key from env and app.config**

- Completely remove ENCRYPTION_KEY and other sensitive keys from .env and app.config.js.
- Only keep public (safe) keys.

---

# 6. **Fetch Key from API Endpoint and Store with Secure Storage**

- When the user logs in, fetch the new encryption key from the backend.
- Store it on the device using Secure Storage; do not keep it in RAM.

---

# 7. **Run Migration Flag Only Once**

- The migration process should only run once. Check with a flag for each user.

---

# 8. **Delete Old Keys and API Keys After 2 Updates**

- In two new versions of the app, completely remove migration code and old keys.

---

## **Sample Migration Flow (Pseudocode)**

```js
if (!user.migratedToNewEncryption) {
  // 1. Decrypt data with the old key
  const oldData = decryptWithOldKey(user.encryptedData);

  // 2. Fetch the new key from the API
  const newKey = await fetchNewKeyFromAPI(user.id);

  // 3. Generate IV from userUUID
  const iv = CryptoJS.enc.Utf8.parse(user.uuid.substring(0, 16));

  // 4. Derive the new key with PBKDF2
  const derivedKey = CryptoJS.PBKDF2(user.uuid + serverSecret, salt, {
    keySize: 256 / 32,
    iterations: 10000,
  });

  // 5. Encrypt data with the new key
  const newEncryptedData = encryptWithNewKey(oldData, derivedKey, iv);

  // 6. Save the new data and update the migration flag
  await saveNewEncryptedData(user.id, newEncryptedData);
  await setMigrationFlag(user.id, true);
}
```

---

## **Points to Consider**

- Ensure no data loss during migration.
- If migration fails, show a warning to the user.
- Do not delete old keys until migration is complete.
- Test platform compatibility for Secure Storage usage.
- Ensure API endpoint security (JWT, HTTPS, rate limiting).

---

## **Extra: Automation and Monitoring**

- Log migration operations (errors, successes, user id).
- If necessary, add an admin panel to manually trigger migration.

---

## **Conclusion**

This plan includes best practices for both security and user experience.  
If you wish, I can also write detailed sample code or a migration script.  
Would you like that?

You made a very good point!  
**Using a random IV for each data item** is the most secure approach in modern encryption. However, you need to know the IV during decryption.  
Below, I explain the method and reasoning used in professional applications in detail:

---

## 1. **Principle of Using Random IV**

- **Generate a new IV for each encryption operation:**
  ```js
  const iv = CryptoJS.lib.WordArray.random(16);
  ```
- **Attach the IV to the beginning (or end) of the encrypted data.**
- **During decryption:**
  - Extract the IV from the encrypted data, then decrypt the rest with the key.

---

## 2. **User-Specific Key Understanding**

- Continue using a user-specific key (e.g., PBKDF2 with userUUID + serverSecret).
- The IV is random for each data item and stored within the encrypted data.
- So, **user-specific key + random IV at the start of the data** is used for encryption/decryption.

---

## 3. **How to Apply in Practice?**

### **Encryption:**

```js
const iv = CryptoJS.lib.WordArray.random(16);
const encrypted = CryptoJS.AES.encrypt(data, userKey, {
  iv,
  mode: CryptoJS.mode.CBC,
  padding: CryptoJS.pad.Pkcs7,
});
// Add the IV as base64 to the start of the encrypted data
const result = iv.toString(CryptoJS.enc.Base64) + ':' + encrypted.toString();
```

### **Decryption:**

```js
const [ivBase64, encryptedData] = result.split(':');
const iv = CryptoJS.enc.Base64.parse(ivBase64);
const decrypted = CryptoJS.AES.decrypt(encryptedData, userKey, {
  iv,
  mode: CryptoJS.mode.CBC,
  padding: CryptoJS.pad.Pkcs7,
});
const data = decrypted.toString(CryptoJS.enc.Utf8);
```

---

## 4. **Advantages**

- Since a different IV is used for each data item, encrypting the same data twice produces different outputs.
- Since the IV is stored within the encrypted data, you always know which IV to use during decryption.
- Encryption/decryption continues securely with a user-specific key.

---

## 5. **Summary**

- **If you use a random IV, add the IV to the start of the encrypted data.**
- Extract the IV from there during decryption.
- Continue using a user-specific key for encryption/decryption.
- This method is both secure and industry standard.

---

## **Extra: Storing with JSON Format (More readable and secure)**

```js
// Encryption
const payload = {
  iv: iv.toString(CryptoJS.enc.Base64),
  data: encrypted.toString()
};
const result = JSON.stringify(payload);

// Decryption
const payload = JSON.parse(result);
const iv = CryptoJS.enc.Base64.parse(payload.iv);
const decrypted = CryptoJS.AES.decrypt(payload.data, userKey, { iv, ... });
```

---

**In short:**  
If you want to use a random IV, add the IV to the start/end or inside a JSON object with the encrypted data.  
When decrypting with a user-specific key, extract the IV from there.  
This is the most secure and professional method.
