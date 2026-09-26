import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EncryptionService {
  private readonly PREFIX = 'enc:v1:';
  private readonly ITERATIONS = 100000;

  /** Checks if a string is encrypted */
  isEncrypted(content: string): boolean {
    return typeof content === 'string' && content.startsWith(this.PREFIX);
  }

  /**
   * Encrypts plaintext string using AES-GCM 256-bit with PBKDF2 key derivation.
   */
  async encrypt(plainText: string, passphrase: string): Promise<string> {
    if (!window.crypto?.subtle) {
      throw new Error('Web Cryptography API is not supported in this environment.');
    }

    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
    );

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plainText),
    );

    const saltB64 = this.arrayBufferToBase64(salt);
    const ivB64 = this.arrayBufferToBase64(iv);
    const dataB64 = this.arrayBufferToBase64(encryptedBuffer);

    return `${this.PREFIX}${saltB64}:${ivB64}:${dataB64}`;
  }

  /**
   * Decrypts ciphertext string using AES-GCM 256-bit with PBKDF2 key derivation.
   */
  async decrypt(cipherString: string, passphrase: string): Promise<string> {
    if (!this.isEncrypted(cipherString)) {
      return cipherString;
    }

    if (!window.crypto?.subtle) {
      throw new Error('Web Cryptography API is not supported in this environment.');
    }

    const payload = cipherString.slice(this.PREFIX.length);
    const parts = payload.split(':');
    if (parts.length !== 3) {
      throw new Error('Malformed encrypted payload.');
    }

    const [saltB64, ivB64, dataB64] = parts;
    const salt = this.base64ToArrayBuffer(saltB64);
    const iv = this.base64ToArrayBuffer(ivB64);
    const data = this.base64ToArrayBuffer(dataB64);

    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(salt),
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );

    try {
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        data,
      );

      const dec = new TextDecoder();
      return dec.decode(decryptedBuffer);
    } catch {
      throw new Error('Incorrect password or corrupted ciphertext.');
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
