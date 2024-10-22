import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CustomTooltipComponent } from '../../../bgv-custom-components/src/public-api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CustomTooltipComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Tryout-Application';
}
