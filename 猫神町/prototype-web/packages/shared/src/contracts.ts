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
  locations: z.array(LocationSchema).length(8),
  player: PlayerProfileSchema,
  npcs: z.array(NpcSchema).length(7),
  dailyEvents: z.array(DailyEventSchema).length(7),
  concepts: z.array(ConceptSchema).min(1),
  items: z.array(ItemSchema).min(1).max(30),
  ruleSlots: z.array(RuleSlotSchema).length(2),
  initialState: DemoInitialStateSchema
});
export type DemoBootstrap = z.infer<typeof DemoBootstrapSchema>;

export const DialogueOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  playerLine: z.string().min(1).max(120).optional(),
  actionId: z.string().nullable().optional(),
  anchor: z.string().optional(),
  angle: z.string().optional(),
  intent: z.string().min(1)
});
export type DialogueOption = z.infer<typeof DialogueOptionSchema>;

export const HeartKindSchema = z.enum(["fear", "sympathy", "affection", "sadness", "anger", "joy", "curiosity", "doubt", "contempt"]);
export type HeartKind = z.infer<typeof HeartKindSchema>;
export const HeartCardSchema = z.object({
  sourceType: z.enum(["npc", "test"]).optional(),
  id: z.string().min(1), kind: HeartKindSchema, sourceNpcId: z.string().min(1),
  sourceEventId: z.string().min(1), sourceText: z.string().min(1),
  day: z.number().int().min(1).max(7), locationId: z.string().nullable()
});
export const HeartActionRequestSchema = z.object({
  revision: z.number().int().nonnegative(), cardId: z.string().min(1).nullable(),
  previewId: z.string().min(1).optional()
});
export const HeartPreviewSchema = z.object({
  id: z.string().min(1), cardId: z.string().min(1), revision: z.number().int().nonnegative(),
  line: z.string().min(1).max(240), stageDirection: z.string().max(240),
  provider: z.enum(["mock", "deepseek", "mock_fallback"])
});
export type HeartPreview = z.infer<typeof HeartPreviewSchema>;
export const HeartOptionsSchema = z.object({
  revision: z.number().int().nonnegative(), pending: z.number().int().nonnegative(), complete: z.boolean(),
  options: z.array(HeartPreviewSchema.extend({ cardId: z.string().min(1).nullable() })).max(10)
});
export type HeartOptions = z.infer<typeof HeartOptionsSchema>;


// A deliberately public projection. No GameState, private role sheet or future beats.
export const HeartDirectorInputSchema = z.object({
  nodeId: z.string(), revision: z.number().int().nonnegative(),
  npc: z.object({ id: z.string(), name: z.string(), occupation: z.string(), publicDescription: z.string() }),
  location: z.string(), day: z.number().int(), minute: z.number().int(),
  quote: z.string(),
  played: z.array(z.object({ eventId: z.string(), speaker: z.string(), text: z.string() })),
  knownMaterials: z.array(z.object({ name: z.string(), text: z.string() })),
  held: z.array(z.object({ kind: HeartKindSchema, count: z.number().int().positive() })),
  recentChoices: z.array(z.object({ npcName: z.string(), text: z.string() })),
  actions: z.array(z.object({ id: z.string(), label: z.string() }))
});
export type HeartDirectorInput = z.infer<typeof HeartDirectorInputSchema>;
export const HeartRecommendationSchema = z.object({
  kind: HeartKindSchema, direction: z.enum(["support", "explore", "challenge"]),
  angle: z.string().trim().min(1).max(50), reason: z.string().trim().min(1).max(160),
  anchorEventId: z.string(), actionId: z.string().nullable()
});
export type HeartRecommendation = z.infer<typeof HeartRecommendationSchema>;
export const HeartDirectorResultSchema = z.object({
  nodeId: z.string(), revision: z.number().int().nonnegative(),
  status: z.enum(["ai", "offline", "unavailable"]), promptVersion: z.string(),
  recommendations: z.array(HeartRecommendationSchema).max(3), message: z.string()
});
export type HeartDirectorResult = z.infer<typeof HeartDirectorResultSchema>;
export const HeartObservationSchema = z.object({
  nodeId: z.string(), npcName: z.string(), input: HeartDirectorInputSchema.nullable(),
  director: HeartDirectorResultSchema.nullable(),
  attempts: z.array(z.object({
    cardId: z.string(), kind: HeartKindSchema, line: z.string().nullable(),
    status: z.enum(["candidate", "validated", "rejected", "expired", "waiting_playback", "applied", "continued"]),
    detail: z.string()
  })),
  selected: z.string().nullable(), actualEvents: z.array(z.object({ id: z.string(), text: z.string() }))
});
export type HeartObservation = z.infer<typeof HeartObservationSchema>;

