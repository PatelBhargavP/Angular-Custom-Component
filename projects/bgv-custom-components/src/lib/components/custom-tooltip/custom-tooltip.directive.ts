
import { DOCUMENT } from '@angular/common';
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
  Renderer2,
  inject,
  Inject
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
import { CustomTooltipComponent } from './custom-tooltip.component';
import { Directionality } from '@angular/cdk/bidi';
import { TooltipDirections, TooltipPositions } from './custom-tooltip.model';
import { Subscription, take, tap } from 'rxjs';

@Directive({
  selector: '[bgvCustomTooltip]',
  // imports: [
  //   CommonModule, 
  //   OverlayModule,
  //   PortalModule,
  //   CustomTooltipComponent
  // ],
  // standalone: true
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
   * From HTML we can pass this value as <html-element [bgvCustomTooltip]="'your tooltip message'"></html-element>
  */
  @Input(`bgvCustomTooltip`) text: string | undefined;

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
   *  @type {TooltipDirections}
   *  this indicates preffered position of the tooltip.
  */
  @Input() position: string = TooltipDirections.below;

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
  @Output() toolTipCreated = new EventEmitter<ComponentRef<CustomTooltipComponent>>();


  // private document = DOCUMENT;
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
    private cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private document: Document
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
    this.renderer.setStyle(this.tooltipElement, 'position', 'absolute');
    this.renderer.setStyle(this.tooltipElement, 'background-color', '#626262');
    this.renderer.setStyle(this.tooltipElement, 'color', 'white');
    this.renderer.setStyle(this.tooltipElement, 'border-radius', '5px');
    this.renderer.setStyle(this.tooltipElement, 'padding', '5px');
    this.renderer.setAttribute(this.tooltipElement, 'class', 'custom-text-tooltip');

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
    const existingTooltip = this.document.getElementById(id);
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
          originX: TooltipDirections.center,
          originY: TooltipPositions.bottom,
          overlayX: TooltipDirections.center,
          overlayY: TooltipPositions.top
        }]);
      this._overlayRef = this._overlay.create({ positionStrategy });
    }
    //attach the component if it has not already attached to the overlay
    if (!this.isTooltipRendered && this._overlayRef) {
      const tooltipRef: ComponentRef<CustomTooltipComponent> = this._overlayRef.attach(new ComponentPortal(CustomTooltipComponent));
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
   * The fallback position is the inverse of the origin (e.g. `TooltipPositions.below -> above`).
   */
  getOrigin(): { main: OriginConnectionPosition; fallback: OriginConnectionPosition } {
    const isLtr = !this._dir || this._dir.value === TooltipDirections.ltr;
    const position = this.position;
    let originPosition: OriginConnectionPosition;

    if (position === TooltipDirections.above || position === TooltipDirections.below) {
      originPosition = { originX: TooltipDirections.center, originY: position === TooltipDirections.above ? TooltipPositions.top : TooltipPositions.bottom };
    } else if (position === TooltipDirections.before || (position === TooltipPositions.left && isLtr) || (position === TooltipPositions.right && !isLtr)) {
      originPosition = { originX: TooltipDirections.start, originY: TooltipDirections.center };
    } else if (position === TooltipDirections.after || (position === TooltipPositions.right && isLtr) || (position === TooltipPositions.left && !isLtr)) {
      originPosition = { originX: TooltipDirections.end, originY: TooltipDirections.center };
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
        if (x.connectionPair.originY == TooltipPositions.bottom) {
          // we add space on the top of tooltip
          position.withDefaultOffsetY(this.offset);
        } else if (x.connectionPair.originY === TooltipPositions.top) {
          // we add space on the bottom of tooltip
          position.withDefaultOffsetY(-1 * this.offset);
        } else if (x.connectionPair.originX === TooltipDirections.end) {
          //  we add space on the left of tooltip
          position.withDefaultOffsetX(this.offset);
        } else if (x.connectionPair.originX === TooltipDirections.start) {
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
    if (this.position === TooltipDirections.above || this.position === TooltipDirections.below) {
      if (y === TooltipPositions.top) {
        y = TooltipPositions.bottom;
      } else if (y === TooltipPositions.bottom) {
        y = TooltipPositions.top;
      }
    } else {
      if (x === TooltipDirections.end) {
        x = TooltipDirections.start;
      } else if (x === TooltipDirections.start) {
        x = TooltipDirections.end;
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
    const isLtr = !this._dir || this._dir.value === TooltipDirections.ltr;
    const position = this.position;
    let overlayPosition: OverlayConnectionPosition;
    if (position === TooltipDirections.above || position === TooltipDirections.below) {
      overlayPosition = { overlayX: TooltipDirections.center, overlayY: position === TooltipDirections.above ? TooltipPositions.bottom : TooltipPositions.top };
    } else if (position === TooltipDirections.before || (position === TooltipPositions.left && isLtr) || (position === TooltipPositions.right && !isLtr)) {
      overlayPosition = { overlayX: TooltipDirections.end, overlayY: TooltipDirections.center };
    } else if (position === TooltipDirections.after || (position === TooltipPositions.right && isLtr) || (position === TooltipPositions.left && !isLtr)) {
      overlayPosition = { overlayX: TooltipDirections.start, overlayY: TooltipDirections.center };
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
      this.removeExistingTooltips(this.tooltipId);
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
