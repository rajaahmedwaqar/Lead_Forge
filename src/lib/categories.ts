import {
  BedDouble, Car, Coffee, Dumbbell, Fuel, GraduationCap, Hammer, Home, Landmark, Laptop,
  Pill, PawPrint, Plane, Scale, Scissors, ShoppingBag, Smile, Sparkles, Stethoscope, Store, Truck, Utensils, Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Category { id: string; label: string; icon: LucideIcon }

/** First match wins, so more specific groups (dentist) come before general ones (doctor). */
const RULES: [RegExp, Category][] = [
  [/dent|orthodon/i, { id: 'dental', label: 'Dental', icon: Smile }],
  [/pharm|chemist|drug ?store/i, { id: 'pharmacy', label: 'Pharmacy', icon: Pill }],
  [/doctor|clinic|hospital|physician|medical|surgeon|pediatric|dermatolog|cardio|health|physio|diagnostic|\blab\b/i, { id: 'medical', label: 'Medical', icon: Stethoscope }],
  [/\bvet|\bpets?\b|animal|groom/i, { id: 'pets', label: 'Pets & vets', icon: PawPrint }],
  [/\bcars?\b|auto|vehicle|rent.?a|taxi|\bcab|limo|motor|tyre|tire|garage/i, { id: 'auto', label: 'Cars & transport', icon: Car }],
  [/truck|logistic|courier|cargo|freight|moving|shipping/i, { id: 'logistics', label: 'Logistics', icon: Truck }],
  [/petrol|gas station|fuel/i, { id: 'fuel', label: 'Fuel', icon: Fuel }],
  [/restaurant|food|pizza|burger|bbq|grill|bakery|diner|kitchen|catering|biryani/i, { id: 'food', label: 'Food & dining', icon: Utensils }],
  [/cafe|coffee|\btea\b|juice/i, { id: 'cafe', label: 'Cafes', icon: Coffee }],
  [/hotel|motel|guest ?house|hostel|resort|lodg|\binn\b/i, { id: 'hotel', label: 'Hotels & stays', icon: BedDouble }],
  [/travel|tour|airline|flight|visa|ticket/i, { id: 'travel', label: 'Travel', icon: Plane }],
  [/gym|fitness|yoga|sport|crossfit|martial/i, { id: 'fitness', label: 'Fitness', icon: Dumbbell }],
  [/salon|barber|beauty|\bspa\b|makeup|hair|nail|massage/i, { id: 'beauty', label: 'Beauty & salons', icon: Scissors }],
  [/school|college|universit|academy|tutor|coaching|institute|training|education|kindergarten|nursery/i, { id: 'education', label: 'Education', icon: GraduationCap }],
  [/lawyer|attorney|law firm|legal|advocate|notary/i, { id: 'legal', label: 'Legal', icon: Scale }],
  [/bank|insurance|account|\btax|finance|loan|audit|invest/i, { id: 'finance', label: 'Finance', icon: Landmark }],
  [/real ?estate|property|realtor|builder|construction|architect|interior|developer/i, { id: 'property', label: 'Property', icon: Home }],
  [/plumb|electric|repair|hvac|mechanic|carpent|paint|contractor|handyman|clean|pest|laundry/i, { id: 'services', label: 'Home services', icon: Wrench }],
  [/hardware|tools|furniture|factory|manufactur|steel|wood/i, { id: 'trades', label: 'Trades & industry', icon: Hammer }],
  [/shop|store|mall|boutique|cloth|fashion|shoe|jewel|gift|supermarket|grocery|\bmart\b|retail/i, { id: 'retail', label: 'Retail', icon: ShoppingBag }],
  [/software|\bit\b|tech|computer|mobile|\bweb|digital|marketing|agency|design|photograph|studio|print/i, { id: 'tech', label: 'Tech & creative', icon: Laptop }],
  [/florist|flower|wedding|event|party|decor/i, { id: 'events', label: 'Events', icon: Sparkles }],
];

const FALLBACK: Category = { id: 'business', label: 'Local business', icon: Store };

/** One category per search, chosen from what the user typed, so every result in a search shares one icon. */
export function categoryFor(keyword: string): Category {
  for (const [re, cat] of RULES) if (re.test(keyword)) return cat;
  return FALLBACK;
}