export const DialogueContinuationSchema = z.object({
  speakerId: z.string().min(1).optional(),
  line: z.string().min(1).max(120),
  stageDirection: z.string().max(240).optional(),
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

export const ActionPlanProposalSchema = z.object({
  type: z.literal("meet"), targetNpcId: z.literal("player"), locationId: z.string().min(1),
  arriveAt: z.number().int().nonnegative(), waitUntil: z.number().int().nonnegative(),
  reason: z.string().min(1).max(160), quote: z.string().min(1).max(120),
  beatIndex: z.number().int().min(0).max(11)
});
export type ActionPlanProposal = z.infer<typeof ActionPlanProposalSchema>;
export const NpcActionPlanSchema = ActionPlanProposalSchema.omit({ beatIndex: true }).extend({
  id: z.string().min(1), sourceEventId: z.string().min(1),
  status: z.enum(["planned", "waiting", "completed", "expired", "cancelled"])
});
export type NpcActionPlan = z.infer<typeof NpcActionPlanSchema>;

export const HeartConsequenceSchema = z.object({
  type: z.enum(["material", "sorting_offer", "sorting_cancel", "meeting", "pause", "case_action"]),
  actionId: z.string().min(1).nullable().default(null),
  beatIndex: z.number().int().min(0).max(11), quote: z.string().trim().min(1).max(120)
});
export type HeartConsequence = z.infer<typeof HeartConsequenceSchema>;

export const RuleReactionSchema = z.object({
  ruleId: z.string().min(1).max(160), beatIndex: z.number().int().min(0).max(11),
  quote: z.string().trim().min(1).max(240), stance: z.string().trim().min(2).max(160),
  demand: z.string().trim().min(2).max(160)
});
export type RuleReaction = z.infer<typeof RuleReactionSchema>;

export const DialogueResultSchema = z.object({
  heart: z.object({
    canContinue: z.boolean(),
    choicePoint: z.object({ quote: z.string().min(1).max(120), reason: z.string().min(1).max(160) }).nullable().default(null),
    actionPlan: ActionPlanProposalSchema.nullable().default(null),
    consequence: HeartConsequenceSchema.nullable().default(null),
    spendEventId: z.string().nullable().default(null),
    consequenceApplied: z.boolean().default(false),
    pickups: z.array(z.object({ beatIndex: z.number().int().min(0).max(11), kind: HeartKindSchema, quote: z.string().min(1).max(180) })).max(1)
  }).optional(),
  speakerId: z.string().min(1),
  line: z.string().min(1).max(240),
  stageDirection: z.string().max(240).optional(),
  emotion: z.string().min(1),
  continuations: z.array(DialogueContinuationSchema).max(11).default([]),
  options: z.array(DialogueOptionSchema).max(3),
  debug: z.object({
    provider: z.enum(["mock", "deepseek", "mock_fallback"]),
    decision: z.string().min(1),
    ruleReactions: z.array(RuleReactionSchema).max(2).optional(),
    usedFacts: z.array(z.string()),
    // Facts explicitly spoken to the player in this generated segment. Unlike
    // usedFacts, private facts used only to shape an NPC's lie or hesitation do
    // not belong here.
    disclosedFacts: z.array(z.string()).default([]),
    // Heart dialogue can disclose facts before the final beat. These anchors let
    // the player knowledge ledger advance only when that spoken beat is shown.
    disclosures: z.array(z.object({ factId: z.string().min(1), beatIndex: z.number().int().min(0).max(11) })).max(12).default([]),
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
  mode: z.enum(["talk", "gift", "ending", "plan", "review", "heart_director", "archive"]),
  provider: z.enum(["deepseek", "mock_fallback"]),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  latencyMs: z.number().int().nonnegative(),
  attemptCount: z.number().int().positive(),
  success: z.boolean(),
  usedFacts: z.array(z.string()),
  errorCode: z.string().nullable(),
  detail: z.string().optional(),
  repairedFields: z.array(z.string().min(1).max(80)).max(48).optional()
});
export type AiLogEntry = z.infer<typeof AiLogEntrySchema>;

export const GamePhaseSchema = z.enum(["action", "location", "encounter", "incident", "night", "ending"]);
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
  sortingHelp: z.enum(["available", "offered", "completed", "cancelled"]).default("available"),
  unavailableUntil: z.number().int().nonnegative().default(0),
  actionPlan: NpcActionPlanSchema.nullable().default(null),
  lifeState: z.enum(["alive", "injured", "dead"]).default("alive"),
  knownFactIds: z.array(z.string()).default([]),
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
  npcOutcomes: z.array(EndingNpcOutcomeSchema).length(7),
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
  minute: z.number().int().default(0),
  audience: z.array(z.string()).default(["player"]),
  id: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  day: z.number().int().min(1).max(7),
  period: TimePeriodSchema,
  type: z.enum([
    "game_started",
    "location_discovered",
    "evidence_read",
    "information_delivered",
    "incident",
    "travel",
    "encounter_started",
    "location_left",
    "interaction_mode_selected",
    "dialogue_choice",
    "dialogue_continued",
    "dialogue_generated",
    "narration_generated",
    "heart_gathered",
    "heart_spent",
    "heart_consequence",
    "heart_activity",
    "heart_test_pack",
    "npc_action",
    "action_plan_updated",
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

export const IncidentSchema = z.object({
  id: z.literal("evt_chiyo_retracts_statement"),
  stage: z.enum(["scheduled", "contact", "threat", "attack", "resolved"]),
  intent: z.enum(["approach", "threaten", "attack", "withdraw"]),
  nextAt: z.number().int(),
  resolvedText: z.string().default(""),
  interruptedUntil: z.number().int().nullable().default(null)
});
export const EvidenceEntrySchema = z.object({
  id: z.string(), name: z.string(), text: z.string(), source: z.string(), day: z.number().int()
});
export const ArchiveClaimSchema = z.object({
  id: z.string().min(1), text: z.string().min(1).max(360),
  status: z.enum(["reported", "observed", "documented", "confirmed", "disputed"]),
  sourceEventIds: z.array(z.string().min(1)).min(1).max(12),
  learnedDay: z.number().int().min(1).max(7), learnedMinute: z.number().int().min(0).max(1440)
});
export const CharacterDossierSchema = z.object({
  id: z.string().min(1), name: z.string().min(1).max(40), identity: z.string().min(1).max(120),
  summary: z.string().min(1).max(360), unlockedAtEventId: z.string().min(1),
  claims: z.array(ArchiveClaimSchema).max(80).default([]), relatedEventIds: z.array(z.string().min(1)).max(40).default([])
});
export const EventDossierSchema = z.object({
  id: z.string().min(1), title: z.string().min(1).max(60), summary: z.string().min(1).max(480),
  status: z.enum(["reported", "investigating", "confirmed", "resolved", "disputed"]),
  unlockedAtEventId: z.string().min(1), participantIds: z.array(z.string().min(1)).max(30).default([]),
  claims: z.array(ArchiveClaimSchema).max(100).default([])
});
export const InvestigationArchiveSchema = z.object({
  cursorSequence: z.number().int().min(-1).default(-1),
  status: z.enum(["idle", "ai", "unavailable"]).default("idle"),
  promptVersion: z.string().default(""), pending: z.boolean().default(false),
  characters: z.array(CharacterDossierSchema).max(100).default([]),
  events: z.array(EventDossierSchema).max(100).default([])
});
export type InvestigationArchive = z.infer<typeof InvestigationArchiveSchema>;
export const GameStateSchema = z.object({
  // Additive v3 extension: old saves start empty; no retrospective rewards or reset.
  heartCards: z.array(HeartCardSchema).default([]),
  heartSession: z.object({ id: z.string().min(1), claimedKinds: z.array(HeartKindSchema).max(9) }).nullable().default(null),
  saveVersion: z.literal(3),
  chapterId: z.literal("sunset-case-v1"),
  discoveredLocationIds: z.array(z.string()),
  evidenceJournal: z.array(EvidenceEntrySchema).default([]),
  // Use a factory so every newly parsed/old save gets fresh archive arrays.
  // Mutating one in-memory archive must never leak into another GameState.
  investigationArchive: InvestigationArchiveSchema.default(() => ({ cursorSequence: -1, status: "idle" as const, promptVersion: "", pending: false, characters: [], events: [] })),
  // Persistent player-facing knowledge. Character canon and NPC private
  // knowledge must never be treated as facts the player has already learned.
  playerKnownFactIds: z.array(z.string()).default([]),
  dialogueBeatIndex: z.number().int().min(0).default(0),
  // null = spoken line. Existing saves have already shown the stage direction: do not replay it.
  dialogueNarrationIndex: z.number().int().nonnegative().nullable().default(null),
  incident: IncidentSchema.nullable().default(null),
  pendingNpcMove: z.object({ npcId: z.string(), locationId: z.string(), arriveAt: z.number().int() }).nullable().default(null),
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
  mode: InteractionModeSchema,
  revision: z.number().int().nonnegative().optional()
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
