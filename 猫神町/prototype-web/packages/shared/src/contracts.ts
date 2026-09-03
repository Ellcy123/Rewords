import { z } from "zod";

export const RuleSlotIdSchema = z.enum(["faith", "beauty"]);
export type RuleSlotId = z.infer<typeof RuleSlotIdSchema>;

export const TimePeriodSchema = z.enum(["morning", "afternoon", "evening", "night"]);
export type TimePeriod = z.infer<typeof TimePeriodSchema>;

export const LocationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subtitle: z.string().min(1),
  description: z.string().min(1),
  cityAspect: z.string().min(1),
  atmosphere: z.string().min(1),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  openPeriods: z.array(TimePeriodSchema).min(1),
  travelMinutes: z.number().int().positive()
});
export type Location = z.infer<typeof LocationSchema>;

export const NpcSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  age: z.number().int().positive(),
  mbtiReference: z.string().length(4),
  occupation: z.string().min(1),
  classPosition: z.string().min(1),
  cityAspect: z.string().min(1),
  oneLine: z.string().min(1),
  privateStory: z.string().min(1),
  godView: z.string().min(1),
  godRelationship: z.string().min(1),
  ruleResponseStyle: z.string().min(1),
  persona: z.object({
    publicMask: z.string().min(1),
    coreContradiction: z.string().min(1),
    immediateGoal: z.string().min(1),
    longTermGoal: z.string().min(1),
    fear: z.string().min(1),
    defenseMechanism: z.string().min(1),
    moralLine: z.string().min(1),
    breakingPoint: z.string().min(1),
    actionBias: z.string().min(1),
    falseBelief: z.string().min(1),
    secret: z.string().min(1),
    signatureBehaviors: z.array(z.string().min(1)).min(3),
    speechRules: z.array(z.string().min(1)).min(3)
  }),
  initialLocationId: z.string().min(1),
  emotion: z.string().min(1),
  dialogueTone: z.array(z.string().min(1)).min(1),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});
export type Npc = z.infer<typeof NpcSchema>;

export const PlayerProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  reading: z.string().min(1),
  age: z.number().int().positive(),
  publicRole: z.string().min(1),
  occupation: z.string().min(1),
  publicBackground: z.string().min(1),
  fixedTraits: z.array(z.string().min(1)).length(3),
  coreDesire: z.string().min(1),
  vulnerability: z.string().min(1),
  startingMystery: z.string().min(1)
});
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

export const DailyEventSchema = z.object({
  id: z.string().min(1),
  day: z.number().int().min(1).max(7),
  title: z.string().min(1),
  summary: z.string().min(1),
  objective: z.string().min(1)
});
export type DailyEvent = z.infer<typeof DailyEventSchema>;

export const ConceptSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["entity", "action", "attribute", "idea"]),
  slotText: z.object({
    faith: z.string().min(1),
    beauty: z.string().min(1)
  })
});
export type Concept = z.infer<typeof ConceptSchema>;

export const ItemSchema = z.object({
  id: z.string().min(1),
  baseName: z.string().min(1),
  icon: z.string().min(1),
  category: z.string().min(1),
  baseUse: z.string().min(1),
  condition: z.string().min(1),
  carriedConceptId: z.string().min(1),
  initialOwnerId: z.string().min(1)
});
export type Item = z.infer<typeof ItemSchema>;

export const RuleSlotSchema = z.object({
  id: RuleSlotIdSchema,
  label: z.string().min(1),
  question: z.string().min(1),
  emptyText: z.string().min(1)
});
export type RuleSlot = z.infer<typeof RuleSlotSchema>;

export const DemoInitialStateSchema = z.object({
  day: z.number().int().min(1).max(7),
  period: TimePeriodSchema,
  dayStartMinute: z.number().int().min(0).max(1440),
  nightStartMinute: z.number().int().min(0).max(1440),
  currentMinute: z.number().int().min(0).max(1440),
  conversationDurationMinutes: z.number().int().positive(),
  inventoryItemIds: z.array(z.string()),
  activeRules: z.object({
    faith: z.string().nullable(),
    beauty: z.string().nullable()
  })
});
export type DemoInitialState = z.infer<typeof DemoInitialStateSchema>;

export const DemoBootstrapSchema = z.object({
  meta: z.object({
    title: z.string().min(1),
    version: z.string().min(1),
    phase: z.string().min(1),
    notice: z.string().min(1)
  }),
  locations: z.array(LocationSchema).length(3),
  player: PlayerProfileSchema,
  npcs: z.array(NpcSchema).length(3),
  dailyEvents: z.array(DailyEventSchema).length(7),
  concepts: z.array(ConceptSchema).length(6),
  items: z.array(ItemSchema).length(6),
  ruleSlots: z.array(RuleSlotSchema).length(2),
  initialState: DemoInitialStateSchema
});
export type DemoBootstrap = z.infer<typeof DemoBootstrapSchema>;

