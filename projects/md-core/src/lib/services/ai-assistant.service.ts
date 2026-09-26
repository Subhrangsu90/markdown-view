import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { IndexedDbService } from './indexed-db.service';

export type AiProvider = 'webgpu' | 'gemini' | 'openai' | 'ollama';

export interface WebGpuModelOption {
  id: string;
  name: string;
  size: string;
  description: string;
  vramRequired?: string;
}

export const WEBGPU_MODELS: WebGpuModelOption[] = [
  {
    id: 'SmolLM2-135M-Instruct-q0f16-MLC',
    name: 'SmolLM2 135M (Ultra Fast & Lightweight)',
    size: '~135 MB',
    description: 'Instant load, zero lag, ideal for Intel integrated graphics and quick summaries.',
  },
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 360M (Fast & Compact)',
    size: '~250 MB',
    description: 'Fast, great for quick summaries, proofreading, and notes.',
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 0.5B (Recommended)',
    size: '~390 MB',
    description: 'High-quality reasoning, excellent markdown syntax & summaries.',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B (High Quality)',
    size: '~880 MB',
    description: 'Meta Llama 3.2 on-device instruction model for complex queries.',
  },
  {
    id: 'gemma3-1b-it-q4f16_1-MLC',
    name: 'Google Gemma 3 1B (Fast & Smart)',
    size: '~800 MB',
    description: "Google's lightweight Gemma 3 model, fast inference with low memory.",
    vramRequired: '711 MB',
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC-1k',
    name: 'Google Gemma 2 2B (High Reasoning)',
    size: '~1.4 GB',
    description: "Google's powerful 2B model optimized for 1k context on WebGPU.",
    vramRequired: '1.58 GB',
  },
];

export interface AiConfig {
  provider: AiProvider;
  webgpuModel: string;
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  temperature: number;
  systemPrompt: string;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  provider: 'webgpu',
  webgpuModel: 'SmolLM2-135M-Instruct-q0f16-MLC',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  openaiApiKey: '',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiModel: 'gpt-4o-mini',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  temperature: 0.7,
  systemPrompt:
    'You are MarkdownView AI, an expert technical writer and markdown assistant. Always generate well-formatted Markdown with proper headings, lists, tables, or mermaid diagrams when appropriate. Be concise and precise.',
};

export type AiAction = 'summarize' | 'proofread' | 'generate-mermaid' | 'continue' | 'custom';

export interface AiProgressState {
  status: 'idle' | 'loading-model' | 'generating' | 'success' | 'error';
  progressPercentage: number;
  progressText: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly indexedDb = inject(IndexedDbService);

  readonly config = signal<AiConfig>({ ...DEFAULT_AI_CONFIG });
  readonly progress = signal<AiProgressState>({
    status: 'idle',
    progressPercentage: 0,
    progressText: '',
  });

  // Hardware capabilities
  readonly isWebGpuSupported = signal<boolean>(false);

  // Cached WebLLM MLCEngine
  private mlcEngine: any = null;
  private currentEngineModel = '';
  private abortController: AbortController | null = null;

  constructor() {
    if (this.isBrowser) {
      this.checkWebGpuSupport();
      this.loadStoredConfig();
    }
  }

  private async checkWebGpuSupport(): Promise<void> {
    if (!this.isBrowser) return;
    try {
      const supported = typeof navigator !== 'undefined' && 'gpu' in navigator && !!(navigator as any).gpu;
      this.isWebGpuSupported.set(supported);
    } catch {
      this.isWebGpuSupported.set(false);
    }
  }

  sanitizeWebGpuModel(modelId?: string): string {
    if (!modelId) return 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
    // Automatic migration for the previous invalid model ID
    if (modelId === 'SmolLM2-135M-Instruct-q4f16_1-MLC') {
      return 'SmolLM2-135M-Instruct-q0f16-MLC';
    }
    const exists = WEBGPU_MODELS.some((m) => m.id === modelId);
    return exists ? modelId : 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
  }

