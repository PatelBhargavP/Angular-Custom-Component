import { TestBed } from '@angular/core/testing';

import { BgvCustomComponentsService } from './bgv-custom-components.service';

describe('BgvCustomComponentsService', () => {
  let service: BgvCustomComponentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BgvCustomComponentsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
