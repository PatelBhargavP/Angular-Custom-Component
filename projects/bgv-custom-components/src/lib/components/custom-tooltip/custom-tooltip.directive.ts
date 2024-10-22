
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import {
  Directive,
  Input,
  TemplateRef,
  ElementRef,
  OnInit,
  ComponentRef,
  OnDestroy,
  NgZone,
  EventEmitter,
  Output,
  ChangeDetectorRef,
  Renderer2
} from '@angular/core';
import {
  ConnectedPosition,
  FlexibleConnectedPositionStrategy,
  HorizontalConnectionPos,
  OriginConnectionPosition,
  Overlay,
  OverlayConnectionPosition,
  OverlayPositionBuilder,
  OverlayRef,
  VerticalConnectionPos
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { CustomTooltipComponent } from './custom-tooltip.component.ts';
import { Directionality } from '@angular/cdk/bidi';
import { RsplDirections, RsplPositions } from './custom-tooltip.model.ts';
import { Subscription, take, tap } from 'rxjs';

@Directive({
  selector: '[bgvCustomTooltip]',
  imports: [
    CommonModule, 
    OverlayModule,
    PortalModule,
    CustomTooltipComponent
  ],
  standalone: true
})
export class CustomTooltipDirective  implements OnInit, OnDestroy {
  /**
  * This will be used to show tooltip or not
  * This can be used to show the tooltip conditionally
  */
  @Input() showToolTip: boolean = true;

  /**
   * @memberof CustomToolTipDirective
   * @type {string | undefined}
   * If this is specified then specified text will be showin in the tooltip.
   * From HTML we can pass this value as <html-element [rsplCustomToolTip]="'your tooltip message'"></html-element>
  */
  @Input(`rsplCustomToolTip`) text: string | undefined;

  /**
   * @memberof CustomToolTipDirective
   * @type {TemplateRef<any> | undefined}
   * If this is specified then specified template will be rendered in the tooltip.
  */
  @Input() contentTemplate: TemplateRef<any> | undefined;

  /**
   *  @memberof CustomToolTipDirective
   *  @type {string}
   * Controls the custom style via custom class.
  */
  @Input() customTooltipClass: string = '';

  /**
   *  @memberof CustomToolTipDirective
   *  @type {number}
   *  this indicates padding between the tooltip and source element. The quantity represents pixels.
  */
  @Input() offset: number = 5;

  /**
   *  @memberof CustomToolTipDirective
   *  @type {RsplDirections}
   *  this indicates preffered position of the tooltip.
  */
  @Input() position: string = RsplDirections.below;

  /**
   *  @memberof CustomToolTipDirective
   *  @type {number}
   *  Indicates delay in ms before the tooltip will show up.
  */
  @Input() tooltipShowDelay: number = 600;


  /**
   *  @memberof CustomToolTipDirective
   *  @type {boolean}
   *  For force change detection
  */
  @Input() forcedChangeDetection: boolean = false;

  /**
  *  @memberof CustomToolTipDirective
  *
  *  To render tooltip in ag-grid
 */
  @Output() toolTipCreated = new EventEmitter<ComponentRef<RsplToolTipComponent>>();


  private _overlayRef: OverlayRef | undefined;

  isTooltipRendered = false;

  enterSubscription?: Subscription;
  leaveSubscription?: Subscription;
  wheelSubscription?: Subscription;
  clickSubscription?: Subscription;
  tooltipInterval: any;
  private tooltipElement: HTMLElement | undefined;
  private tooltipId: string = 'normaltext-tooltip';
  constructor(private _overlay: Overlay, private renderer: Renderer2,
    protected _dir: Directionality,
    private _overlayPositionBuilder: OverlayPositionBuilder,
    private _elementRef: ElementRef,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  /**
   * Init life cycle event handler
   */
  ngOnInit() {
    if (!this.showToolTip) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.addEvents();
    });
  }
  private createTooltip(): void {
    this.removeExistingTooltips(this.tooltipId); // remove existing tooltip

    this.tooltipElement = this.renderer.createElement('span');
    this.renderer.setAttribute(this.tooltipElement, 'id', this.tooltipId);
    this.renderer.setAttribute(this.tooltipElement, 'class', 'custom-text-tooltip chip-bg br-xs p-1 color-white position-absolute d-block');

    this.renderer.appendChild(
      this.tooltipElement,
      this.renderer.createText(this.text || '')
    );
    this.renderer.setStyle(this.tooltipElement, 'top', `${this._elementRef.nativeElement.offsetTop - 30}px`);
    this.renderer.setStyle(this.tooltipElement, 'left', `${this._elementRef.nativeElement.offsetLeft}px`);
    this.renderer.setStyle(this.tooltipElement, 'zIndex', '1000');

    // append tooltip to the parent of the host element
    this.renderer.appendChild(this._elementRef.nativeElement.parentElement, this.tooltipElement);

  }
  private showTooltip(): void {
    this.positionTooltip();
    this.toolTipInsideEvents();
  }

  private positionTooltip(event?: MouseEvent): void {
    if (this.tooltipElement) {
      const hostPos = this._elementRef.nativeElement.getBoundingClientRect();
      const tooltipPos = this.tooltipElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = hostPos.bottom + 10; // Position the tooltip below the div by default
      let left = hostPos.left + (hostPos.width - tooltipPos.width) / 2;

      if (event) {
        top = event.clientY + 10; // Adjust position based on mouse event
        left = event.clientX - tooltipPos.width / 2;
      }

      // Adjust if tooltip is out of viewport
      if (top + tooltipPos.height > viewportHeight) {
        top = hostPos.top - tooltipPos.height - 10;
      }
      if (left < 0) {
        left = 10;
      } else if (left + tooltipPos.width > viewportWidth) {
        left = viewportWidth - tooltipPos.width - 10;
      }

      this.renderer.setStyle(this.tooltipElement, 'top', `${top}px`);
      this.renderer.setStyle(this.tooltipElement, 'left', `${left}px`);
    }
  }
  private removeExistingTooltips(id: string): void {
    // remove existing tooltip if any
    const existingTooltip = document.getElementById(id);
    if (existingTooltip && existingTooltip.parentNode) {
      existingTooltip.parentNode.removeChild(existingTooltip);
    }
  }
  addEvents() {
    this.zone.runOutsideAngular(() => {
      this.renderer.listen(this._elementRef.nativeElement, 'mouseenter', () => {
        if (this._elementRef.nativeElement.matches(':hover')) {
          if (this.text) {
            // if their is normal text show normal tooltip created by div elemnt
            this.createTooltip();
            this.showTooltip();
          }
          else {
            // hover property on native element indicates that mouse is still over the element
            this.show();
          }

        }
      });
    });
  }
  toolTipInsideEvents() {
    this.zone.runOutsideAngular(() => {
      this.renderer.listen(this._elementRef.nativeElement, 'mousewheel', () => {
        this.hide();
      });
    });
    this.zone.runOutsideAngular(() => {
      this.renderer.listen(this._elementRef.nativeElement, 'mouseleave', () => {
        this.hide();
      });
    });
    this.zone.runOutsideAngular(() => {
      this.renderer.listen(this._elementRef.nativeElement, 'click', () => {
        this.hide();
      });
    });
  }

  /**
   * This method will be called whenever mouse enters in the Host element
   * i.e. where this directive is applied
   * This method will show the tooltip by instantiating the McToolTipComponent and attaching to the overlay
   */
  show() {
    if (!this._overlayRef) {
      // we add this if condition to avoid multiple overlay elements being created
      const positionStrategy = this._overlayPositionBuilder
        .flexibleConnectedTo(this._elementRef)
        .withPositions([{
          originX: RsplDirections.center,
          originY: RsplPositions.bottom,
          overlayX: RsplDirections.center,
          overlayY: RsplPositions.top
        }]);
      this._overlayRef = this._overlay.create({ positionStrategy });
    }
    //attach the component if it has not already attached to the overlay
    if (!this.isTooltipRendered && this._overlayRef) {
      const tooltipRef: ComponentRef<RsplToolTipComponent> = this._overlayRef.attach(new ComponentPortal(RsplToolTipComponent));
      if (this.customTooltipClass) {
        tooltipRef.instance.customTooltipClass = this.customTooltipClass;
      }
      if (this.text) {
        tooltipRef.instance.text = this.text;
      }
      this.zone.run(() => {
        this.toolTipInsideEvents();
        tooltipRef.instance.contentTemplate = this.contentTemplate;
        this.updatePosition(this._overlayRef as OverlayRef);
        this.isTooltipRendered = true;
        this.toolTipCreated.emit(tooltipRef);
      });
    }
  }

  /** Updates the position of the current tooltip. */

  private updatePosition(overlayRef: OverlayRef) {
    const position = overlayRef.getConfig().positionStrategy as FlexibleConnectedPositionStrategy;
    const origin = this.getOrigin();
    const overlay = this.getOverlayPosition();
    this.addDefaultOffset(position);
    position.withPositions([
      this.addOffset({ ...origin.main, ...overlay.main }),
      this.addOffset({ ...origin.fallback, ...overlay.fallback }),
    ]);
  }

  /**
   * Returns the origin position and a fallback position based on the user's position preference.
   * The fallback position is the inverse of the origin (e.g. `RsplPositions.below -> above`).
   */
  getOrigin(): { main: OriginConnectionPosition; fallback: OriginConnectionPosition } {
    const isLtr = !this._dir || this._dir.value === RsplDirections.ltr;
    const position = this.position;
    let originPosition: OriginConnectionPosition;

    if (position === RsplDirections.above || position === RsplDirections.below) {
      originPosition = { originX: RsplDirections.center, originY: position === RsplDirections.above ? RsplPositions.top : RsplPositions.bottom };
    } else if (position === RsplDirections.before || (position === RsplPositions.left && isLtr) || (position === RsplPositions.right && !isLtr)) {
      originPosition = { originX: RsplDirections.start, originY: RsplDirections.center };
    } else if (position === RsplDirections.after || (position === RsplPositions.right && isLtr) || (position === RsplPositions.left && !isLtr)) {
      originPosition = { originX: RsplDirections.end, originY: RsplDirections.center };
    }

    /** based on the origing position we decide the fallback position.
     * If preffered top is above fallback will be bottom and vice versa.
     * Whereas, if preffered position is left is above fallback will be right and vice versa
     */
    const { x, y } = this.invertPosition(originPosition!.originX, originPosition!.originY);
    return {
      main: originPosition!,
      fallback: { originX: x, originY: y },
    };
  }

  addDefaultOffset(position: FlexibleConnectedPositionStrategy) {
    position.positionChanges.pipe(
      take(1),
      tap((x) => {
        if (x.connectionPair.originY == RsplPositions.bottom) {
          // we add space on the top of tooltip
          position.withDefaultOffsetY(this.offset);
        } else if (x.connectionPair.originY === RsplPositions.top) {
          // we add space on the bottom of tooltip
          position.withDefaultOffsetY(-1 * this.offset);
        } else if (x.connectionPair.originX === RsplDirections.end) {
          //  we add space on the left of tooltip
          position.withDefaultOffsetX(this.offset);
        } else if (x.connectionPair.originX === RsplDirections.start) {
          //  we add space on the left of tooltip
          position.withDefaultOffsetX(-1 * this.offset);
        }
        position.reapplyLastPosition();
        if (this.forcedChangeDetection) {
          this.cdr.detectChanges();
        }
      })).subscribe();
  }

  /** Inverts an overlay position. */
  private invertPosition(x: HorizontalConnectionPos, y: VerticalConnectionPos) {
    if (this.position === RsplDirections.above || this.position === RsplDirections.below) {
      if (y === RsplPositions.top) {
        y = RsplPositions.bottom;
      } else if (y === RsplPositions.bottom) {
        y = RsplPositions.top;
      }
    } else {
      if (x === RsplDirections.end) {
        x = RsplDirections.start;
      } else if (x === RsplDirections.start) {
        x = RsplDirections.end;
      }
    }
    return { x, y };
  }

  /** Adds the configured offset to a position. Used as a hook for child classes. */
  protected addOffset(position: ConnectedPosition): ConnectedPosition {
    return position;
  }

  /** Returns the overlay position and a fallback position based on the user's preference */
  getOverlayPosition(): { main: OverlayConnectionPosition; fallback: OverlayConnectionPosition } {
    const isLtr = !this._dir || this._dir.value === RsplDirections.ltr;
    const position = this.position;
    let overlayPosition: OverlayConnectionPosition;
    if (position === RsplDirections.above || position === RsplDirections.below) {
      overlayPosition = { overlayX: RsplDirections.center, overlayY: position === RsplDirections.above ? RsplPositions.bottom : RsplPositions.top };
    } else if (position === RsplDirections.before || (position === RsplPositions.left && isLtr) || (position === RsplPositions.right && !isLtr)) {
      overlayPosition = { overlayX: RsplDirections.end, overlayY: RsplDirections.center };
    } else if (position === RsplDirections.after || (position === RsplPositions.right && isLtr) || (position === RsplPositions.left && !isLtr)) {
      overlayPosition = { overlayX: RsplDirections.start, overlayY: RsplDirections.center };
    }
    const { x, y } = this.invertPosition(overlayPosition!.overlayX, overlayPosition!.overlayY);
    return {
      main: overlayPosition!,
      fallback: { overlayX: x, overlayY: y },
    };
  }

  /**
   * This method will be called when mouse goes out of the host element
   * i.e. where this directive is applied
   * This method will close the tooltip by detaching the overlay from the view
   */
  hide() {
    if (this.tooltipElement) {
      // hide tooltip created by div element
      this.renderer.addClass(this.tooltipElement, 'd-none');
    }
    this.wheelSubscription?.unsubscribe();
    this.leaveSubscription?.unsubscribe();
    this.clickSubscription?.unsubscribe();
    if (!this.text) {
      if (this.isTooltipRendered) {
        // close tooltip clears overlay, this triggers chage detection which is only needed if the tooltip has been rendered
        this.closeToolTip();
      }
      this.isTooltipRendered = false;
    }
  }
  /**
   * Destroy lifecycle event handler
   * This method will make sure to close the tooltip
   * It will be needed in case when app is navigating to different page
   * and user is still seeing the tooltip; In that case we do not want to hang around the
   * tooltip after the page [on which tooltip visible] is destroyed
   */
  ngOnDestroy() {
    this.enterSubscription?.unsubscribe();
    this.hide();
    this.removeExistingTooltips(this.tooltipId);
  }

  /**
   * This method will close the tooltip by detaching the component from the overlay
   */
  private closeToolTip() {
    if (this._overlayRef) {
      this.zone.run(() => {
        // since hide function is always called from outside the the zone we call detach from zone to wnsure change detection
        this._overlayRef?.detach();
      })
    }
  }

}
