import { Component, inject } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { MdIcon } from '../../icons/icon.component';

@Component({
  selector: 'md-theme-toggle',
  imports: [MdIcon],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.css',
})
export class ThemeToggle {
  protected readonly themeService = inject(ThemeService);

  protected onToggle(): void {
    this.themeService.toggleTheme();
  }
}