  private async loadStoredConfig(): Promise<void> {
    try {
      let rawConfig: Partial<AiConfig> | null = null;
      const stored = await this.indexedDb.getSetting<AiConfig>('ai_assistant_config');
      if (stored) {
        rawConfig = stored;
      } else {
        const local = localStorage.getItem('markdown_view_ai_config');
        if (local) {
          rawConfig = JSON.parse(local);
        }
      }

      if (rawConfig) {
        const sanitizedModel = this.sanitizeWebGpuModel(rawConfig.webgpuModel);
        const resolved: AiConfig = {
          ...DEFAULT_AI_CONFIG,
          ...rawConfig,
          webgpuModel: sanitizedModel,
        };
        this.config.set(resolved);
        // Persist migrated config if it was updated
        if (rawConfig.webgpuModel !== sanitizedModel) {
          await this.updateConfig({ webgpuModel: sanitizedModel });
        }
      }
    } catch {
      // Use defaults if error
    }
  }

  async updateConfig(newConfig: Partial<AiConfig>): Promise<void> {
    const updated = { ...this.config(), ...newConfig };
    if (updated.webgpuModel) {
      updated.webgpuModel = this.sanitizeWebGpuModel(updated.webgpuModel);
    }
    this.config.set(updated);
    try {
      if (this.isBrowser) {
        localStorage.setItem('markdown_view_ai_config', JSON.stringify(updated));
        await this.indexedDb.setSetting('ai_assistant_config', updated);
      }
    } catch {
      // Ignored
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.mlcEngine && this.progress().status === 'generating') {
      try {
        this.mlcEngine.interruptGenerate?.();
      } catch {
        // Ignored
      }
    }
    this.progress.set({
      status: 'idle',
      progressPercentage: 0,
      progressText: 'Cancelled',
    });
  }

