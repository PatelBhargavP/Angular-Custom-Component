import { CommonModule, NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, TemplateRef } from '@angular/core';

@Component({
  selector: 'bgv-custom-tooltip',
  // standalone: true,
  // imports: [CommonModule, NgComponentOutlet],
  templateUrl: './custom-tooltip.component.html',
  styleUrl: './custom-tooltip.component.css'
})
export class CustomTooltipComponent {
  /**
   * This is simple text which is to be shown in the tooltip
   */
  @Input() text: string | undefined = 'sample input';
  /**
 * Controls the custom style via custom class.
 */
  @Input() customTooltipClass: string = '';

  /**
   * This provides finer control on the content to be visible on the tooltip
   * This template will be injected in McToolTipRenderer directive in the consumer template
   * <ng-template #template>
   *  content.....
   * </ng-template>
   */
  @Input() contentTemplate: TemplateRef<any> | undefined;

}
