import {
  Component,
  output,
  inject,
  viewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  signal,
  computed,
  HostListener,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentStore, MarkdownDocument, MdIcon } from 'md-core';

interface GraphNode {
  id: string;
  title: string;
  folder?: string;
  radius: number;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isHovered?: boolean;
  connections: number;
}

interface GraphLink {
  sourceId: string;
  targetId: string;
  source: GraphNode;
  target: GraphNode;
}

const FOLDER_COLORS = [
  '#6366f1', // Indigo
  '#38bdf8', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
  '#f97316', // Orange
];

@Component({
  selector: 'app-knowledge-graph',
  standalone: true,
  imports: [FormsModule, MdIcon],
  templateUrl: './knowledge-graph.html',
  styleUrl: './knowledge-graph.css',
})
export class KnowledgeGraph implements AfterViewInit, OnDestroy {
  private readonly store = inject(DocumentStore);

  readonly close = output<void>();
  readonly selectDoc = output<string>();

  protected readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('graphCanvas');
  protected readonly searchQuery = signal<string>('');

  private nodes: GraphNode[] = [];
  private links: GraphLink[] = [];
  private animationFrameId: number | null = null;
  private isRunning = true;

  // Viewport transforms (Pan & Zoom)
  private panX = 0;
  private panY = 0;
  private zoom = 1;
  private isPanning = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Dragging node
  private draggedNode: GraphNode | null = null;
  protected hoveredNode = signal<GraphNode | null>(null);

  protected readonly totalNodes = computed(() => this.nodes.length);
  protected readonly totalLinks = computed(() => this.links.length);

  ngAfterViewInit(): void {
    this.buildGraph();
    this.startSimulation();
  }

