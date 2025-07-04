Task: Roadmap to Check and Fix AES256 Encryption Vulnerability

Description;

To migrate to protect users' data with AES256;

AES-256-CBC implementation
PBKDF2 key derivation
Zero-knowledge architecture design
Security audit control
IV random key creation

While doing these, you are responsible for protecting users' previous information and migrating it to the new encryption mechanism.

Creating a New Key but Migrating the Old One
Getting Key with Supabase API End Point
Getting Key as Runtime with Secure Store
Developing methods to not keep the key in RAM
Preventing key security vulnerability in app.config.js

Acceptance Criteria

- Step by Step verify
- Determining relationships between files and secure migration plan
- Getting secure key from Supabase API End Point with Secure Store
- Zero Knowledge Proof Architecture
- Military Based Protection

Technical Requirements

- AES-256-CBC implementation
- PBKDF2 key derivation
- Zero-knowledge architecture design
- Security audit control
- IV random key creation

Dependencies

- app/utils/encryption.tsx
- CryptoJS from 'crypto-js';