export const DialogueOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  playerLine: z.string().min(1).max(120).optional(),
  intent: z.string().min(1)
});
export type DialogueOption = z.infer<typeof DialogueOptionSchema>;

export const DialogueContinuationSchema = z.object({
  speakerId: z.string().min(1).optional(),
  line: z.string().min(1).max(120),
  stageDirection: z.string().max(60).optional(),
  emotion: z.string().min(1)
});
export type DialogueContinuation = z.infer<typeof DialogueContinuationSchema>;

export const ActiveRuleSummarySchema = z.object({
  faith: z.string().nullable(),
  beauty: z.string().nullable()
});

export const DialogueRequestSchema = z.object({
  npcId: z.string().min(1),
  locationId: z.string().min(1),
  day: z.number().int().min(1).max(7),
  period: TimePeriodSchema,
  activeRules: ActiveRuleSummarySchema,
  isFirstMeeting: z.boolean().optional(),
  selectedOptionId: z.string().min(1).optional()
});
export type DialogueRequest = z.infer<typeof DialogueRequestSchema>;

export const DialogueResultSchema = z.object({
  speakerId: z.string().min(1),
  line: z.string().min(1).max(240),
  stageDirection: z.string().max(60).optional(),
  emotion: z.string().min(1),
  continuations: z.array(DialogueContinuationSchema).max(4).default([]),
  options: z.array(DialogueOptionSchema).max(3),
  debug: z.object({
    provider: z.enum(["mock", "deepseek", "mock_fallback"]),
    decision: z.string().min(1),
    usedFacts: z.array(z.string()),
    promptVersion: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    latencyMs: z.number().int().nonnegative().optional(),
    attemptCount: z.number().int().positive().optional(),
    fallbackReason: z.string().min(1).optional(),
    sceneGoal: z.string().min(1).optional(),
    npcActionId: z.string().min(1).optional(),
    npcAction: z.string().min(1).optional(),
    memoryCandidate: z.string().min(1).optional(),
    reflectionCandidate: z.string().min(1).optional()
  })
});
export type DialogueResult = z.infer<typeof DialogueResultSchema>;

export const AiProviderStatusSchema = z.object({
  targetNpcId: z.string().min(1),
  configured: z.boolean(),
  provider: z.enum(["deepseek", "mock"]),
  model: z.string().min(1),
  promptVersion: z.string().min(1)
});
export type AiProviderStatus = z.infer<typeof AiProviderStatusSchema>;

export const AiPromptStructureSchema = z.object({
  npcId: z.string().min(1),
  promptVersion: z.string().min(1),
  layers: z.array(z.string().min(1)).min(1)
});
export type AiPromptStructure = z.infer<typeof AiPromptStructureSchema>;

export const AiLogEntrySchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().min(1),
  npcId: z.string().min(1),
  mode: z.enum(["talk", "gift", "ending"]),
  provider: z.enum(["deepseek", "mock_fallback"]),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  latencyMs: z.number().int().nonnegative(),
  attemptCount: z.number().int().positive(),
  success: z.boolean(),
  usedFacts: z.array(z.string()),
  errorCode: z.string().nullable()
});
export type AiLogEntry = z.infer<typeof AiLogEntrySchema>;

export const GamePhaseSchema = z.enum(["action", "location", "encounter", "night", "ending"]);
export type GamePhase = z.infer<typeof GamePhaseSchema>;

export const InteractionModeSchema = z.enum(["talk", "gift"]);
export type InteractionMode = z.infer<typeof InteractionModeSchema>;

export const ActiveRuleSchema = z.object({
  slotId: RuleSlotIdSchema,
  carrierItemId: z.string().min(1),
  conceptId: z.string().min(1),
  displayText: z.string().min(1),
  activatedDay: z.number().int().min(1).max(7)
});
export type ActiveRule = z.infer<typeof ActiveRuleSchema>;

export const NpcMemorySchema = z.object({
  id: z.string().min(1),
  npcId: z.string().min(1),
  kind: z.enum(["player_choice", "dialogue", "gift", "rule_callback", "item_change", "observation", "reflection"]),
  summary: z.string().min(1),
  interpretation: z.string().min(1),
  sourceEventId: z.string().min(1),
  createdDay: z.number().int().min(1).max(7),
  confidence: z.enum(["certain", "interpreted", "uncertain"]),
  importance: z.number().int().min(1).max(10).default(5),
  tags: z.array(z.string().min(1)).default([])
});
export type NpcMemory = z.infer<typeof NpcMemorySchema>;

