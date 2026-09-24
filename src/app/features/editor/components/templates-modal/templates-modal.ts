import { Component, output, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MdIcon, STARTER_TEMPLATES, DocumentTemplate } from 'md-core';

@Component({
  selector: 'app-templates-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MdIcon],
  templateUrl: './templates-modal.html',
  styleUrl: './templates-modal.css',
})
export class TemplatesModal {
  readonly close = output<void>();
  readonly selectTemplate = output<DocumentTemplate>();

  protected readonly templates = STARTER_TEMPLATES;
  protected readonly selectedCategory = signal<string>('All');
  protected readonly searchQuery = signal<string>('');

  protected readonly categories = ['All', 'Engineering', 'Product', 'Science & Math'];

  protected readonly filteredTemplates = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().trim().toLowerCase();

    return this.templates.filter((tpl) => {
      const matchesCategory = cat === 'All' || tpl.category === cat;
      const matchesQuery =
        !query ||
        tpl.title.toLowerCase().includes(query) ||
        tpl.description.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  });

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  applyTemplate(template: DocumentTemplate): void {
    this.selectTemplate.emit(template);
  }
}
