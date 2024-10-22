import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CustomTooltipComponent } from '../../../bgv-custom-components/src/lib/components/custom-tooltip/custom-tooltip.component';
import { CustomTooltipDirective } from '../../../bgv-custom-components/src/lib/components/custom-tooltip/custom-tooltip.directive';
import { CustomTooltipModule } from '../../../bgv-custom-components/src/lib/components/custom-tooltip/custom-tooltip.module';

// import {
//   CustomTooltipComponent,
//   CustomTooltipDirective
// } from 'bgv-custom-components';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CustomTooltipModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Tryout-Application';
}
