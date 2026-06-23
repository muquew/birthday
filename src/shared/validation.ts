import { z } from "zod";
import { Lunar, LunarYear } from "lunar-javascript";
import { daysInGregorianMonth } from "./date.js";
import { DEFAULT_BIRTHDAY_GREETING_TEMPLATES } from "./settings.js";

const optionalTrimmed = z
  .string()
  .transform((value) => value.trim())
  .optional()
  .transform((value) => (value ? value : undefined));

export const birthdayInputSchema = z
  .object({
    name: z.string().trim().min(1, "姓名不能为空").max(80, "姓名过长"),
    calendarType: z.enum(["gregorian", "lunar"]),
    year: z
      .number()
      .int()
      .min(1)
      .max(9999)
      .optional(),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    isLeapMonth: z.boolean().optional().default(false),
    leapMonthPolicy: z
      .enum(["onlyLeapMonth", "normalMonthIfNoLeap"])
      .optional(),
    displayAge: z.boolean().optional().default(false),
    group: optionalTrimmed,
    tags: z.array(z.string().trim().min(1).max(32)).optional().default([]),
    note: optionalTrimmed,
    visible: z.boolean().optional().default(true)
  })
  .superRefine((value, ctx) => {
    if (value.calendarType === "gregorian") {
      const validationYear = value.year ?? 2024;
      const maxDay = daysInGregorianMonth(validationYear, value.month);
      if (value.day > maxDay) {
        ctx.addIssue({
          code: "custom",
          path: ["day"],
          message: "公历日期不存在"
        });
      }
      if (value.isLeapMonth) {
        ctx.addIssue({
          code: "custom",
          path: ["isLeapMonth"],
          message: "公历生日不能设置闰月"
        });
      }
      return;
    }

    if (value.isLeapMonth && !value.leapMonthPolicy) {
      ctx.addIssue({
        code: "custom",
        path: ["leapMonthPolicy"],
        message: "闰月生日需要选择处理规则"
      });
    }

    if (!value.isLeapMonth && value.leapMonthPolicy) {
      ctx.addIssue({
        code: "custom",
        path: ["leapMonthPolicy"],
        message: "非闰月生日不需要闰月规则"
      });
    }

    if (value.calendarType === "lunar" && value.day > 30) {
      ctx.addIssue({
        code: "custom",
        path: ["day"],
        message: "农历日期不能超过三十"
      });
    }

    if (value.year && value.day <= 30) {
      if (value.isLeapMonth && lunarLeapMonth(value.year) !== value.month) {
        ctx.addIssue({
          code: "custom",
          path: ["isLeapMonth"],
          message: "该年份没有对应农历闰月"
        });
        return;
      }

      try {
        Lunar.fromYmd(value.year, value.isLeapMonth ? -value.month : value.month, value.day);
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["day"],
          message: "该农历日期在所选年份不存在"
        });
      }
    }
  });

export const birthdayUpdateSchema = birthdayInputSchema;

const batchIdsSchema = z.array(z.string().trim().min(1)).min(1).max(500);
const batchTagsSchema = z
  .array(z.string().trim().min(1).max(32))
  .min(1, "标签不能为空")
  .max(50, "一次最多处理 50 个标签")
  .transform((tags) => Array.from(new Set(tags)));

export const birthdayBatchSchema = z.discriminatedUnion("action", [
  z.object({
    ids: batchIdsSchema,
    action: z.literal("show")
  }),
  z.object({
    ids: batchIdsSchema,
    action: z.literal("hide")
  }),
  z.object({
    ids: batchIdsSchema,
    action: z.literal("delete")
  }),
  z.object({
    ids: batchIdsSchema,
    action: z.literal("setGroup"),
    group: z.string().trim().min(1, "分组不能为空").max(80, "分组过长")
  }),
  z.object({
    ids: batchIdsSchema,
    action: z.literal("clearGroup")
  }),
  z.object({
    ids: batchIdsSchema,
    action: z.literal("addTags"),
    tags: batchTagsSchema
  }),
  z.object({
    ids: batchIdsSchema,
    action: z.literal("removeTags"),
    tags: batchTagsSchema
  }),
  z.object({
    ids: batchIdsSchema,
    action: z.literal("clearTags")
  })
]);

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
});

export const siteSettingsSchema = z.object({
  siteName: z.string().trim().min(1, "站点名称不能为空").max(40, "站点名称过长"),
  correctionContact: z
    .string()
    .trim()
    .max(160, "纠错说明过长")
    .default("如发现姓名、日期或农历规则有误，请联系管理员修正。"),
  defaultUpcomingDays: z.number().int().min(1).max(366),
  birthdayGreetingTemplates: z
    .array(z.string().trim().min(1, "祝福模板不能为空").max(180, "祝福模板过长"))
    .min(1, "至少保留一条祝福模板")
    .max(30, "祝福模板最多 30 条")
    .default([...DEFAULT_BIRTHDAY_GREETING_TEMPLATES])
});

export type BirthdayInputParsed = z.infer<typeof birthdayInputSchema>;

function lunarLeapMonth(year: number): number {
  try {
    return LunarYear.fromYear(year).getLeapMonth();
  } catch {
    return 0;
  }
}
