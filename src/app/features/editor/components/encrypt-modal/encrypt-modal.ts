import { Component, output, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentStore, EncryptionService, MdIcon } from 'md-core';

@Component({
  selector: 'app-encrypt-modal',
  standalone: true,
  imports: [FormsModule, MdIcon],
  templateUrl: './encrypt-modal.html',
  styleUrl: './encrypt-modal.css',
})
export class EncryptModal {
  private readonly store = inject(DocumentStore);
  private readonly encryptionService = inject(EncryptionService);

  readonly close = output<void>();
  readonly notify = output<string>();

  protected readonly activeDoc = computed(() => this.store.activeDocument());
  protected readonly isLocked = computed(() => !!this.activeDoc()?.isLocked);

  protected readonly password = signal<string>('');
  protected readonly confirmPassword = signal<string>('');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isProcessing = signal<boolean>(false);

  protected async submit(): Promise<void> {
    const doc = this.activeDoc();
    if (!doc) return;

    this.errorMessage.set(null);
    const pass = this.password().trim();

    if (!pass) {
      this.errorMessage.set('Please enter a password.');
      return;
    }

    if (this.isLocked()) {
      // Unlocking
      if (!doc.encryptedData) {
        this.errorMessage.set('No encrypted data found for this document.');
        return;
      }

      this.isProcessing.set(true);
      try {
        const plainText = await this.encryptionService.decrypt(doc.encryptedData, pass);
        this.store.unlockDocument(doc.id, plainText);
        this.notify.emit('Document unlocked successfully!');
        this.close.emit();
      } catch (e: any) {
        this.errorMessage.set('Incorrect password. Could not decrypt document.');
      } finally {
        this.isProcessing.set(false);
      }
    } else {
      // Locking
      if (pass.length < 4) {
        this.errorMessage.set('Password should be at least 4 characters long.');
        return;
      }

      if (pass !== this.confirmPassword().trim()) {
        this.errorMessage.set('Passwords do not match.');
        return;
      }

      this.isProcessing.set(true);
      try {
        const cipherText = await this.encryptionService.encrypt(doc.content, pass);
        this.store.lockDocument(doc.id, cipherText);
        this.notify.emit('Document encrypted and locked with AES-256!');
        this.close.emit();
      } catch (e: any) {
        this.errorMessage.set('Failed to encrypt document: ' + (e.message || 'Unknown error'));
      } finally {
        this.isProcessing.set(false);
      }
    }
  }
}
