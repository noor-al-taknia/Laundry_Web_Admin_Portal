import {describe,it,expect} from 'vitest';
import {hotelDraftTotals} from '../shared/operations/hotel-totals';
describe('admin hotel totals',()=>{it('keeps an empty draft at zero',()=>{expect(hotelDraftTotals([]).totalAmount).toBe(0);});});

