export type NicotineType = 'Сигареты' | 'IQOS / glo' | 'Вейп / Pod' | 'Одноразки (HQD)' | 'Кальян' | 'Снюс';

export type CurrencyType = 'KZT' | 'RUB' | 'USD';

export type CoachPersona = 'cbt' | 'carr' | 'neuro' | 'stoic' | 'sos';

export interface UserProfile {
  id: string;
  name: string;
  quitAt: string; // ISO string
  nicotineType: NicotineType;
  currency: CurrencyType;
  currencySymbol: string;
  packPrice: number;
  packSize: number;
  unitsPerDay: number;
  financialGoal: number;
  financialGoalLabel: string;
  timezone: string;
}

export interface FreedomStats {
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
  totalSeconds: number;
  fractionalDays: number;
  moneySaved: number;
  dailyExpense: number;
  minutesLifeReturned: number;
  cigarettesAvoided: number;
  cleanTrackPercent: number;
  cravingsResistedCount: number;
  relapseCount: number;
}

export interface TriggerItem {
  id: string;
  label: string;
  time: string; // "HH:MM"
  timeMinutes: number;
  enabled: boolean;
  notes?: string;
}

export interface CravingRecord {
  id: string;
  intensity: number; // 1-10
  trigger: string;
  outcome: 'resisted' | 'active';
  timestamp: string;
  notes?: string;
}

export interface RelapseRecord {
  id: string;
  cigarettes: number;
  trigger: string;
  reflection: string;
  plan: string;
  timestamp: string;
}

export interface HealthMilestone {
  id: string;
  title: string;
  category: 'Сердечно-сосудистая' | 'Дыхательная' | 'Нейробиология' | 'Внешность и метаболизм' | 'Долголетие и онкозащита';
  timeframe: string;
  secondsRequired: number;
  description: string;
  benefit: string;
  cellularEffect?: string;
  whatYouFeel?: string;
  practicalTip?: string;
  scientificReference: string;
  iconType?: string;
  phaseId?: string;
}

export interface PhysiologicalIndicator {
  id: string;
  name: string;
  category: 'oxygen' | 'co_clearing' | 'nerve_regeneration' | 'lung_capacity' | 'dopamine_reset' | 'cardiovascular';
  currentValue: string;
  targetValue: string;
  progressPercent: number; // 0 - 100
  timeToCompleteSec: number;
  description: string;
  medicalInsight: string;
  icon: string;
}

export interface PhysiologicalPhase {
  id: string;
  phaseNumber: number;
  name: string;
  subtitle: string;
  durationRange: string;
  startSec: number;
  endSec: number;
  status: 'completed' | 'in-progress' | 'upcoming';
  progressPercent: number; // 0 - 100
  description: string;
  keyChanges: string[];
  indicators: PhysiologicalIndicator[];
  milestones: HealthMilestone[];
}

export interface AuditBug {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  location: string;
  description: string;
  cause: string;
  impact: string;
  buggyCode: string;
  fixedCode: string;
}

export interface ArchitectureFlaw {
  id: string;
  category: string;
  title: string;
  issue: string;
  railwayImpact: string;
  solution: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
  persona?: CoachPersona;
  source?: string;
}

export interface UnitTestItem {
  id: string;
  category: string;
  name: string;
  description: string;
  inputDescription: string;
  expectedDescription: string;
  status: 'pending' | 'passed' | 'failed';
  executionTimeMs?: number;
  actualOutput?: string;
  details?: string;
}

export interface FullAppState {
  profile: UserProfile;
  triggers: TriggerItem[];
  cravings: CravingRecord[];
  relapses: RelapseRecord[];
  chatMessages: ChatMessage[];
  updatedAt: string;
}