  ngOnDestroy(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private buildGraph(): void {
    const docs = this.store.documents();
    const folderColorMap = new Map<string, string>();
    let colorIdx = 0;

    for (const f of this.store.folders()) {
      folderColorMap.set(f.toLowerCase(), FOLDER_COLORS[colorIdx % FOLDER_COLORS.length]);
      colorIdx++;
    }

    // 1. Create nodes
    const nodeMap = new Map<string, GraphNode>();
    const width = window.innerWidth * 0.85;
    const height = window.innerHeight * 0.8;

    this.nodes = docs.map((doc, idx) => {
      const folderKey = doc.folder?.toLowerCase();
      const color = folderKey && folderColorMap.has(folderKey)
        ? folderColorMap.get(folderKey)!
        : '#818cf8';

      // Angle distribution for initial placement
      const angle = (idx / Math.max(1, docs.length)) * 2 * Math.PI;
      const dist = 120 + Math.random() * 200;

      const node: GraphNode = {
        id: doc.id,
        title: doc.title,
        folder: doc.folder,
        radius: Math.min(22, Math.max(9, Math.sqrt(doc.content.length / 80) + 7)),
        color,
        x: width / 2 + Math.cos(angle) * dist,
        y: height / 2 + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        connections: 0,
      };

      nodeMap.set(doc.id, node);
      return node;
    });

    // 2. Discover links via Wikilinks and internal file references
    this.links = [];
    const linkSet = new Set<string>();

    for (const doc of docs) {
      const sourceNode = nodeMap.get(doc.id);
      if (!sourceNode) continue;

      // Scan [[Wikilinks]]
      const wikilinkMatches = doc.content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
      for (const m of wikilinkMatches) {
        const targetTitle = m[1].trim();
        const targetDoc = this.store.findByPathOrTitle(targetTitle);
        if (targetDoc && targetDoc.id !== doc.id) {
          const targetNode = nodeMap.get(targetDoc.id);
          if (targetNode) {
            const key = [doc.id, targetDoc.id].sort().join('--');
            if (!linkSet.has(key)) {
              linkSet.add(key);
              this.links.push({
                sourceId: doc.id,
                targetId: targetDoc.id,
                source: sourceNode,
                target: targetNode,
              });
              sourceNode.connections++;
              targetNode.connections++;
            }
          }
        }
      }

      // Link notes sharing exact folder if fewer links exist
      if (doc.folder) {
        const peers = docs.filter((d) => d.id !== doc.id && d.folder === doc.folder);
        if (peers.length > 0 && peers.length < 5) {
          const peer = peers[0];
          const key = [doc.id, peer.id].sort().join('--');
          const targetNode = nodeMap.get(peer.id);
          if (targetNode && !linkSet.has(key)) {
            linkSet.add(key);
            this.links.push({
              sourceId: doc.id,
              targetId: peer.id,
              source: sourceNode,
              target: targetNode,
            });
            sourceNode.connections++;
            targetNode.connections++;
          }
        }
      }
    }
  }

  private startSimulation(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    this.resizeCanvas();

    const loop = () => {
      if (!this.isRunning) return;
      this.updatePhysics();
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  @HostListener('window:resize')
  resizeCanvas(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    canvas.width = parent.clientWidth * window.devicePixelRatio;
    canvas.height = parent.clientHeight * window.devicePixelRatio;
  }

  private updatePhysics(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    const centerX = width / 2;
    const centerY = height / 2;

    const kRepel = 1200;
    const kSpring = 0.035;
    const damping = 0.88;
    const centerGravity = 0.015;

    // 1. Repulsion between all nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy + 100;
        const dist = Math.sqrt(distSq);

        const force = kRepel / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (a !== this.draggedNode) {
          a.vx -= fx;
          a.vy -= fy;
        }
        if (b !== this.draggedNode) {
          b.vx += fx;
          b.vy += fy;
        }
      }

      // Center gravity
      if (a !== this.draggedNode) {
        a.vx += (centerX - a.x) * centerGravity;
        a.vy += (centerY - a.y) * centerGravity;
      }
    }

    // 2. Spring attraction along links
    for (const link of this.links) {
      const a = link.source;
      const b = link.target;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const desiredDist = 110;
      const force = (dist - desiredDist) * kSpring;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (a !== this.draggedNode) {
        a.vx += fx;
        a.vy += fy;
      }
      if (b !== this.draggedNode) {
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    // 3. Apply velocity and damping
    for (const node of this.nodes) {
      if (node === this.draggedNode) continue;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  private render(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio;
    ctx.save();
    ctx.scale(dpr, dpr);

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);

    // Apply pan & zoom
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    const query = this.searchQuery().trim().toLowerCase();
    const hovered = this.hoveredNode();

    // 1. Draw Links
    for (const link of this.links) {
      const isConnectedToHovered =
        hovered && (link.sourceId === hovered.id || link.targetId === hovered.id);

      ctx.beginPath();
      ctx.moveTo(link.source.x, link.source.y);
      ctx.lineTo(link.target.x, link.target.y);
      ctx.strokeStyle = isConnectedToHovered
        ? 'rgba(99, 102, 241, 0.85)'
        : 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = isConnectedToHovered ? 2.5 : 1.2;
      ctx.stroke();
    }

    // 2. Draw Nodes
    for (const node of this.nodes) {
      const isMatch = !query || node.title.toLowerCase().includes(query);
      const isCurrentHovered = hovered?.id === node.id;
      const isConnected =
        hovered &&
        (isCurrentHovered ||
          this.links.some(
            (l) =>
              (l.sourceId === hovered.id && l.targetId === node.id) ||
              (l.targetId === hovered.id && l.sourceId === node.id),
          ));

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);

      if (isMatch) {
        ctx.fillStyle = isCurrentHovered ? '#ffffff' : node.color;
        ctx.globalAlpha = hovered ? (isConnected ? 1 : 0.25) : 1;
      } else {
        ctx.fillStyle = '#64748b';
        ctx.globalAlpha = 0.15;
      }

      ctx.fill();

      // Outer glow on active node
      if (isCurrentHovered) {
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Node label
      if (this.zoom > 0.65 || isCurrentHovered || isMatch) {
        ctx.font = `${isCurrentHovered ? 'bold 13px' : '11px'} Inter, system-ui, sans-serif`;
        ctx.fillStyle = isCurrentHovered ? '#ffffff' : 'rgba(241, 245, 249, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(node.title, node.x, node.y + node.radius + 14);
      }
    }

    ctx.restore();
  }

  // --- Interaction Event Handlers ---

  onMouseDown(event: MouseEvent): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left - this.panX) / this.zoom;
    const mouseY = (event.clientY - rect.top - this.panY) / this.zoom;

    const hit = this.nodes.find((n) => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return dx * dx + dy * dy <= (n.radius + 5) * (n.radius + 5);
    });

    if (hit) {
      this.draggedNode = hit;
    } else {
      this.isPanning = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  }

  onMouseMove(event: MouseEvent): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left - this.panX) / this.zoom;
    const mouseY = (event.clientY - rect.top - this.panY) / this.zoom;

    if (this.draggedNode) {
      this.draggedNode.x = mouseX;
      this.draggedNode.y = mouseY;
      this.draggedNode.vx = 0;
      this.draggedNode.vy = 0;
      return;
    }

    if (this.isPanning) {
      const dx = event.clientX - this.lastMouseX;
      const dy = event.clientY - this.lastMouseY;
      this.panX += dx;
      this.panY += dy;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      return;
    }

    // Hover check
    const hit = this.nodes.find((n) => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return dx * dx + dy * dy <= (n.radius + 5) * (n.radius + 5);
    });

    this.hoveredNode.set(hit ?? null);
  }

  onMouseUp(event: MouseEvent): void {
    if (this.draggedNode) {
      this.draggedNode = null;
    }
    this.isPanning = false;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.12 : 0.88;
    this.zoom = Math.min(3.0, Math.max(0.3, this.zoom * zoomFactor));
  }

  onCanvasClick(event: MouseEvent): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left - this.panX) / this.zoom;
    const mouseY = (event.clientY - rect.top - this.panY) / this.zoom;

    const hit = this.nodes.find((n) => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return dx * dx + dy * dy <= (n.radius + 5) * (n.radius + 5);
    });

    if (hit) {
      this.store.select(hit.id);
      this.selectDoc.emit(hit.id);
      this.close.emit();
    }
  }

  resetView(): void {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
  }
}
