import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  effect,
  HostListener,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AiAssistantService,
  AiAction,
  AiProvider,
  WEBGPU_MODELS,
  AiConfig,
  MdIcon,
} from 'md-core';
import { marked } from 'marked';

@Component({
  selector: 'app-ai-modal',
  standalone: true,
  imports: [FormsModule, MdIcon],
  templateUrl: './ai-modal.html',
  styleUrl: './ai-modal.css',
})
export class AiModal {
  protected readonly aiService = inject(AiAssistantService);

  readonly initialAction = input<AiAction | null>(null);
  readonly initialPrompt = input<string>('');
  readonly documentContent = input<string>('');
  readonly selectedText = input<string>('');

  readonly close = output<void>();
  readonly insertText = output<{ text: string; mode: 'insert' | 'replace' | 'append' }>();

  protected readonly isSettingsView = signal<boolean>(false);
  protected readonly activeTab = signal<'preview' | 'raw'>('preview');
  protected readonly currentAction = signal<AiAction>('summarize');
  protected readonly customPromptInput = signal<string>('');
  protected readonly outputResult = signal<string>('');
  protected readonly isCopied = signal<boolean>(false);
  protected readonly showApiKey = signal<boolean>(false);

  // Editable settings copy
  protected readonly editConfig = signal<AiConfig>({ ...this.aiService.config() });

  protected readonly webgpuModels = WEBGPU_MODELS;
  protected readonly isCacheClearing = signal<boolean>(false);
  protected readonly cacheClearSuccess = signal<boolean>(false);

  protected readonly renderedHtml = computed(() => {
    const text = this.outputResult();
    if (!text) return '';
    try {
      return marked.parse(text) as string;
    } catch {
      return text;
    }
  });

  protected readonly activeContextText = computed(() => {
    const sel = this.selectedText().trim();
    if (sel) return sel;
    return this.documentContent().trim();
  });

  protected readonly isUsingSelection = computed(() => {
    return !!this.selectedText().trim();
  });

  constructor() {
    effect(() => {
      const act = this.initialAction();
      const p = this.initialPrompt();
      if (act) {
        this.currentAction.set(act);
        if (p) this.customPromptInput.set(p);
        this.runAction(act);
      }
    });

    effect(() => {
      this.editConfig.set({ ...this.aiService.config() });
    });
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (this.aiService.progress().status === 'generating') {
      this.stop();
      return;
    }
    this.closeModal();
  }

  protected closeModal(): void {
    this.stop();
    this.close.emit();
  }

  protected toggleSettings(): void {
    this.isSettingsView.update((v) => !v);
  }

  protected async saveSettings(): Promise<void> {
    await this.aiService.updateConfig(this.editConfig());
    this.isSettingsView.set(false);
  }

  protected setProvider(provider: AiProvider): void {
    this.editConfig.update((c) => ({ ...c, provider }));
  }

  protected async runAction(action: AiAction): Promise<void> {
    this.currentAction.set(action);
    this.outputResult.set('');
    this.isSettingsView.set(false);

    let prompt: string | undefined = undefined;
    if (action === 'custom') {
      prompt = this.customPromptInput().trim();
      if (!prompt) return;
    }

    try {
      await this.aiService.generate({
        action,
        prompt,
        contextText: this.activeContextText(),
        onChunk: (_chunk, fullText) => {
          this.outputResult.set(fullText);
        },
      });
    } catch (err) {
      // Error handled in service state
    }
  }

  protected async submitCustomPrompt(): Promise<void> {
    const prompt = this.customPromptInput().trim();
    if (!prompt) return;
    await this.runAction('custom');
  }

  protected stop(): void {
    this.aiService.abort();
  }

  protected applyInsert(mode: 'insert' | 'replace' | 'append'): void {
    const text = this.outputResult();
    if (!text) return;
    this.insertText.emit({ text, mode });
    this.closeModal();
  }

  protected copyOutput(): void {
    const text = this.outputResult();
    if (!text) return;
    navigator.clipboard.writeText(text);
    this.isCopied.set(true);
    setTimeout(() => this.isCopied.set(false), 2000);
  }

  protected async clearModelCache(): Promise<void> {
    this.isCacheClearing.set(true);
    try {
      await this.aiService.clearWebGpuCache();
      this.cacheClearSuccess.set(true);
      setTimeout(() => this.cacheClearSuccess.set(false), 3000);
    } finally {
      this.isCacheClearing.set(false);
    }
  }
}