export const NpcRuntimeStateSchema = z.object({
  npcId: z.string().min(1),
  currentLocationId: z.string().min(1),
  relationship: z.number().int().min(-5).max(5),
  memories: z.array(NpcMemorySchema).max(80),
  reflection: z.string().default("尚未与朝雾遥形成明确判断。"),
  openLoops: z.array(z.string().min(1)).max(12).default([])
});
export type NpcRuntimeState = z.infer<typeof NpcRuntimeStateSchema>;

export const EndingNpcOutcomeSchema = z.object({
  npcId: z.string().min(1),
  headline: z.string().min(1).max(40),
  text: z.string().min(1).max(360)
});
export type EndingNpcOutcome = z.infer<typeof EndingNpcOutcomeSchema>;

export const EndingResultSchema = z.object({
  title: z.string().min(1).max(60),
  subtitle: z.string().min(1).max(100),
  narration: z.string().min(1).max(1200),
  npcOutcomes: z.array(EndingNpcOutcomeSchema).length(3),
  closingLine: z.string().min(1).max(180),
  provider: z.enum(["deepseek", "mock_fallback"]),
  promptVersion: z.string().min(1),
  factSummary: z.object({
    gifts: z.array(z.string()),
    rules: z.array(z.string()),
    relationships: z.array(z.string()),
    storyBeats: z.array(z.string())
  }),
  usedEventIds: z.array(z.string())
});
export type EndingResult = z.infer<typeof EndingResultSchema>;

export const GameEventSchema = z.object({
  id: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  day: z.number().int().min(1).max(7),
  period: TimePeriodSchema,
  type: z.enum([
    "game_started",
    "travel",
    "encounter_started",
    "location_left",
    "interaction_mode_selected",
    "dialogue_choice",
    "dialogue_generated",
    "npc_action",
    "reflection_updated",
    "item_transfer",
    "encounter_completed",
    "rule_changed",
    "rule_callback",
    "npc_moved",
    "day_advanced",
    "daily_event",
    "story_beat",
    "wait_until_night",
    "ending_generated"
  ]),
  actorId: z.string().nullable(),
  targetId: z.string().nullable(),
  itemId: z.string().nullable(),
  locationId: z.string().nullable(),
  details: z.record(z.string(), z.string())
});
export type GameEvent = z.infer<typeof GameEventSchema>;

export const GameStateSchema = z.object({
  saveVersion: z.literal(2),
  revision: z.number().int().nonnegative(),
  day: z.number().int().min(1).max(7),
  period: TimePeriodSchema,
  phase: GamePhaseSchema,
  dayStartMinute: z.number().int().min(0).max(1440),
  nightStartMinute: z.number().int().min(0).max(1440),
  currentMinute: z.number().int().min(0).max(1440),
  conversationDurationMinutes: z.number().int().positive(),
  currentLocationId: z.string().nullable(),
  activeNpcId: z.string().nullable(),
  interactionMode: InteractionModeSchema.nullable(),
  currentDialogue: DialogueResultSchema.nullable(),
  lastPlayerChoice: z.string().nullable(),
  giftItemId: z.string().nullable(),
  itemOwners: z.record(z.string(), z.string()),
  activeRules: z.object({
    faith: ActiveRuleSchema.nullable(),
    beauty: ActiveRuleSchema.nullable()
  }),
  npcStates: z.record(z.string(), NpcRuntimeStateSchema).default({}),
  storyFlags: z.array(z.string()).default([]),
  ruleChangedThisNight: z.boolean(),
  claimedRewardIds: z.array(z.string()),
  eventLog: z.array(GameEventSchema),
  ending: EndingResultSchema.nullable().default(null)
});
export type GameState = z.infer<typeof GameStateSchema>;

export const GameActionResponseSchema = z.object({
  state: GameStateSchema,
  notice: z.string().nullable(),
  acquiredItemId: z.string().nullable()
});
export type GameActionResponse = z.infer<typeof GameActionResponseSchema>;

export const TravelRequestSchema = z.object({
  locationId: z.string().min(1)
});

export const InteractionModeRequestSchema = z.object({
  mode: InteractionModeSchema
});

export const DialogueChoiceRequestSchema = z.object({
  optionId: z.string().min(1)
});

export const GiftRequestSchema = z.object({
  itemId: z.string().min(1)
});

export const RuleChangeRequestSchema = z.object({
  slotId: RuleSlotIdSchema,
  itemId: z.string().min(1)
});
