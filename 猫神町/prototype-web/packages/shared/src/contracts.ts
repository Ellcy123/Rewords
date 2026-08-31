import { z } from "zod";

export const RuleSlotIdSchema = z.enum(["faith", "beauty"]);
export type RuleSlotId = z.infer<typeof RuleSlotIdSchema>;

export const TimePeriodSchema = z.enum(["morning", "afternoon", "evening"]);
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
  travelCost: z.number().int().positive()
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
  initialLocationId: z.string().min(1),
  emotion: z.string().min(1),
  dialogueTone: z.array(z.string().min(1)).min(1),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});
export type Npc = z.infer<typeof NpcSchema>;

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
  actionsRemaining: z.number().int().nonnegative(),
  actionsPerDay: z.number().int().positive(),
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
  npcs: z.array(NpcSchema).length(3),
  concepts: z.array(ConceptSchema).length(6),
  items: z.array(ItemSchema).length(6),
  ruleSlots: z.array(RuleSlotSchema).length(2),
  initialState: DemoInitialStateSchema
});
export type DemoBootstrap = z.infer<typeof DemoBootstrapSchema>;

export const DialogueOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  intent: z.string().min(1)
});
export type DialogueOption = z.infer<typeof DialogueOptionSchema>;

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
  selectedOptionId: z.string().min(1).optional()
});
export type DialogueRequest = z.infer<typeof DialogueRequestSchema>;

export const DialogueResultSchema = z.object({
  speakerId: z.string().min(1),
  line: z.string().min(1),
  emotion: z.string().min(1),
  options: z.array(DialogueOptionSchema).min(2).max(3),
  debug: z.object({
    provider: z.literal("mock"),
    decision: z.string().min(1),
    usedFacts: z.array(z.string())
  })
});
export type DialogueResult = z.infer<typeof DialogueResultSchema>;

