import { NgModule } from '@angular/core';
import { CommonModule, DOCUMENT, NgComponentOutlet } from '@angular/common';
import { PortalModule } from '@angular/cdk/portal';
import { OverlayModule } from '@angular/cdk/overlay';

import { CustomTooltipComponent } from './custom-tooltip.component';
import { CustomTooltipDirective } from './custom-tooltip.directive';

@NgModule({
  declarations: [
    CustomTooltipComponent,
    CustomTooltipDirective
  ],
  exports: [
    CustomTooltipDirective
  ],
  imports: [
    CommonModule,
    NgComponentOutlet, 
    OverlayModule,
    PortalModule
  ]
})
export class CustomTooltipModule { }