  /**
   * Main generation entry point supporting streaming responses
   */
  async generate({
    action,
    prompt,
    contextText,
    onChunk,
  }: {
    action: AiAction;
    prompt?: string;
    contextText?: string;
    onChunk: (chunk: string, fullText: string) => void;
  }): Promise<string> {
    this.abort();
    this.abortController = new AbortController();

    const provider = this.config().provider;
    const finalPrompt = this.constructPrompt(action, prompt, contextText);

    this.progress.set({
      status: 'generating',
      progressPercentage: 0,
      progressText: 'Preparing generation...',
    });

    try {
      let result = '';
      if (provider === 'webgpu') {
        result = await this.generateWebGpu(finalPrompt, onChunk);
      } else if (provider === 'gemini') {
        result = await this.generateGemini(finalPrompt, onChunk);
      } else if (provider === 'openai') {
        result = await this.generateOpenAi(finalPrompt, onChunk);
      } else if (provider === 'ollama') {
        result = await this.generateOllama(finalPrompt, onChunk);
      } else {
        throw new Error(`Unsupported AI provider: ${provider}`);
      }

      this.progress.set({
        status: 'success',
        progressPercentage: 100,
        progressText: 'Completed',
      });
      return result;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.progress.set({
          status: 'idle',
          progressPercentage: 0,
          progressText: 'Stopped by user',
        });
        return '';
      }
      const message = err?.message || 'AI generation failed.';
      this.progress.set({
        status: 'error',
        progressPercentage: 0,
        progressText: 'Failed',
        error: message,
      });
      throw err;
    }
  }

  private constructPrompt(action: AiAction, customPrompt?: string, contextText?: string): string {
    const text = (contextText || '').trim();
    switch (action) {
      case 'summarize':
        return `Please provide a concise, high-impact executive summary and key takeaways of the following markdown document. Use markdown bullet points and bold text for key terms:\n\n---\n${text}\n---`;
      case 'proofread':
        return `Proofread and enhance the following text. Fix grammatical mistakes, spelling, awkward flow, and clarity while strictly preserving all Markdown structure (headings, formatting, math equations, code blocks, lists). Return ONLY the improved text directly without any conversational preamble:\n\n---\n${text}\n---`;
      case 'generate-mermaid':
        return `Analyze the following content or topic and generate a clean, syntactically correct Mermaid diagram code block (e.g. \`\`\`mermaid\ngraph TD\n...\n\`\`\`). Choose the best diagram type (flowchart, sequenceDiagram, classDiagram, or mindmap). Return ONLY the markdown code block containing the diagram:\n\n---\n${text || customPrompt}\n---`;
      case 'continue':
        return `Seamlessly continue writing from the end of the provided text. Maintain the exact same style, formatting, voice, and subject matter. Output ONLY the new continuation text without repeating earlier paragraphs:\n\n---\n${text}\n---`;
      case 'custom':
      default:
        if (text) {
          return `${customPrompt || 'Process the following document'}:\n\n---\n${text}\n---`;
        }
        return customPrompt || 'Hello, how can I help you write today?';
    }
  }

  async clearWebGpuCache(modelId?: string): Promise<void> {
    if (!this.isBrowser) return;
    try {
      const webllm = await import('@mlc-ai/web-llm');
      const targetModel = modelId || this.sanitizeWebGpuModel(this.config().webgpuModel);
      const appConfig = {
        ...webllm.prebuiltAppConfig,
        cacheBackend: 'indexeddb' as const,
      };
      try {
        await webllm.deleteModelAllInfoInCache(targetModel, appConfig);
      } catch {
        // Ignored
      }
      this.mlcEngine = null;
      this.currentEngineModel = '';
      if ('indexedDB' in window) {
        ['webllm/config', 'webllm/wasm', 'webllm/model'].forEach((db) => {
          try {
            window.indexedDB.deleteDatabase(db);
          } catch {
            // Ignored
          }
        });
      }
      if ('caches' in window) {
        const keys = await window.caches.keys();
        for (const key of keys) {
          if (key.includes('webllm')) {
            await window.caches.delete(key);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to clear WebGPU cache:', e);
    }
  }

  // ==========================================
  // In-Browser WebGPU (WebLLM)
  // ==========================================
  private async getWebGpuEngine(): Promise<any> {
    if (!this.isBrowser) {
      throw new Error('WebGPU in-browser AI requires a browser environment.');
    }
    if (!this.isWebGpuSupported()) {
      throw new Error('WebGPU is not supported or enabled on this browser. Try Chrome/Edge with hardware acceleration, or switch to Gemini/OpenAI/Ollama.');
    }

    const model = this.sanitizeWebGpuModel(this.config().webgpuModel);
    if (this.mlcEngine && this.currentEngineModel === model) {
      return this.mlcEngine;
    }

    this.progress.set({
      status: 'loading-model',
      progressPercentage: 5,
      progressText: `Initializing WebGPU engine for ${model}...`,
    });

    const webllm = await import('@mlc-ai/web-llm');
    const appConfig = {
      ...webllm.prebuiltAppConfig,
      cacheBackend: 'indexeddb' as const,
    };

    const initProgressCallback = (report: any) => {
      const percentage = Math.round((report.progress || 0) * 100);
      this.progress.set({
        status: 'loading-model',
        progressPercentage: Math.max(5, percentage),
        progressText: report.text || `Loading model weights (${percentage}%)...`,
      });
    };

    try {
      const engine = await webllm.CreateMLCEngine(model, {
        appConfig,
        initProgressCallback,
        logLevel: 'WARN',
      });

      this.mlcEngine = engine;
      this.currentEngineModel = model;
      return engine;
    } catch (err: any) {
      // Auto-clear partial/corrupted cache so subsequent attempts don't hit locked cache
      try {
        await webllm.deleteModelAllInfoInCache(model, appConfig);
      } catch {
        // Ignored
      }
      this.mlcEngine = null;
      this.currentEngineModel = '';

      const rawMsg = err?.message || String(err);
      if (rawMsg.includes('Cache') || rawMsg.includes('network') || rawMsg.includes('ERR_FAILED')) {
        throw new Error(
          `WebLLM Download Interrupted: Browser storage encountered a network/quota error. ` +
          `Partial cache has been cleared automatically. Please ensure a stable network, disable ad-blockers for localhost, or try 'Qwen 2.5 0.5B' in Settings.`
        );
      }
      throw err;
    }
  }

  private async generateWebGpu(
    prompt: string,
    onChunk: (chunk: string, fullText: string) => void,
  ): Promise<string> {
    const engine = await this.getWebGpuEngine();
    const cfg = this.config();

    this.progress.set({
      status: 'generating',
      progressPercentage: 100,
      progressText: 'Generating with local WebGPU (0% data leaves machine)...',
    });

    const messages = [
      { role: 'system', content: cfg.systemPrompt },
      { role: 'user', content: prompt },
    ];

    const chunks = await engine.chat.completions.create({
      messages,
      temperature: cfg.temperature,
      stream: true,
    });

    let fullResponse = '';
    for await (const chunk of chunks) {
      if (this.abortController?.signal.aborted) break;
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        onChunk(content, fullResponse);
      }
    }

    return fullResponse;
  }

  // ==========================================
  // Google Gemini API
  // ==========================================
  private async generateGemini(
    prompt: string,
    onChunk: (chunk: string, fullText: string) => void,
  ): Promise<string> {
    const cfg = this.config();
    const apiKey = cfg.geminiApiKey.trim();
    if (!apiKey) {
      throw new Error('Gemini API key is required. Please enter your key in AI Settings.');
    }

    const model = cfg.geminiModel || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${cfg.systemPrompt}\n\n${prompt}` }],
        },
      ],
      generationConfig: {
        temperature: cfg.temperature,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      const errMsg = errorJson?.error?.message || `Gemini API returned status ${response.status}`;
      throw new Error(errMsg);
    }

    let fullResponse = '';
    const reader = response.body?.getReader();
    if (!reader) throw new Error('ReadableStream not available');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.substring(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const candidates = parsed.candidates || [];
            const textPart = candidates[0]?.content?.parts?.[0]?.text || '';
            if (textPart) {
              fullResponse += textPart;
              onChunk(textPart, fullResponse);
            }
          } catch {
            // Buffer chunk
          }
        }
      }
    }

    return fullResponse;
  }

  // ==========================================
  // OpenAI & Compatible APIs (Groq, DeepSeek, OpenRouter)
  // ==========================================
  private async generateOpenAi(
    prompt: string,
    onChunk: (chunk: string, fullText: string) => void,
  ): Promise<string> {
    const cfg = this.config();
    const apiKey = cfg.openaiApiKey.trim();
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please configure your key in AI Settings.');
    }

    let baseUrl = (cfg.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const url = `${baseUrl}/chat/completions`;

    const body = {
      model: cfg.openaiModel || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: cfg.systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: cfg.temperature,
      stream: true,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      const errMsg = errJson?.error?.message || `OpenAI API returned status ${response.status}`;
      throw new Error(errMsg);
    }

    let fullResponse = '';
    const reader = response.body?.getReader();
    if (!reader) throw new Error('ReadableStream not available');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.substring(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullResponse += delta;
              onChunk(delta, fullResponse);
            }
          } catch {
            // Wait for full chunk
          }
        }
      }
    }

    return fullResponse;
  }

  // ==========================================
  // Local Ollama Endpoint (100% On-Device / Local Network)
  // ==========================================
  private async generateOllama(
    prompt: string,
    onChunk: (chunk: string, fullText: string) => void,
  ): Promise<string> {
    const cfg = this.config();
    let endpoint = (cfg.ollamaEndpoint || 'http://localhost:11434').replace(/\/+$/, '');
    const url = `${endpoint}/api/generate`;

    const body = {
      model: cfg.ollamaModel || 'llama3.2',
      prompt: `${cfg.systemPrompt}\n\n${prompt}`,
      system: cfg.systemPrompt,
      stream: true,
      options: {
        temperature: cfg.temperature,
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: this.abortController?.signal,
      });
    } catch (netErr: any) {
      throw new Error(
        `Could not connect to Ollama at ${endpoint}. Ensure Ollama is running and CORS is enabled: 'OLLAMA_ORIGINS="*" ollama serve'.`
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama returned status ${response.status}: ${text}`);
    }

    let fullResponse = '';
    const reader = response.body?.getReader();
    if (!reader) throw new Error('ReadableStream not available');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          const responseText = parsed.response || '';
          if (responseText) {
            fullResponse += responseText;
            onChunk(responseText, fullResponse);
          }
        } catch {
          // Incomplete json
        }
      }
    }

    return fullResponse;
  }
}
